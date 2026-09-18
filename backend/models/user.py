import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # 'personnel', 'commander', 'welfare', 'admin'
    personnel_id = Column(String(36), ForeignKey("personnel.id", ondelete="SET NULL"), nullable=True)
    unit_id = Column(String(36), ForeignKey("units.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    personnel = relationship("Personnel", back_populates="user")
    unit = relationship("Unit", back_populates="users")
    assigned_welfare_cases = relationship("WelfareCase", back_populates="assigned_officer")
    audit_logs = relationship("AuditLog", back_populates="user")
