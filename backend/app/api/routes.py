from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.models import User, Engagement, AgentSession, AgentAction, Finding, Report, PhaseLog
from app.core.auth import (
    verify_password, hash_password, create_access_token, get_current_user,
)
from app.core.orchestrator import run_hardening_assessment
from app.core.checklists import LINUX_CHECKLIST, WINDOWS_CHECKLIST

router = APIRouter(prefix="/api")

# ─── In-memory LLM settings (same pattern as NetActor) ────────────────
llm_settings = {
    "provider": "openrouter",
    "api_key": "",
    "model": "xiaomi/mimo-v2.5",
    "base_url": "https://openrouter.ai/api/v1",
}

# ─── Auth ──────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/auth/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.username, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role, "username": user.username}

class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str

@router.put("/auth/password")
async def change_password(body: PasswordChangeRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not verify_password(body.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    user.password_hash = hash_password(body.new_password)
    await db.commit()
    return {"status": "changed"}

# ─── Users ─────────────────────────────────────────────────────────────

@router.get("/users/me")
async def get_me(user: User = Depends(get_current_user)):
    return {"username": user.username, "role": user.role, "email": user.email}

@router.get("/users")
async def list_users(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    result = await db.execute(select(User))
    users = result.scalars().all()
    return [{"id": u.id, "username": u.username, "email": u.email, "role": u.role, "created_at": u.created_at.isoformat()} for u in users]

# ─── LLM Settings ─────────────────────────────────────────────────────

@router.get("/settings/llm")
async def get_llm_settings(user: User = Depends(get_current_user)):
    return {
        "provider": llm_settings["provider"],
        "model": llm_settings["model"],
        "has_api_key": bool(llm_settings["api_key"]),
        "base_url": llm_settings["base_url"],
    }

class LLMSettingsUpdate(BaseModel):
    provider: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None
    base_url: Optional[str] = None

@router.put("/settings/llm")
async def update_llm_settings(body: LLMSettingsUpdate, user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    for k, v in body.dict(exclude_none=True).items():
        llm_settings[k] = v
    return {"status": "updated"}

@router.post("/settings/llm/test")
async def test_llm_connection(user: User = Depends(get_current_user)):
    import httpx
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{llm_settings['base_url']}/chat/completions",
                headers={"Authorization": f"Bearer {llm_settings['api_key']}"},
                json={
                    "model": llm_settings["model"],
                    "messages": [{"role": "user", "content": "Reply with just OK"}],
                    "max_tokens": 10,
                },
            )
            if resp.status_code == 200:
                return {"status": "ok", "message": "Connection successful"}
            return {"status": "error", "message": f"HTTP {resp.status_code}: {resp.text[:200]}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ─── Engagements (Scans) ──────────────────────────────────────────────

class EngagementCreate(BaseModel):
    name: str
    description: str = ""
    target_scope: list  # [{"host": "1.2.3.4", "port": 22, "os_type": "auto"}]
    # SSH credentials — per-scan, never stored in DB
    ssh_username: str = ""
    ssh_password: str = ""
    ssh_port: int = 22
    ssh_key_path: str = ""
    target_os: str = "auto"

@router.post("/engagements")
async def create_engagement(body: EngagementCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    eng = Engagement(
        name=body.name,
        description=body.description,
        target_scope=body.target_scope,
        status="pending",
    )
    db.add(eng)
    await db.commit()
    return {"id": eng.id, "status": eng.status}

@router.get("/engagements")
async def list_engagements(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Engagement).order_by(Engagement.created_at.desc()))
    engagements = result.scalars().all()
    return [
        {
            "id": e.id, "name": e.name, "description": e.description,
            "status": e.status, "current_phase": e.current_phase,
            "target_scope": e.target_scope, "created_at": e.created_at.isoformat(),
            "started_at": e.started_at.isoformat() if e.started_at else None,
            "completed_at": e.completed_at.isoformat() if e.completed_at else None,
        }
        for e in engagements
    ]

@router.get("/engagements/{engagement_id}")
async def get_engagement(engagement_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    eng = await db.get(Engagement, engagement_id)
    if not eng:
        raise HTTPException(status_code=404, detail="Engagement not found")
    return {
        "id": eng.id, "name": eng.name, "description": eng.description,
        "status": eng.status, "current_phase": eng.current_phase,
        "target_scope": eng.target_scope, "created_at": eng.created_at.isoformat(),
    }

@router.delete("/engagements/{engagement_id}")
async def delete_engagement(engagement_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    eng = await db.get(Engagement, engagement_id)
    if not eng:
        raise HTTPException(status_code=404, detail="Not found")
    # Delete related records
    for model in [AgentAction, AgentSession, Finding, Report, PhaseLog]:
        result = await db.execute(select(model))
        for obj in result.scalars().all():
            if hasattr(obj, "engagement_id") and obj.engagement_id == engagement_id:
                await db.delete(obj)
            elif hasattr(obj, "session_id"):
                session = await db.get(AgentSession, obj.session_id)
                if session and session.engagement_id == engagement_id:
                    await db.delete(obj)
    await db.delete(eng)
    await db.commit()
    return {"status": "deleted"}

@router.post("/engagements/{engagement_id}/run")
async def run_engagement(
    engagement_id: str,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    eng = await db.get(Engagement, engagement_id)
    if not eng:
        raise HTTPException(status_code=404, detail="Not found")
    if eng.status not in ("pending", "failed"):
        raise HTTPException(status_code=400, detail=f"Cannot run engagement in '{eng.status}' status")

    # Get SSH credentials from the most recent request
    # These are passed via the engagement's target_scope metadata
    scope = eng.target_scope or []
    if not scope:
        raise HTTPException(status_code=400, detail="No target scope configured")

    target = scope[0] if isinstance(scope, list) else scope
    host = target.get("host", target.get("target", ""))
    if not host:
        raise HTTPException(status_code=400, detail="No target host specified")

    # SSH credentials should be in the scope
    ssh_creds = {
        "username": target.get("ssh_username", ""),
        "password": target.get("ssh_password", ""),
        "port": target.get("ssh_port", 22),
        "key_path": target.get("ssh_key_path", ""),
    }
    target_os = target.get("os_type", "auto")

    eng.status = "queued"
    await db.commit()

    # Launch in background — credentials stay in memory only
    background_tasks.add_task(
        run_hardening_assessment,
        engagement_id=engagement_id,
        target_host=host,
        credentials=ssh_creds,
        target_os=target_os,
    )

    return {"status": "started", "engagement_id": engagement_id}

# ─── Findings ─────────────────────────────────────────────────────────

@router.get("/engagements/{engagement_id}/findings")
async def get_findings(engagement_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Finding).where(Finding.engagement_id == engagement_id))
    findings = result.scalars().all()
    return [
        {
            "id": f.id, "title": f.title, "severity": f.severity,
            "category": f.category, "description": f.description,
            "target": f.target, "recommendation": f.recommendation,
            "reference": f.reference, "created_at": f.created_at.isoformat(),
        }
        for f in findings
    ]

# ─── Sessions & Actions ───────────────────────────────────────────────

@router.get("/engagements/{engagement_id}/sessions")
async def get_sessions(engagement_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AgentSession).where(AgentSession.engagement_id == engagement_id)
    )
    sessions = result.scalars().all()
    return [
        {
            "id": s.id, "agent_role": s.agent_role, "status": s.status,
            "input_data": s.input_data, "output_data": s.output_data,
            "model_used": s.model_used,
            "input_tokens": s.input_tokens, "output_tokens": s.output_tokens,
            "created_at": s.created_at.isoformat(),
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        }
        for s in sessions
    ]

@router.get("/sessions/{session_id}/actions")
async def get_actions(session_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AgentAction).where(AgentAction.session_id == session_id).order_by(AgentAction.created_at)
    )
    actions = result.scalars().all()
    return [
        {
            "id": a.id, "tool_name": a.tool_name, "tool_input": a.tool_input,
            "tool_output": a.tool_output, "action_type": a.action_type,
            "created_at": a.created_at.isoformat(),
        }
        for a in actions
    ]

# ─── Reports ──────────────────────────────────────────────────────────

@router.get("/engagements/{engagement_id}/reports")
async def get_reports(engagement_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Report).where(Report.engagement_id == engagement_id))
    reports = result.scalars().all()
    return [
        {
            "id": r.id, "content": r.content, "format": r.format,
            "created_at": r.created_at.isoformat(),
        }
        for r in reports
    ]

# ─── Phase Logs ───────────────────────────────────────────────────────

@router.get("/engagements/{engagement_id}/phases")
async def get_phases(engagement_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PhaseLog).where(PhaseLog.engagement_id == engagement_id).order_by(PhaseLog.started_at)
    )
    logs = result.scalars().all()
    return [
        {
            "id": l.id, "phase": l.phase, "status": l.status,
            "message": l.message,
            "started_at": l.started_at.isoformat() if l.started_at else None,
            "completed_at": l.completed_at.isoformat() if l.completed_at else None,
        }
        for l in logs
    ]

# ─── Tools ─────────────────────────────────────────────────────────────

@router.get("/tools")
async def list_tools(user: User = Depends(get_current_user)):
    return [
        {"name": "ssh_connect", "description": "Connect to target via SSH"},
        {"name": "detect_os", "description": "Detect remote operating system"},
        {"name": "run_check", "description": "Execute a hardening check command"},
        {"name": "load_checklist", "description": "Load OS-specific hardening checklist"},
        {"name": "get_checklists", "description": "List available checklists"},
    ]

@router.get("/tools/checklists")
async def get_checklists(user: User = Depends(get_current_user)):
    return {
        "linux": {"items": len(LINUX_CHECKLIST), "categories": list(set(c["category"] for c in LINUX_CHECKLIST))},
        "windows": {"items": len(WINDOWS_CHECKLIST), "categories": list(set(c["category"] for c in WINDOWS_CHECKLIST))},
    }

# ─── Dashboard stats ─────────────────────────────────────────────────

@router.get("/dashboard/stats")
async def dashboard_stats(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count(Engagement.id)))).scalar() or 0
    completed = (await db.execute(select(func.count(Engagement.id)).where(Engagement.status == "completed"))).scalar() or 0
    running = (await db.execute(select(func.count(Engagement.id)).where(Engagement.status.in_(["running", "queued"])))).scalar() or 0
    findings_count = (await db.execute(select(func.count(Finding.id)))).scalar() or 0
    critical = (await db.execute(select(func.count(Finding.id)).where(Finding.severity == "critical"))).scalar() or 0
    high = (await db.execute(select(func.count(Finding.id)).where(Finding.severity == "high"))).scalar() or 0
    return {
        "total_scans": total, "completed": completed, "running": running,
        "total_findings": findings_count, "critical": critical, "high": high,
    }
