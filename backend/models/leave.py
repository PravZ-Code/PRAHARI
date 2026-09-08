import uuid
from sqlalchemy import Column, String, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class LeaveRecord(Base):
    __tablename__ = "leave_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    personnel_id = Column(String(36), ForeignKey("personnel.id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type = Column(String(30), nullable=False)  # 'annual', 'casual', 'medical', 'emergency'
    applied_date = Column(Date, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, index=True)  # 'approved', 'denied', 'cancelled'
    denial_reason = Column(Text, nullable=True)

    personnel = relationship("Personnel", back_populates="leaves")
