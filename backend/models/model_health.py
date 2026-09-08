import uuid
from sqlalchemy import Column, String, Integer, Numeric, Boolean, Text, DateTime, JSON
from sqlalchemy.sql import func
from database import Base

class ModelHealthSnapshot(Base):
    __tablename__ = "model_health_snapshots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    snapshot_date = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    model_version = Column(String(20), nullable=False, default="v1.0")
    total_predictions = Column(Integer, nullable=False, default=0)
    risk_distribution = Column(JSON, nullable=False)
    avg_confidence = Column(Numeric(5, 4), nullable=False, default=0.0)
    avg_data_quality = Column(Numeric(5, 4), nullable=False, default=0.0)
    calibration_error = Column(Numeric(5, 4), nullable=True)
    drift_detected = Column(Boolean, default=False)
    drift_details = Column(Text, nullable=True)
