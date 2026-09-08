import uuid
from sqlalchemy import Column, String, Integer, Date, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Unit(Base):
    __tablename__ = "units"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    formation = Column(String(100), nullable=True)
    location = Column(String(200), nullable=True)
    operational_area = Column(String(20), nullable=False)  # 'hard', 'semi-hard', 'peace'
    authorized_strength = Column(Integer, nullable=False, default=50)
    current_strength = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    personnel = relationship("Personnel", back_populates="unit", cascade="all, delete-orphan")
    users = relationship("User", back_populates="unit")
    buddy_signals = relationship("BuddySignal", back_populates="unit")
    duty_rosters = relationship("DutyRoster", back_populates="unit")
    uro_runs = relationship("URORun", back_populates="unit")


class Personnel(Base):
    __tablename__ = "personnel"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    service_number = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    rank = Column(String(30), nullable=False, index=True)
    trade = Column(String(50), nullable=True, default="GD")
    unit_id = Column(String(36), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    date_of_joining = Column(Date, nullable=False)
    current_posting_date = Column(Date, nullable=False)
    hard_area_months = Column(Integer, default=0)
    total_transfers = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    unit = relationship("Unit", back_populates="personnel")
    user = relationship("User", back_populates="personnel", uselist=False)
    deployments = relationship("DeploymentHistory", back_populates="personnel", cascade="all, delete-orphan")
    leaves = relationship("LeaveRecord", back_populates="personnel", cascade="all, delete-orphan")
    duty_rosters = relationship("DutyRoster", back_populates="personnel", cascade="all, delete-orphan")
    assessments = relationship("SelfAssessment", back_populates="personnel", cascade="all, delete-orphan")
    predictions = relationship("RiskPrediction", back_populates="personnel", cascade="all, delete-orphan")
    welfare_cases = relationship("WelfareCase", back_populates="personnel", cascade="all, delete-orphan")
    baselines = relationship("PersonalBaseline", back_populates="personnel", cascade="all, delete-orphan")
