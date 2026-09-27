import uuid
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class HelperLoadEntry(Base):
    """F1: Helper-Load Ledger (welfare cost ledger).

    Every welfare action has a cost bearer. Each committed swap / leave cover /
    rest cover writes a signed debit against the absorbing helper. Crossing the
    configured burden threshold removes the helper from the URO replacement pool
    and auto-queues a reciprocal payback relief task.
    """
    __tablename__ = "helper_load_entries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    personnel_id = Column(String(36), ForeignKey("personnel.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_id = Column(String(36), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    source_type = Column(String(20), nullable=False)  # 'uro_swap' | 'leave_cover' | 'rest_cover'
    source_id = Column(String(36), nullable=False, index=True)  # idempotency anchor
    debit_weight = Column(Numeric(4, 2), nullable=False, default=1.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    closed_out_at = Column(DateTime(timezone=True), nullable=True)


class PaybackTask(Base):
    """F1: reciprocal relief task auto-queued for an over-burdened helper."""
    __tablename__ = "payback_tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    personnel_id = Column(String(36), ForeignKey("personnel.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_id = Column(String(36), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(String(255), nullable=False)
    action_type = Column(String(30), nullable=False, default="rest_block")  # rest_block | light_duty | own_leave_priority
    status = Column(String(20), nullable=False, default="open", index=True)  # open | scheduled | done | dismissed
    due_by = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    dismissed_by_user_id = Column(String(36), nullable=True)
    dismissal_reason = Column(String(255), nullable=True)
