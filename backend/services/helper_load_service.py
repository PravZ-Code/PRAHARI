"""F1 â€” Helper-Load Ledger with enforced payback.

Persistent, auditable accounting of WHO pays for each welfare action. Exceeding
the burden threshold removes the helper from the URO replacement pool and
queues a reciprocal relief task. Detection alone (old Â§29) is now paired with
enforced correction.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from config import settings
from middleware.audit import log_audit
from models.helper_ledger import HelperLoadEntry, PaybackTask
from models.personnel import Personnel

logger = logging.getLogger(__name__)

SOURCE_WEIGHTS = {"uro_swap": 1.0, "leave_cover": 1.0, "rest_cover": 0.5}


def record_absorption(
    db: Session,
    helper_personnel_id: str,
    source_type: str,
    source_id: str,
    actor_user=None,
    weight: Optional[float] = None,
) -> Optional[HelperLoadEntry]:
    """Idempotent debit creation. Returns None if the (source) was already ledgered."""
    helper = db.query(Personnel).filter(Personnel.id == helper_personnel_id).first()
    if not helper or not helper.unit_id:
        return None
    dup = db.query(HelperLoadEntry).filter(
        HelperLoadEntry.source_type == source_type,
        HelperLoadEntry.source_id == source_id,
        HelperLoadEntry.personnel_id == helper_personnel_id,
    ).first()
    if dup:
        return dup
    w = float(weight if weight is not None else SOURCE_WEIGHTS.get(source_type, 1.0))
    entry = HelperLoadEntry(
        personnel_id=helper_personnel_id,
        unit_id=helper.unit_id,
        source_type=source_type,
        source_id=source_id,
        debit_weight=w,
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=int(settings.HELPER_ENTRY_EXPIRY_DAYS)),
    )
    db.add(entry)
    db.commit()
    log_audit(db=db, user=actor_user, resource_type="helper_load", resource_id=entry.id,
              action="HELPER_DEBIT_RECORDED", details={"helper": helper_personnel_id, "source": f"{source_type}:{source_id}", "weight": w})
    _maybe_create_payback(db, helper, actor_user)
    return entry


def current_burden(db: Session, personnel_id: str) -> float:
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=int(settings.HELPER_BURDEN_WINDOW_DAYS))
    rows = db.query(HelperLoadEntry).filter(
        HelperLoadEntry.personnel_id == personnel_id,
        HelperLoadEntry.created_at >= cutoff,
        HelperLoadEntry.expires_at > datetime.now(timezone.utc).replace(tzinfo=None),
        HelperLoadEntry.closed_out_at.is_(None),
    ).all()
    return round(float(sum(float(r.debit_weight) for r in rows)), 2)


def is_burden_exceeded(db: Session, personnel_id: str) -> bool:
    return current_burden(db, personnel_id) >= float(settings.HELPER_BURDEN_THRESHOLD)


def excluded_replacement_ids(db: Session, unit_id: str) -> List[str]:
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=int(settings.HELPER_BURDEN_WINDOW_DAYS))
    rows = db.query(HelperLoadEntry).filter(
        HelperLoadEntry.unit_id == unit_id,
        HelperLoadEntry.created_at >= cutoff,
        HelperLoadEntry.expires_at > datetime.now(timezone.utc).replace(tzinfo=None),
        HelperLoadEntry.closed_out_at.is_(None),
    ).all()
    totals: Dict[str, float] = {}
    for r in rows:
        totals[r.personnel_id] = totals.get(r.personnel_id, 0.0) + float(r.debit_weight)
    threshold = float(settings.HELPER_BURDEN_THRESHOLD)
    return [pid for pid, total in totals.items() if total >= threshold]


def _maybe_create_payback(db: Session, helper: Personnel, actor_user=None) -> Optional[PaybackTask]:
    if not is_burden_exceeded(db, helper.id):
        return None
    open_task = db.query(PaybackTask).filter(
        PaybackTask.personnel_id == helper.id,
        PaybackTask.status.in_(["open", "scheduled"]),
    ).first()
    if open_task:
        return open_task
    task = PaybackTask(
        personnel_id=helper.id,
        unit_id=helper.unit_id,
        reason=f"Absorbed welfare-cover burden above threshold ({settings.HELPER_BURDEN_THRESHOLD} in {settings.HELPER_BURDEN_WINDOW_DAYS}d)",
        action_type="rest_block",
        status="open",
        due_by=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=48),
    )
    db.add(task)
    db.commit()
    log_audit(db=db, user=actor_user, resource_type="payback_task", resource_id=task.id,
              action="HELPER_PAYBACK_QUEUED", details={"helper": helper.id, "due_by": task.due_by.isoformat()})
    try:
        from services.sync_service import sync_broadcaster
        sync_broadcaster.publish(
            "helper_payback_created",
            {"task_id": task.id, "unit_id": helper.unit_id},
            unit_id=helper.unit_id,
        )
    except Exception as e:  # pragma: no cover
        logger.debug(f"payback event publish skipped: {e}")
    return task


def unit_helper_load(db: Session, unit_id: str) -> Dict[str, Any]:
    members = db.query(Personnel).filter(Personnel.unit_id == unit_id).all()
    entries = []
    for p in members:
        b = current_burden(db, p.id)
        open_task = db.query(PaybackTask).filter(
            PaybackTask.personnel_id == p.id,
            PaybackTask.status.in_(["open", "scheduled"])
        ).first()
        entries.append({
            "personnel_id": p.id,
            "name": p.name,
            "rank": p.rank,
            "trade": p.trade,
            "burden_score": b,
            "burden_state": "excluded_from_replacements" if is_burden_exceeded(db, p.id) else ("elevated" if b >= settings.HELPER_BURDEN_THRESHOLD * 0.66 else "available"),
            "payback_task": None if not open_task else {
                "id": open_task.id, "status": open_task.status, "due_by": open_task.due_by.isoformat(), "action_type": open_task.action_type,
            },
        })
    entries.sort(key=lambda x: x["burden_score"], reverse=True)
    return {
        "unit_id": unit_id,
        "threshold": float(settings.HELPER_BURDEN_THRESHOLD),
        "window_days": int(settings.HELPER_BURDEN_WINDOW_DAYS),
        "helpers": entries,
        "principle": "Every welfare action has a cost bearer. PRAHARI tracks who pays and enforces payback.",
    }


def complete_payback(db: Session, task_id: str, user) -> PaybackTask:
    task = db.query(PaybackTask).filter(PaybackTask.id == task_id).first()
    if not task:
        raise ValueError("Payback task not found")
    task.status = "done"
    task.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    # Close out current open debits for the helper
    rows = db.query(HelperLoadEntry).filter(
        HelperLoadEntry.personnel_id == task.personnel_id,
        HelperLoadEntry.closed_out_at.is_(None),
    ).all()
    for r in rows:
        r.closed_out_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    log_audit(db=db, user=user, resource_type="payback_task", resource_id=task.id,
              action="HELPER_PAYBACK_COMPLETED", details={"helper": task.personnel_id})
    return task


def dismiss_payback(db: Session, task_id: str, user, reason: str) -> PaybackTask:
    task = db.query(PaybackTask).filter(PaybackTask.id == task_id).first()
    if not task:
        raise ValueError("Payback task not found")
    if not reason or not reason.strip():
        raise ValueError("Dismissing a payback task requires a reason (accountability record).")
    task.status = "dismissed"
    task.dismissed_by_user_id = getattr(user, "id", None)
    task.dismissal_reason = reason.strip()[:255]
    db.commit()
    log_audit(db=db, user=user, resource_type="payback_task", resource_id=task.id,
              action="HELPER_PAYBACK_DISMISSED", details={"helper": task.personnel_id, "reason": task.dismissal_reason})
    return task


