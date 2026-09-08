from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class GrievanceFileRequest(BaseModel):
    personnel_id: Optional[str] = None
    request_type: str = Field("leave", description="'leave', 'grievance', 'family_crisis'")
    category: str = Field(..., description="e.g. 'family_emergency', 'bereavement', 'acute_domestic_crisis', 'medical_emergency', 'annual_leave', 'casual_leave', 'administrative_delay'")
    description: Optional[str] = None
    start_date: Optional[str] = Field(None, description="YYYY-MM-DD")
    end_date: Optional[str] = Field(None, description="YYYY-MM-DD")
    filing_channel: Optional[str] = Field("pwa", description="'pwa', 'ivr', 'sms', 'ussd', 'manual'")

class GrievanceResponse(BaseModel):
    id: str
    personnel_id: str
    personnel_name: Optional[str] = None
    rank: Optional[str] = None
    trade: Optional[str] = None
    unit_id: Optional[str] = None
    unit_name: Optional[str] = None
    request_type: str
    category: str
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_fast_lane: bool
    status: str
    filed_at: datetime
    sla_deadline_hours: int
    sla_deadline: datetime
    sla_breached: bool
    hours_remaining: float
    escalation_level: int
    escalated_at: Optional[datetime] = None
    escalation_reason: Optional[str] = None
    collision_status: str
    collision_details: Optional[Dict[str, Any]] = None
    suggested_replacement_id: Optional[str] = None
    suggested_replacement_name: Optional[str] = None
    commander_approved: bool = False
    commander_approved_at: Optional[datetime] = None
    welfare_approved: bool = False
    welfare_approved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    cost_of_inaction_active: bool = False

class GrievanceApproveRequest(BaseModel):
    role: Optional[str] = Field(None, description="'commander' or 'welfare'")
    single_sign: Optional[bool] = Field(False, description="Whether to execute single-signature demo commit")
    replacement_personnel_id: Optional[str] = None
    notes: Optional[str] = None

class GrievanceRejectRequest(BaseModel):
    reason: str = Field("Operational mission constraints", description="Reason for declining leave/grievance")
    notes: Optional[str] = None

class GrievanceCountdownResponse(BaseModel):
    request_id: str
    category: str
    is_fast_lane: bool
    status: str
    hours_remaining: float
    minutes_remaining: int
    is_expired: bool
    sla_deadline: str
    escalation_level: int
    current_escalation_tier: str
    simple_summary: str
