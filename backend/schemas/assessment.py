from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class AssessmentSubmitRequest(BaseModel):
    id: Optional[str] = Field(None, description="Client-generated UUID for offline idempotency")
    sleep_quality: int = Field(..., ge=1, le=5)
    sleep_hours: float = Field(..., ge=0.0, le=24.0)
    mood_score: int = Field(..., ge=1, le=5)
    energy_level: int = Field(..., ge=1, le=5)
    stress_level: int = Field(..., ge=1, le=5)
    appetite_score: int = Field(..., ge=1, le=5)
    social_connection: int = Field(..., ge=1, le=5)
    free_text: Optional[str] = Field(None, max_length=500)
    is_offline_entry: bool = False
    assessed_at: Optional[datetime] = None

class AssessmentBulkSyncRequest(BaseModel):
    assessments: List[AssessmentSubmitRequest]

class AssessmentItem(BaseModel):
    id: str
    assessed_at: datetime
    sleep_quality: int
    sleep_hours: float
    mood_score: int
    energy_level: int
    stress_level: int
    appetite_score: int
    social_connection: int

class AssessmentHistoryResponse(BaseModel):
    personnel_id: str
    assessments: List[AssessmentItem]

class HelpRequest(BaseModel):
    message: Optional[str] = Field(None, max_length=1000)
