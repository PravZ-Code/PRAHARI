from pydantic import BaseModel, Field
from typing import Dict, List

class BuddySignalSubmitRequest(BaseModel):
    concern_level: int = Field(..., ge=1, le=3, description="1 (minor), 2 (moderate), 3 (serious)")
    concern_category: str = Field(..., description="'withdrawal', 'mood_change', 'sleep', 'aggression', 'general'")

class BuddyWeekSummary(BaseModel):
    week_number: int
    year: int
    total_signals: int
    by_category: Dict[str, int]
    avg_concern_level: float

class BuddyUnitSummaryResponse(BaseModel):
    unit_id: str
    unit_name: str
    weeks: List[BuddyWeekSummary]
