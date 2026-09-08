from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class BatchPredictRequest(BaseModel):
    unit_id: Optional[str] = None
    model_version: str = "v1.0"

class BatchPredictResponse(BaseModel):
    total_predicted: int
    distribution: Dict[str, int]
    cases_created: int
    model_version: str

class PersonalDashboardResponse(BaseModel):
    personnel_id: str
    name: str
    rank: str
    current_risk: Dict[str, Any]
    risk_trend: List[Dict[str, Any]]
    baseline_confidence: float
    assessments_submitted: int
    days_until_personalized: int
