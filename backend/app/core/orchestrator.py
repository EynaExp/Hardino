"""Hardino agent orchestrator.

Phases:
1. audit     — connect via SSH, detect OS, run checklist commands
2. hardening — analyze results, recommend fixes
3. verify    — re-run failed checks after remediation (optional)
4. report    — generate final hardening report
"""

import asyncio
import json
import time
import traceback
from datetime import datetime
from typing import Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.ssh_executor import SSHExecutor, SSHCredentials, evaluate_check
from app.core.checklists import get_checklist, detect_os_from_ssh_output
from app.core.models import (
    Engagement, AgentSession, AgentAction,
    Finding, Report, PhaseLog,
)
from app.core.database import async_session

import logging
logger = logging.getLogger("hardino.orchestrator")


class HardeningOrchestrator:
    def __init__(
        self,
        engagement_id: str,
        target_host: str,
        credentials: dict,
        target_os: str = "auto",
    ):
        self.engagement_id = engagement_id
        self.target_host = target_host
        self.credentials = credentials
        self.target_os = target_os
        self._start_time: Optional[datetime] = None

    async def run(self):
        """Execute the full hardening assessment pipeline."""
        self._start_time = datetime.utcnow()
        try:
            async with async_session() as db:
                engagement = await db.get(Engagement, self.engagement_id)
                if not engagement:
                    return
                engagement.status = "running"
                engagement.started_at = self._start_time
                await db.commit()

            # Phase 1: Audit
            await self._phase_audit()

            # Phase 2: Hardening analysis
            await self._phase_hardening()

            # Phase 3: Report
            await self._phase_report()

            async with async_session() as db:
                engagement = await db.get(Engagement, self.engagement_id)
                if engagement:
                    engagement.status = "completed"
                    engagement.completed_at = datetime.utcnow()
                    await db.commit()

        except Exception as e:
            logger.error(f"Orchestrator error: {e}\n{traceback.format_exc()}")
            async with async_session() as db:
                engagement = await db.get(Engagement, self.engagement_id)
                if engagement:
                    engagement.status = "failed"
                    await db.commit()

    async def _log_phase(self, phase: str, status: str, message: str = ""):
        async with async_session() as db:
            log = PhaseLog(
                engagement_id=self.engagement_id,
                phase=phase,
                status=status,
                message=message,
                started_at=datetime.utcnow() if status == "started" else None,
                completed_at=datetime.utcnow() if status in ("completed", "failed") else None,
            )
            db.add(log)
            await db.commit()

    async def _create_session(self, agent_role: str) -> str:
        async with async_session() as db:
            session = AgentSession(
                engagement_id=self.engagement_id,
                agent_role=agent_role,
                status="running",
            )
            db.add(session)
            await db.commit()
            return session.id

    async def _complete_session(self, session_id: str, output: dict = None, tokens_in: int = 0, tokens_out: int = 0):
        async with async_session() as db:
            s = await db.get(AgentSession, session_id)
            if s:
                s.status = "completed"
                s.completed_at = datetime.utcnow()
                s.output_data = output or {}
                s.input_tokens = tokens_in
                s.output_tokens = tokens_out
                await db.commit()

    async def _add_action(self, session_id: str, tool: str, input_data: dict, output: str):
        async with async_session() as db:
            action = AgentAction(
                session_id=session_id,
                tool_name=tool,
                tool_input=input_data,
                tool_output=output[:10000],
            )
            db.add(action)
            await db.commit()

    async def _add_finding(self, title: str, severity: str, category: str,
                           description: str, recommendation: str, reference: str = ""):
        async with async_session() as db:
            finding = Finding(
                engagement_id=self.engagement_id,
                title=title,
                severity=severity,
                category=category,
                target=self.target_host,
                description=description,
                recommendation=recommendation,
                reference=reference,
            )
            db.add(finding)
            await db.commit()

    # ─── Phase 1: Audit ────────────────────────────────────────────────

    async def _phase_audit(self):
        await self._log_phase("audit", "started", "Connecting to target and running hardening checks")
        session_id = await self._create_session("audit")

        creds = SSHCredentials(
            host=self.target_host,
            port=self.credentials.get("port", 22),
            username=self.credentials.get("username", ""),
            password=self.credentials.get("password"),
            key_path=self.credentials.get("key_path"),
        )

        results = []
        total = 0
        passed = 0
        failed = 0

        try:
            async with SSHExecutor(creds) as ssh:
                if not ssh._conn:
                    raise ConnectionError("Failed to connect to target")

                await self._add_action(session_id, "ssh_connect", {"host": self.target_host}, "Connected")

                # Detect OS
                if self.target_os == "auto":
                    os_type = await ssh.detect_os()
                    await self._add_action(session_id, "detect_os", {}, os_type)
                else:
                    os_type = self.target_os

                checklist = get_checklist(os_type)
                if not checklist:
                    raise ValueError(f"No checklist available for OS: {os_type}")

                await self._add_action(session_id, "load_checklist", {"os": os_type, "items": len(checklist)}, f"Loaded {len(checklist)} checks")

                # Run each check
                for item in checklist:
                    total += 1
                    result = await ssh.run(item["check_command"], timeout=15)
                    passed_check = evaluate_check(result.output, item.get("expected"))

                    status_str = "PASS" if passed_check else "FAIL"
                    if passed_check:
                        passed += 1
                    else:
                        failed += 1

                    results.append({
                        "id": item["id"],
                        "category": item["category"],
                        "description": item["description"],
                        "severity": item["severity"],
                        "command": item["check_command"],
                        "output": result.output[:500],
                        "exit_code": result.exit_code,
                        "status": status_str,
                        "expected": item.get("expected", ""),
                        "remediation": item.get("remediation", ""),
                    })

                    await self._add_action(
                        session_id,
                        "check",
                        {"id": item["id"], "description": item["description"]},
                        f"[{status_str}] {result.output[:300]}",
                    )

        except Exception as e:
            await self._add_action(session_id, "error", {}, str(e))
            await self._log_phase("audit", "failed", str(e))
            await self._complete_session(session_id, {"error": str(e)})
            return

        output = {
            "os_type": os_type,
            "total_checks": total,
            "passed": passed,
            "failed": failed,
            "results": results,
        }
        await self._complete_session(session_id, output)
        await self._log_phase("audit", "completed", f"{passed}/{total} checks passed")

        # Create findings for failed checks
        for r in results:
            if r["status"] == "FAIL":
                await self._add_finding(
                    title=f'{r["id"]}: {r["description"]}',
                    severity=r["severity"],
                    category=r["category"],
                    description=f'Check failed. Output: {r["output"][:200]}',
                    recommendation=r["remediation"],
                    reference=f'CIS Benchmark - {r["category"]}',
                )

    # ─── Phase 2: Hardening Analysis ──────────────────────────────────

    async def _phase_hardening(self):
        await self._log_phase("hardening", "started", "Analyzing audit results")
        session_id = await self._create_session("hardening")

        async with async_session() as db:
            result = await db.execute(select(Finding).where(Finding.engagement_id == self.engagement_id))
            all_findings = []
            for f in result.scalars().all():
                all_findings.append({
                    "title": f.title,
                    "severity": f.severity,
                    "category": f.category,
                    "recommendation": f.recommendation,
                })

        # Use LLM to prioritize and group findings
        try:
            analysis = await self._llm_analyze(all_findings)
            await self._add_action(session_id, "llm_analysis", {"findings_count": len(all_findings)}, analysis[:1000])
            await self._complete_session(session_id, {"analysis": analysis})
        except Exception as e:
            await self._add_action(session_id, "llm_error", {}, str(e))
            await self._complete_session(session_id, {"analysis": f"LLM analysis failed: {e}"})

        await self._log_phase("hardening", "completed", f"Analyzed {len(all_findings)} findings")

    async def _llm_analyze(self, findings: list) -> str:
        """Use LLM to analyze and prioritize hardening recommendations."""
        prompt = f"""You are a security hardening analyst. Analyze these audit findings and provide a prioritized hardening plan.

Findings ({len(findings)} total):
{json.dumps(findings, indent=2)}

Provide:
1. Risk summary (critical/high/medium/low counts)
2. Top 5 priority actions
3. Grouped recommendations by category
4. Estimated effort for each category"""

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{settings.OPENAI_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                json={
                    "model": settings.OPENAI_MODEL,
                    "messages": [
                        {"role": "system", "content": "You are a cybersecurity hardening expert. Be concise and actionable."},
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 2000,
                },
            )
            data = resp.json()
            if "choices" in data and data["choices"]:
                return data["choices"][0]["message"]["content"]
            raise ValueError(f"LLM error: {data}")

    # ─── Phase 3: Report ───────────────────────────────────────────────

    async def _phase_report(self):
        await self._log_phase("report", "started", "Generating hardening report")
        session_id = await self._create_session("report")

        async with async_session() as db:
            result = await db.execute(select(Finding).where(Finding.engagement_id == self.engagement_id))
            findings = []
            for f in result.scalars().all():
                findings.append({
                    "title": f.title,
                    "severity": f.severity,
                    "category": f.category,
                    "description": f.description,
                    "recommendation": f.recommendation,
                })

        critical = sum(1 for f in findings if f["severity"] == "critical")
        high = sum(1 for f in findings if f["severity"] == "high")
        medium = sum(1 for f in findings if f["severity"] == "medium")
        low = sum(1 for f in findings if f["severity"] == "low")

        report_data = {
            "target": self.target_host,
            "date": datetime.utcnow().isoformat(),
            "summary": {
                "total_findings": len(findings),
                "critical": critical,
                "high": high,
                "medium": medium,
                "low": low,
                "hardening_score": max(0, 100 - (critical * 25 + high * 10 + medium * 5 + low * 2)),
            },
            "findings": findings,
        }

        async with async_session() as db:
            report = Report(
                engagement_id=self.engagement_id,
                content=json.dumps(report_data),
                format="json",
            )
            db.add(report)
            await db.commit()

        await self._complete_session(session_id, report_data)
        await self._log_phase("report", "completed", f"Report generated: {len(findings)} findings")


async def run_hardening_assessment(
    engagement_id: str,
    target_host: str,
    credentials: dict,
    target_os: str = "auto",
):
    """Entry point for running a hardening assessment."""
    orch = HardeningOrchestrator(engagement_id, target_host, credentials, target_os)
    await orch.run()
