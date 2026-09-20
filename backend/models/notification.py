import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from database import Base


class Notification(Base):
    """
    Persistent Multi-Role Notification Model.
    Stored physically in the Operational Database (prahari.db).
    Acts as the single source of truth for all welfare, grievance, emergency,
    and command alert notifications.
    """
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    recipient_role = Column(String(30), nullable=True, index=True)  # 'personnel', 'welfare', 'commander', 'admin'
    user_id = Column(String(36), nullable=True, index=True)          # Specific user target (optional)
    personnel_id = Column(String(36), nullable=True, index=True)     # Specific soldier reference
    unit_id = Column(String(36), nullable=True, index=True)          # Unit/Battalion boundary filter
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String(255), nullable=True)                        # Actionable portal route (e.g. /approvals, /welfare)
    priority = Column(String(20), default="normal")                  # 'low', 'normal', 'high', 'urgent', 'critical'
    entity_type = Column(String(50), nullable=True)                  # 'grievance', 'leave', 'emergency', 'assessment', 'roster'
    entity_id = Column(String(36), nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
