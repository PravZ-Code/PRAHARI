import uuid
from sqlalchemy import Column, String, Integer, Numeric, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base

class SelfAssessment(Base):
    __tablename__ = "self_assessments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    personnel_id = Column(String(36), ForeignKey("personnel.id", ondelete="CASCADE"), nullable=False, index=True)
    assessed_at = Column(DateTime(timezone=True), nullable=False, index=True)
    sleep_quality = Column(Integer, nullable=False)  # 1 to 5
    sleep_hours = Column(Numeric(3, 1), nullable=False)
    mood_score = Column(Integer, nullable=False)     # 1 to 5
    energy_level = Column(Integer, nullable=False)   # 1 to 5
    stress_level = Column(Integer, nullable=False)   # 1 to 5
    appetite_score = Column(Integer, nullable=False) # 1 to 5
    social_connection = Column(Integer, nullable=False) # 1 to 5
    free_text = Column(Text, nullable=True)
    is_offline_entry = Column(Boolean, default=False)
    synced_at = Column(DateTime(timezone=True), nullable=True)

    personnel = relationship("Personnel", back_populates="assessments")
