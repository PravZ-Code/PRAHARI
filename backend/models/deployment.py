import uuid
from sqlalchemy import Column, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class DeploymentHistory(Base):
    __tablename__ = "deployment_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    personnel_id = Column(String(36), ForeignKey("personnel.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_id = Column(String(36), ForeignKey("units.id", ondelete="CASCADE"), nullable=False)
    area_type = Column(String(20), nullable=False)  # 'hard', 'semi-hard', 'peace'
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    duty_type = Column(String(30), nullable=False)  # 'operational', 'training', 'leave', 'HQ'

    personnel = relationship("Personnel", back_populates="deployments")
