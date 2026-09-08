import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class BuddySignal(Base):
    __tablename__ = "buddy_signals"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    unit_id = Column(String(36), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    concern_level = Column(Integer, nullable=False)  # 1 (minor), 2 (moderate), 3 (serious)
    concern_category = Column(String(30), nullable=False)  # 'withdrawal', 'mood_change', 'sleep', 'aggression', 'general'
    week_number = Column(Integer, nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)

    unit = relationship("Unit", back_populates="buddy_signals")
