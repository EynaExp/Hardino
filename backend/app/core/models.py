import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, nullable=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="user")
    created_at = Column(DateTime, default=datetime.utcnow)


class Engagement(Base):
    __tablename__ = "engagements"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    target_scope = Column(JSON, nullable=False, default=list)
    status = Column(String, default="pending")
    current_phase = Column(String, nullable=True)
    report_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    sessions = relationship("AgentSession", back_populates="engagement")
    findings = relationship("Finding", back_populates="engagement")
    reports = relationship("Report", back_populates="engagement")
    phase_logs = relationship("PhaseLog", back_populates="engagement")


class AgentSession(Base):
    __tablename__ = "agent_sessions"

    id = Column(String, primary_key=True, default=gen_uuid)
    engagement_id = Column(String, ForeignKey("engagements.id"), nullable=False)
    agent_role = Column(String, nullable=False)
    status = Column(String, default="running")
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    model_used = Column(String, nullable=True)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    engagement = relationship("Engagement", back_populates="sessions")
    actions = relationship("AgentAction", back_populates="session")


class AgentAction(Base):
    __tablename__ = "agent_actions"

    id = Column(String, primary_key=True, default=gen_uuid)
    session_id = Column(String, ForeignKey("agent_sessions.id"), nullable=False)
    tool_name = Column(String, nullable=False)
    tool_input = Column(JSON, nullable=True)
    tool_output = Column(Text, nullable=True)
    action_type = Column(String, default="tool_call")
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("AgentSession", back_populates="actions")


class Finding(Base):
    __tablename__ = "findings"

    id = Column(String, primary_key=True, default=gen_uuid)
    engagement_id = Column(String, ForeignKey("engagements.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String, nullable=False)
    category = Column(String, nullable=True)
    target = Column(String, nullable=True)
    recommendation = Column(Text, nullable=True)
    reference = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    engagement = relationship("Engagement", back_populates="findings")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=gen_uuid)
    engagement_id = Column(String, ForeignKey("engagements.id"), nullable=False)
    content = Column(Text, nullable=True)
    file_path = Column(String, nullable=True)
    format = Column(String, default="json")
    created_at = Column(DateTime, default=datetime.utcnow)

    engagement = relationship("Engagement", back_populates="reports")


class PhaseLog(Base):
    __tablename__ = "phase_logs"

    id = Column(String, primary_key=True, default=gen_uuid)
    engagement_id = Column(String, ForeignKey("engagements.id"), nullable=False)
    phase = Column(String, nullable=False)
    status = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    engagement = relationship("Engagement", back_populates="phase_logs")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(String, primary_key=True, default=gen_uuid)
    host = Column(String, nullable=False, index=True)
    os_type = Column(String, nullable=True)
    os_info = Column(String, nullable=True)
    open_ports = Column(JSON, nullable=True)
    services = Column(JSON, nullable=True)
    last_scan_id = Column(String, ForeignKey("engagements.id"), nullable=True)
    last_scan_at = Column(DateTime, nullable=True)
    hardening_score = Column(Integer, nullable=True)
    findings_count = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
