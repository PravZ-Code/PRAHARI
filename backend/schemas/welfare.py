from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class WelfareCaseListItem(BaseModel):
    id: str
    personnel_id: str
    personnel_name: str
    personnel_rank: str
    unit_name: str
    risk_level: str
    risk_score: float = 0.75
    triggered_by: str
    status: str
    created_at: datetime
    sla_acknowledge_deadline: datetime
    sla_plan_deadline: datetime
    sla_breached: bool
    hours_until_ack_deadline: float
    escalation_level: int

class WelfareCasesResponse(BaseModel):
    total: int
    page: int
    cases: List[WelfareCaseListItem]

class ShapFactor(BaseModel):
    feature: str
    value: Optional[float] = None
    impact: float
    display_name: Optional[str] = None
    contribution_pct: Optional[float] = None

class PredictionSummary(BaseModel):
    risk_score: float
    risk_level: str
    confidence: float
    data_quality: float
    shap_top_factors: List[ShapFactor]

class WelfareCaseDetail(BaseModel):
    id: str
    personnel: Dict[str, Any]
    triggered_by: str
    risk_level_at_creation: str
    status: str
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    plan_created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    sla_acknowledge_deadline: datetime
    sla_plan_deadline: datetime
    sla_breached: bool
    hours_until_ack_deadline: float = 0.0
    escalation_level: int
    intervention_type: Optional[str] = None
    intervention_notes: Optional[str] = None
    outcome_notes: Optional[str] = None
    latest_prediction: Optional[PredictionSummary] = None
    buddy_signals_this_month: int = 0
    escalation_history: List[Dict[str, Any]] = []

class PlanCreateRequest(BaseModel):
    intervention_type: str = Field(..., description="'counseling', 'rest_cycle', 'light_duty', 'reassignment', 'medical_referral', 'peer_support'")
    intervention_notes: str = Field(..., max_length=2000)

class CaseResolveRequest(BaseModel):
    outcome_notes: str = Field(..., max_length=2000)

class WhatIfRequest(BaseModel):
    personnel_id: str
    scenario: Dict[str, Any]  # shift_type, add_rest_days, reduce_night_shifts, transfer_to_area, approve_pending_leave

class WhatIfResponse(BaseModel):
    current: Dict[str, Any]
    projected: Dict[str, Any]
    risk_reduction: float
    risk_reduction_pct: float
    scenario_applied: Dict[str, Any]
    key_factors_changed: List[Dict[str, Any]]

class CaseReassessResponse(BaseModel):
    case_id: str
    personnel_id: str
    personnel_name: str
    initial_risk_score: float
    initial_risk_level: str
    current_risk_score: float
    current_risk_level: str
    delta_risk: float
    recovery_status: str
    reassessed_at: datetime
    clinical_decision_support: str

