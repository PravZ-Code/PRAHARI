import uuid
from sqlalchemy import Column, String, Date, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class DutyRoster(Base):
    __tablename__ = "duty_roster"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    personnel_id = Column(String(36), ForeignKey("personnel.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_id = Column(String(36), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    shift_type = Column(String(20), nullable=False)  # 'day', 'night', 'split', 'off'
    duty_type = Column(String(30), nullable=False)   # 'patrol', 'guard', 'standby', 'training', 'rest'
    hours = Column(Numeric(4, 1), nullable=False, default=8.0)

    personnel = relationship("Personnel", back_populates="duty_rosters")
    unit = relationship("Unit", back_populates="duty_rosters")
