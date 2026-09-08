from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class BaselineComparisonPoint(BaseModel):
    metric_name: str
    current_value: float
    personal_baseline: Optional[float] = None
    cohort_baseline: float
    population_norm: float
    z_score_personal: Optional[float] = None
    z_score_cohort: float
    status: str  # 'NORMAL', 'ELEVATED', 'CRITICAL', 'FAVORABLE'

class TrajectoryPoint(BaseModel):
    timestamp: datetime
    risk_score: float
    risk_level: str
    workload_index: float
    self_reported_index: float

class TrendAnalysisReport(BaseModel):
    personnel_id: str
    baseline_type_active: str  # 'personalized', 'cohort', 'mixed'
    trajectory_classification: str  # 'SUSTAINED_DETERIORATION', 'ACUTE_WORKLOAD_SPIKE', 'RECOVERY_TRAJECTORY', 'STABLE'
    velocity_score: float  # Slope of risk trajectory (positive = deteriorating)
    acceleration_score: float  # Curvature
    risk_score_current: float
    risk_score_30d_ago: float
    delta_risk: float
    baseline_comparisons: List[BaselineComparisonPoint]
    trajectory_history: List[TrajectoryPoint]
    clinical_decision_support_summary: str
    recommended_action: str
