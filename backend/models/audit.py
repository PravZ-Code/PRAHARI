import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sequence_number = Column(Integer, nullable=True, index=True)
    previous_hash = Column(String(64), nullable=False, default="0" * 64)
    current_hash = Column(String(64), nullable=False, default="0" * 64)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(50), nullable=False)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(36), nullable=True)
    endpoint = Column(String(200), nullable=False)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    details = Column(JSON, nullable=True)

    user = relationship("User", back_populates="audit_logs")
