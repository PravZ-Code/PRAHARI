import uuid
from sqlalchemy import Column, String, Integer, Boolean, Date, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class ReintegrationWindow(Base):
    """F3: Post-Leave Reintegration Window.

    Process-level (non-ML) mechanism: personnel returning from leave enter a
    welfare-officer-attention window (day 0/7/14 checkpoints). Commander-side
    visibility is aggregate count only — names and content stay welfare-side
    under MHCA 2017 §21.
    """
    __tablename__ = "reintegration_windows"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    personnel_id = Column(String(36), ForeignKey("personnel.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_id = Column(String(36), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    leave_record_id = Column(String(36), nullable=True, index=True)  # LeaveRecord or GrievanceRequest source
    leave_category = Column(String(40), nullable=True)
    returned_on = Column(Date, nullable=False)
    window_start = Column(Date, nullable=False)
    window_end = Column(Date, nullable=False, index=True)
    # upcoming | active | completed | overdue
    status = Column(String(20), nullable=False, default="upcoming", index=True)
    checkpoints = Column(JSON, nullable=False, default=list)  # [{day, completed_at, completed_by_user_id, note_summary}]
    trooper_pulse = Column(JSON, nullable=True)  # optional voluntary 2-question re-entry pulse
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    personnel = relationship("Personnel")
    unit = relationship("Unit")
