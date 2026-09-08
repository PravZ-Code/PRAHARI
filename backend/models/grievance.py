import uuid
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class GrievanceRequest(Base):
    __tablename__ = "grievance_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    personnel_id = Column(String(36), ForeignKey("personnel.id", ondelete="CASCADE"), nullable=False, index=True)
    request_type = Column(String(20), nullable=False, default="leave")  # 'leave', 'grievance', 'family_crisis'
    category = Column(String(40), nullable=False)
    # Fast-lane categories: 'family_emergency', 'bereavement', 'acute_domestic_crisis', 'medical_emergency'
    # Standard: 'annual_leave', 'casual_leave', 'administrative_delay', 'unjust_denial_appeal', 'welfare_amenity'
    description = Column(Text, nullable=True)
    start_date = Column(String(10), nullable=True)  # YYYY-MM-DD
    end_date = Column(String(10), nullable=True)    # YYYY-MM-DD
    filing_channel = Column(String(20), nullable=False, default="pwa")  # 'pwa', 'ivr', 'sms', 'ussd', 'manual'

    # Fast-lane flag
    is_fast_lane = Column(Boolean, default=False, nullable=False, index=True)

    # Status: 'filed', 'fast_tracked', 'collision_checked', 'approved', 'rejected', 'escalated'
    status = Column(String(25), nullable=False, default="filed", index=True)

    # SLA Clock & Escalation
    filed_at = Column(DateTime(timezone=True), server_default=func.now())
    sla_deadline_hours = Column(Integer, nullable=False, default=48)
    sla_deadline = Column(DateTime(timezone=True), nullable=False, index=True)
    sla_breached = Column(Boolean, default=False, nullable=False, index=True)
    escalation_level = Column(Integer, default=0, nullable=False)  # 0: Company, 1: Battalion 2IC/Welfare, 2: Commandant
    escalated_at = Column(DateTime(timezone=True), nullable=True)
    escalation_reason = Column(String(50), nullable=True)
    escalation_history = Column(JSON, default=list, nullable=False)

    # Collision Check & Team Impact (Phase 2 wired into Phase 1)
    collision_status = Column(String(20), default="unchecked", nullable=False)  # 'safe', 'warning', 'blocked'
    collision_details = Column(JSON, nullable=True)
    suggested_replacement_id = Column(String(36), ForeignKey("personnel.id", ondelete="SET NULL"), nullable=True)

    # Dual Approval Sign-Off
    commander_approved = Column(Boolean, default=False, nullable=False)
    commander_approved_at = Column(DateTime(timezone=True), nullable=True)
    commander_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    welfare_approved = Column(Boolean, default=False, nullable=False)
    welfare_approved_at = Column(DateTime(timezone=True), nullable=True)
    welfare_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    # Outcome & Cost of Inaction Tracking
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    time_to_resolution_hours = Column(Integer, nullable=True)
    rejection_reason = Column(String(255), nullable=True)
    cost_of_inaction_active = Column(Boolean, default=False, nullable=False)

    personnel = relationship("Personnel", foreign_keys=[personnel_id])
    suggested_replacement = relationship("Personnel", foreign_keys=[suggested_replacement_id])
