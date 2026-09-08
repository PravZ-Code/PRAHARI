import uuid
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class CohortTemplate(Base):
    __tablename__ = "cohort_templates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    rank_category = Column(String(30), nullable=False)  # 'constable', 'nco', 'officer'
    area_type = Column(String(20), nullable=False)      # 'hard', 'semi-hard', 'peace'
    deployment_months_min = Column(Integer, nullable=False, default=0)
    deployment_months_max = Column(Integer, nullable=False, default=36)
    feature_means = Column(JSON, nullable=False)
    feature_stds = Column(JSON, nullable=False)
    sample_size = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    baselines = relationship("PersonalBaseline", back_populates="cohort")


class PersonalBaseline(Base):
    __tablename__ = "personal_baselines"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    personnel_id = Column(String(36), ForeignKey("personnel.id", ondelete="CASCADE"), nullable=False, index=True)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())
    baseline_type = Column(String(20), nullable=False)  # 'cohort', 'mixed', 'personalized'
    cohort_id = Column(String(36), ForeignKey("cohort_templates.id", ondelete="SET NULL"), nullable=True)
    confidence = Column(Numeric(5, 4), nullable=False)
    feature_means = Column(JSON, nullable=False)
    feature_stds = Column(JSON, nullable=False)
    data_points_count = Column(Integer, nullable=False, default=0)

    personnel = relationship("Personnel", back_populates="baselines")
    cohort = relationship("CohortTemplate", back_populates="baselines")


class RiskPrediction(Base):
    __tablename__ = "risk_predictions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    personnel_id = Column(String(36), ForeignKey("personnel.id", ondelete="CASCADE"), nullable=False, index=True)
    predicted_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    risk_score = Column(Numeric(5, 4), nullable=False)
    risk_level = Column(String(10), nullable=False)  # 'green', 'yellow', 'orange', 'red'
    confidence_score = Column(Numeric(5, 4), nullable=False)
    data_quality_score = Column(Numeric(5, 4), nullable=False)
    baseline_type = Column(String(20), nullable=False)
    model_version = Column(String(20), nullable=False, default="v1.0")
    shap_values = Column(JSON, nullable=False)

    personnel = relationship("Personnel", back_populates="predictions")
    welfare_cases = relationship("WelfareCase", back_populates="trigger_prediction")
