import uuid
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class URORun(Base):
    __tablename__ = "uro_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    unit_id = Column(String(36), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    run_at = Column(DateTime(timezone=True), server_default=func.now())
    run_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    roster_date_start = Column(String(10), nullable=False)
    roster_date_end = Column(String(10), nullable=False)
    before_risk_summary = Column(JSON, nullable=False)
    after_risk_summary = Column(JSON, nullable=False)
    swaps_proposed = Column(Integer, nullable=False, default=0)
    swaps = Column(JSON, nullable=False)
    risk_reduction_pct = Column(Numeric(5, 2), nullable=False, default=0.0)
    status = Column(String(20), nullable=False, default="proposed")  # 'proposed', 'partially_approved', 'approved', 'applied', 'rejected'

    commander_approved = Column(Boolean, default=False, nullable=False)
    commander_approved_at = Column(DateTime(timezone=True), nullable=True)
    commander_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    welfare_approved = Column(Boolean, default=False, nullable=False)
    welfare_approved_at = Column(DateTime(timezone=True), nullable=True)
    welfare_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    roster_committed = Column(Boolean, default=False, nullable=False)

    declined_by_role = Column(String(20), nullable=True)
    declined_at = Column(DateTime(timezone=True), nullable=True)
    declined_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decline_reason = Column(String(255), nullable=True)

    unit = relationship("Unit", back_populates="uro_runs")
