from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class UROOptimizeRequest(BaseModel):
    roster_date_start: str = Field(..., description="YYYY-MM-DD")
    roster_date_end: str = Field(..., description="YYYY-MM-DD")
    max_swaps: int = Field(10, ge=1, le=50)
    protect_minimum_manning: bool = True

class UROApproveRequest(BaseModel):
    role: Optional[str] = Field(None, description="'commander' or 'welfare'")
    single_sign: Optional[bool] = Field(False, description="Whether to execute single-signature demo commit")

class SwapItem(BaseModel):
    swap_id: int
    roster_id_a: Optional[str] = None
    roster_id_b: Optional[str] = None
    person_a: Dict[str, Any]
    person_b: Dict[str, Any]
    date: str
    trade: Optional[str] = None
    projected_risk_change_a: Dict[str, float]
    projected_risk_change_b: Dict[str, float]

class URORunResponse(BaseModel):
    run_id: str
    unit_id: str
    before: Dict[str, int]
    after: Dict[str, int]
    swaps: List[SwapItem]
    risk_reduction_pct: float
    status: str
    commander_approved: bool = False
    commander_approved_at: Optional[datetime] = None
    commander_user_id: Optional[str] = None
    welfare_approved: bool = False
    welfare_approved_at: Optional[datetime] = None
    welfare_user_id: Optional[str] = None
    roster_committed: bool = False
    declined_by_role: Optional[str] = None
    declined_at: Optional[datetime] = None
    decline_reason: Optional[str] = None
    cost_of_inaction_context: Optional[Dict[str, Any]] = None

class UROApprovalResponse(BaseModel):
    message: str
    status: str
    commander_approved: bool
    commander_approved_at: Optional[str] = None
    commander_user_id: Optional[str] = None
    welfare_approved: bool
    welfare_approved_at: Optional[str] = None
    welfare_user_id: Optional[str] = None
    roster_committed: bool
    both_approved: bool

class URORejectRequest(BaseModel):
    reason: str = Field("Operational constraints", description="Reason for declining the proposed intervention")

class URORejectResponse(BaseModel):
    message: str
    status: str
    run_id: str
    declined_by_role: Optional[str] = None
    declined_at: Optional[str] = None
    decline_reason: Optional[str] = None
    cost_of_inaction_tracking_active: bool = True


