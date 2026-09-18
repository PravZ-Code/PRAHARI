import uuid
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class WelfareCase(Base):
    __tablename__ = "welfare_cases"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    personnel_id = Column(String(36), ForeignKey("personnel.id", ondelete="CASCADE"), nullable=False, index=True)
    triggered_by = Column(String(30), nullable=False)  # 'model_alert', 'help_request', 'buddy_signal', 'manual'
    trigger_prediction_id = Column(String(36), ForeignKey("risk_predictions.id", ondelete="SET NULL"), nullable=True)
    risk_level_at_creation = Column(String(10), nullable=False)
    status = Column(String(20), nullable=False, default="pending", index=True)
    # 'pending', 'acknowledged', 'plan_created', 'intervention_active', 'resolved', 'escalated'
    assigned_officer_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    plan_created_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    sla_acknowledge_deadline = Column(DateTime(timezone=True), nullable=False)
    sla_plan_deadline = Column(DateTime(timezone=True), nullable=False)
    sla_breached = Column(Boolean, default=False)
    escalation_level = Column(Integer, default=0)
    escalated_at = Column(DateTime(timezone=True), nullable=True)
    intervention_type = Column(String(50), nullable=True)
    intervention_notes = Column(Text, nullable=True)
    outcome_notes = Column(Text, nullable=True)

    personnel = relationship("Personnel", back_populates="welfare_cases")
    trigger_prediction = relationship("RiskPrediction", back_populates="welfare_cases")
    assigned_officer = relationship("User", back_populates="assigned_welfare_cases")
    escalations = relationship("SLAEscalation", back_populates="case", cascade="all, delete-orphan")


class SLAEscalation(Base):
    __tablename__ = "sla_escalations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("welfare_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    from_level = Column(Integer, nullable=False)
    to_level = Column(Integer, nullable=False)
    reason = Column(String(30), nullable=False)  # 'ack_timeout', 'plan_timeout', 'manual'
    escalated_at = Column(DateTime(timezone=True), server_default=func.now())

    case = relationship("WelfareCase", back_populates="escalations")
