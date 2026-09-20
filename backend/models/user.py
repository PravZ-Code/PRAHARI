import uuid
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
from database import AuthBase


class User(AuthBase):
    """
    User Identity & Authentication Model.
    Stored physically in the dedicated Authentication & Identity Database (prahari_auth.db).
    References to personnel_id and unit_id are logical UUID references across database boundaries.
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # 'personnel', 'commander', 'welfare', 'admin'
    personnel_id = Column(String(36), nullable=True, index=True)
    unit_id = Column(String(36), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    @property
    def personnel(self):
        """Dynamically resolve linked Personnel record from the Operational/Personnel Database."""
        if not self.personnel_id:
            return None
        from database import SessionLocal
        from models.personnel import Personnel
        db = SessionLocal()
        try:
            return db.query(Personnel).filter(Personnel.id == self.personnel_id).first()
        finally:
            db.close()

    @property
    def unit(self):
        """Dynamically resolve linked Unit record from the Operational/Personnel Database."""
        if not self.unit_id:
            return None
        from database import SessionLocal
        from models.personnel import Unit
        db = SessionLocal()
        try:
            return db.query(Unit).filter(Unit.id == self.unit_id).first()
        finally:
            db.close()

    @property
    def assigned_welfare_cases(self):
        """Dynamically resolve assigned welfare cases from the Operational Database."""
        from database import SessionLocal
        from models.welfare_case import WelfareCase
        db = SessionLocal()
        try:
            return db.query(WelfareCase).filter(WelfareCase.assigned_officer_id == self.id).all()
        finally:
            db.close()

    @property
    def audit_logs(self):
        """Dynamically resolve audit logs from the Operational Database."""
        from database import SessionLocal
        from models.audit import AuditLog
        db = SessionLocal()
        try:
            return db.query(AuditLog).filter(AuditLog.user_id == self.id).all()
        finally:
            db.close()
