"""F3 â€” Post-Leave Reintegration Window.

Non-ML process automation grounded in MHA-task-force findings that CAPF suicide
risk concentrates in the days immediately after return from leave. Personnel
re-entering duty from approved leave enter a welfare-officer attention window
with day 0/7/14 checkpoints. Commanders see aggregate counts only.
"""
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from config import settings
from middleware.audit import log_audit
from models.leave import LeaveRecord
from models.grievance import GrievanceRequest
from models.personnel import Personnel
from models.reintegration import ReintegrationWindow

logger = logging.getLogger(__name__)

CHECKPOINT_DAYS = (0, 7, 14)


def _window_bounds(return_day: date) -> tuple[date, date]:
    start = return_day
    end = return_day + timedelta(days=int(settings.REINTEGRATION_WINDOW_DAYS))
    return start, end


def sync_reintegration_windows(db: Session) -> Dict[str, int]:
    """Idempotent sweep; creates/updates windows from leave records.

    Deterministic lifecycle policy:
    - Fresh production: a leave ending today or in the future opens a window.
    - Historical leaves (ended before the first sweep) never open windows.
    - Continuous operation: each sweep refreshes active windows and closes completed ones.
    - Demo: pre-seeded historical leaves are inert; only leaves whose end date
      is today/future (i.e., demo-ready sample data) surface in the queue.
    """
    created = updated = 0

    leaves = db.query(LeaveRecord).filter(
        LeaveRecord.status == "approved",
        LeaveRecord.end_date.isnot(None),
    ).all()
    for lv in leaves:
        r = _upsert_window(
            db,
            personnel_id=lv.personnel_id,
            leave_record_id=lv.id,
            leave_category=lv.leave_type,
            returned_on=lv.end_date,
        )
        created += r["created"]
        updated += r["updated"]

    approved_crisis = db.query(GrievanceRequest).filter(
        GrievanceRequest.status == "approved",
        GrievanceRequest.end_date.isnot(None),
        GrievanceRequest.request_type.in_(["leave", "family_crisis"]),
    ).all()
    for gr in approved_crisis:
        try:
            returned = datetime.strptime(gr.end_date, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            continue
        r = _upsert_window(
            db,
            personnel_id=gr.personnel_id,
            leave_record_id=gr.id,
            leave_category=gr.category,
            returned_on=returned,
        )
        created += r["created"]
        updated += r["updated"]

    # Transition overdue windows
    today = date.today()
    overdue = db.query(ReintegrationWindow).filter(
        ReintegrationWindow.status.in_(["upcoming", "active"]),
        ReintegrationWindow.window_end < today,
    ).all()
    for w in overdue:
        done_days = {cp.get("day") for cp in (w.checkpoints or [])}
        w.status = "overdue" if not done_days else "completed"
        updated += 1
    db.commit()

    # Self-heal: remove "noise" windows opened by earlier sweeps against historical
    # leaves (end date in the past, zero checkpoints, zero trooper engagement).
    # These are artifacts of seeding, not real welfare events.
    pruned = db.query(ReintegrationWindow).filter(
        ReintegrationWindow.window_end < today,
        ReintegrationWindow.status.in_(["upcoming", "active", "overdue"]),
        ReintegrationWindow.checkpoints.isnot(None),
    ).all()
    noise = [w for w in pruned if not (w.checkpoints or []) and not w.trooper_pulse]
    for w in noise:
        db.delete(w)
        updated += 1
    db.commit()
    return {"created": created, "updated": updated}


def _upsert_window(db: Session, personnel_id: str, leave_record_id: Optional[str],
                   leave_category: Optional[str], returned_on: Optional[date]) -> Dict[str, int]:
    if not personnel_id or returned_on is None:
        return {"created": 0, "updated": 0}
    person = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not person or not person.unit_id:
        return {"created": 0, "updated": 0}

    existing = db.query(ReintegrationWindow).filter(
        ReintegrationWindow.personnel_id == personnel_id,
        ReintegrationWindow.leave_record_id == leave_record_id,
    ).first()
    start, end = _window_bounds(returned_on)
    today = date.today()

    if existing:
        changed = False
        if existing.returned_on != returned_on or existing.window_end != end:
            existing.returned_on = returned_on
            existing.window_start = start
            existing.window_end = end
            changed = True
        new_status = existing.status
        if existing.status in ("upcoming", "active"):
            if end < today:
                new_status = "overdue" if not (existing.checkpoints or []) else "completed"
            elif start <= today <= end:
                new_status = "active"
        if new_status != existing.status:
            existing.status = new_status
            changed = True
        if changed:
            db.commit()
            return {"created": 0, "updated": 1}
        return {"created": 0, "updated": 0}

    # Deterministic seed/production boundary:
    #  - Historical leaves (returned in the past at first sweep) are historical records,
    #    not fresh welfare events: do NOT open a window for them.
    #  - Continuous operation: leaves ending today or later open normally.
    if returned_on < today:
        return {"created": 0, "updated": 0}

    if end < today - timedelta(days=365):
        # Historical leaves older than 1 year do not retroactively create windows
        return {"created": 0, "updated": 0}

    if start <= today <= end:
        status = "active"
    elif today < start:
        status = "upcoming"
    elif end < today - timedelta(days=int(settings.REINTEGRATION_WINDOW_DAYS)):
        # Reintegration horizon has elapsed historically; record as completed
        status = "completed"
    else:
        status = "overdue"

    w = ReintegrationWindow(
        personnel_id=personnel_id,
        unit_id=person.unit_id,
        leave_record_id=leave_record_id,
        leave_category=leave_category,
        returned_on=returned_on,
        window_start=start,
        window_end=end,
        status=status,
        checkpoints=[],
    )
    db.add(w)
    db.commit()
    try:
        from services.sync_service import sync_broadcaster
        sync_broadcaster.publish(
            "reintegration_window_opened",
            {"window_id": w.id, "unit_id": w.unit_id},
            unit_id=w.unit_id,
        )
    except Exception as e:  # pragma: no cover
        logger.debug(f"reintegration event publish skipped: {e}")
    return {"created": 1, "updated": 0}


def welfare_queue(db: Session, unit_id: Optional[str] = None) -> List[Dict[str, Any]]:
    sync_reintegration_windows(db)
    q = db.query(ReintegrationWindow).filter(
        ReintegrationWindow.status.in_(["active", "overdue"])
    )
    if unit_id:
        q = q.filter(ReintegrationWindow.unit_id == unit_id)
    rows = q.order_by(ReintegrationWindow.status.desc(), ReintegrationWindow.window_end.asc()).all()
    today = date.today()
    out = []
    for w in rows:
        person = db.query(Personnel).filter(Personnel.id == w.personnel_id).first()
        done_days = {cp.get("day") for cp in (w.checkpoints or [])}
        next_due = None
        for d in CHECKPOINT_DAYS:
            due = w.returned_on + timedelta(days=d)
            if d not in done_days and due <= today:
                next_due = d
                break
        out.append({
            "window_id": w.id,
            "personnel_id": w.personnel_id,
            "trooper_name": person.name if person else None,
            "service_number": person.service_number if person else None,
            "unit_id": w.unit_id,
            "leave_category": w.leave_category,
            "returned_on": w.returned_on.isoformat(),
            "window_end": w.window_end.isoformat(),
            "status": w.status,
            "checkpoints": w.checkpoints or [],
            "next_checkpoint_due_day": next_due,
            "trooper_pulse": w.trooper_pulse,
        })
    return out


def record_checkpoint(db: Session, window_id: str, day: int, user, note_summary: Optional[str]) -> Dict[str, Any]:
    w = db.query(ReintegrationWindow).filter(ReintegrationWindow.id == window_id).first()
    if not w:
        raise ValueError("Reintegration window not found")
    if day not in CHECKPOINT_DAYS:
        raise ValueError(f"Checkpoint day must be one of {CHECKPOINT_DAYS}")
    cps = list(w.checkpoints or [])
    if any(cp.get("day") == day for cp in cps):
        raise ValueError(f"Day-{day} checkpoint already recorded")
    cps.append({
        "day": day,
        "completed_at": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(),
        "completed_by_user_id": getattr(user, "id", None),
        "note_summary": (note_summary or "")[:200],
    })
    w.checkpoints = cps
    done = {cp["day"] for cp in cps}
    if all(d in done for d in CHECKPOINT_DAYS):
        w.status = "completed"
    db.commit()
    log_audit(db=db, user=user, resource_type="reintegration_window", resource_id=w.id,
              action="REINTEGRATION_CHECKPOINT", details={"day": day, "personnel_id": w.personnel_id})
    return {"window_id": w.id, "status": w.status, "checkpoints": w.checkpoints}


def commander_aggregate(db: Session, unit_id: str) -> Dict[str, Any]:
    """Commander-safe visibility: counts only. No names, no content."""
    sync_reintegration_windows(db)
    rows = db.query(ReintegrationWindow).filter(ReintegrationWindow.unit_id == unit_id).all()
    return {
        "unit_id": unit_id,
        "reintegration_supports_in_progress": sum(1 for r in rows if r.status in ("active", "overdue")),
        "overdue_count": sum(1 for r in rows if r.status == "overdue"),
        "completed_last_90d": sum(
            1 for r in rows if r.status == "completed" and r.window_end >= (date.today() - timedelta(days=90))
        ),
        "visibility_note": "Counts only. Trooper identity and welfare content remain confidential under MHCA 2017 Â§21.",
    }


def record_trooper_pulse(db: Session, personnel_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Voluntary trooper re-entry pulse. Never required; never gates help access."""
    w = db.query(ReintegrationWindow).filter(
        ReintegrationWindow.personnel_id == personnel_id,
        ReintegrationWindow.status == "active",
    ).order_by(ReintegrationWindow.window_end.desc()).first()
    if not w:
        return {"recorded": False, "reason": "No active reintegration window for this user."}
    pulse = {
        "family_time_rating": payload.get("family_time_rating"),
        "settled_back_rating": payload.get("settled_back_rating"),
        "free_text": (payload.get("free_text") or "")[:300],
        "submitted_at": datetime.now(timezone.utc).replace(tzinfo=None).isoformat(),
    }
    w.trooper_pulse = pulse
    db.commit()
    return {"recorded": True, "window_id": w.id}


