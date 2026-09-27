import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.sql import func
from database import Base


class MissionGateAssessment(Base):
    """F2: Mission Risk Budget sign-off gate.

    A documentation aid, never a veto: when a tasking fails the configured
    welfare readiness budget, an assessment must be acknowledged ('remediate' or
    'accept_risk' with mandatory note) before the tasking is recorded. The
    content hash + signer identity are hash-chained into the audit ledger so
    risk acceptance is later provable.
    """
    __tablename__ = "mission_gate_assessments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    unit_id = Column(String(36), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    tasking_ref = Column(String(120), nullable=False)
    budget_passed = Column(Boolean, nullable=False, index=True)
    metrics_snapshot = Column(JSON, nullable=False)  # reserve_pct, ssai, open_family_crisis, abstained_count
    budget_thresholds = Column(JSON, nullable=False)  # thresholds applied at evaluation time
    remediation_suggestions = Column(JSON, nullable=False, default=list)
    # pending_ack | remediation | risk_accepted
    status = Column(String(20), nullable=False, default="pending_ack", index=True)
    acknowledged_note = Column(Text, nullable=True)
    signed_by_user_id = Column(String(36), nullable=True)
    signed_at = Column(DateTime(timezone=True), nullable=True)
    content_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
