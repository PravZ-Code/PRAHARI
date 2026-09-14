import uuid
from sqlalchemy import Column, String, Date, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class ResilienceIntervention(Base):
    """Durable approval state for a proposed what-if roster intervention."""

    __tablename__ = "resilience_interventions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    plan_id = Column(String(50), nullable=False, index=True)
    personnel_id = Column(String(36), ForeignKey("personnel.id", ondelete="CASCADE"), nullable=False)
    replacement_personnel_id = Column(String(36), ForeignKey("personnel.id", ondelete="SET NULL"), nullable=True)
    unit_id = Column(String(36), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    target_date = Column(Date, nullable=False)
    proposed_shift = Column(String(20), nullable=False)
    duty_type = Column(String(30), nullable=False, default="guard")
    status = Column(String(30), nullable=False, default="awaiting_dual_approval")
    commander_approved = Column(Boolean, nullable=False, default=False)
    welfare_approved = Column(Boolean, nullable=False, default=False)
    commander_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    welfare_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    committed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    details = Column(JSON, nullable=True)

    personnel = relationship("Personnel", foreign_keys=[personnel_id])
    replacement_personnel = relationship("Personnel", foreign_keys=[replacement_personnel_id])
