from pydantic import BaseModel
from typing import Dict, List, Optional

class UnitCard(BaseModel):
    id: str
    name: str
    location: Optional[str] = None
    operational_area: str
    strength: int
    readiness_score: float
    risk_distribution: Dict[str, int]

class CommanderUnitsResponse(BaseModel):
    units: List[UnitCard]

class ReadinessTrendPoint(BaseModel):
    date: str
    score: float

class UnitReadinessResponse(BaseModel):
    unit_id: str
    unit_name: str
    readiness_score: float
    readiness_trend: List[ReadinessTrendPoint]
    risk_distribution: Dict[str, int]
    personnel_count: int

class DistributionTrendPoint(BaseModel):
    date: str
    green: int
    yellow: int
    orange: int
    red: int

class UnitRiskDistributionResponse(BaseModel):
    unit_id: str
    current: Dict[str, int]
    trend_7d: List[DistributionTrendPoint]

class WorkloadTrendPoint(BaseModel):
    date: str
    avg_hours: float
    night_shift_count: int
    day_shift_count: int
    off_count: int
    avg_consecutive_days_on: float

class UnitWorkloadResponse(BaseModel):
    unit_id: str
    trends: List[WorkloadTrendPoint]

class DutyDaySchema(BaseModel):
    day: int
    date: str
    shift: str  # 'DAY', 'NIGHT', 'EXTENDED', 'REST', 'DOUBLE'
    hours: float
    fatigueScore: int  # 0 to 100

class TrooperFatigueProfileSchema(BaseModel):
    id: str
    name: str
    rank: str
    trade: str
    consecutiveDays: int
    nightShiftPct: int
    days: List[DutyDaySchema]

class UnitFatigueResponse(BaseModel):
    unit_id: str
    troopers: List[TrooperFatigueProfileSchema]
