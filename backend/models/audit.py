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
    signature = Column(String(128), nullable=True)  # Asymmetric / HMAC signature from isolated KMS key
    anchor_id = Column(String(36), nullable=True, index=True)  # Link to external checkpoint anchor
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(50), nullable=False)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(36), nullable=True)
    endpoint = Column(String(200), nullable=False)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    details = Column(JSON, nullable=True)

    user = relationship("User", back_populates="audit_logs")


class AuditAnchor(Base):
    """
    Periodic external Merkle checkpoint anchor.
    Provides verifiable proof against administrator tampering or ledger recomputation.
    Simulates / interfaces with an external RFC 3161 Time-Stamp Authority (TSA) or WORM storage.
    """
    __tablename__ = "audit_anchors"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sequence_number = Column(Integer, nullable=False, index=True)  # Block height at anchoring
    head_hash = Column(String(64), nullable=False)
    merkle_root = Column(String(64), nullable=False)
    signature = Column(String(128), nullable=False)
    anchor_type = Column(String(50), default="RFC3161_TSA_EXTERNAL")
    anchored_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    external_receipt_nonce = Column(String(64), nullable=False)
