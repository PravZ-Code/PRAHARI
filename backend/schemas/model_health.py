from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ModelHealthSnapshotData(BaseModel):
    date: str
    total_predictions: int
    distribution: Dict[str, int]
    avg_confidence: float
    avg_data_quality: float
    calibration_error: Optional[float] = None
    drift_detected: bool

class ModelHealthResponse(BaseModel):
    model_version: str
    latest_snapshot: Optional[ModelHealthSnapshotData] = None
    trend_7d: List[Dict[str, Any]]
