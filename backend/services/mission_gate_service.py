"""F2 — Mission Risk Budget sign-off gate.

A documentation aid, never a veto: when a unit tasking fails the configured
welfare readiness budget, a Welfare Impact Assessment is generated and must be
acknowledged ('remediate' or 'accept_risk' with mandatory note) before the
tasking is recorded. The signed content hash is chained into the audit ledger,
so risk acceptance is provable later ('we knew and proceeded').
"""
import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from config import settings
from middleware.audit import log_audit
from models.grievance import GrievanceRequest
from models.mission_gate import MissionGateAssessment
from models.personnel import Personnel
from services.command_attribution_service import compute_structural_stress_attribution
from services.welfare_resilience_service import compute_welfare_reserve

logger = logging.getLogger(__name__)


def _assessment_hash(a: MissionGateAssessment) -> str:
    payload = {
        "id": a.id,
        "unit_id": a.unit_id,
        "tasking_ref": a.tasking_ref,
        "budget_passed": a.budget_passed,
        "metrics_snapshot": a.metrics_snapshot,
        "thresholds": a.budget_thresholds,
        "status": a.status,
        "signed_by_user_id": a.signed_by_user_id,
        "signed_at": a.signed_at.isoformat() if a.signed_at else None,
        "note": a.acknowledged_note,
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()


def evaluate_tasking(db: Session, unit_id: str, tasking_ref: str, actor_user=None) -> Dict[str, Any]:
    reserve = compute_welfare_reserve(db, unit_id)
    ssai = compute_structural_stress_attribution(db, unit_id)
    # GrievanceRequest has no unit_id; scope family-crisis counts via unit membership
    member_ids = [p[0] for p in db.query(Personnel.id).filter(Personnel.unit_id == unit_id).all()]
    open_crisis = (
        db.query(GrievanceRequest).filter(
            GrievanceRequest.personnel_id.in_(member_ids),
            GrievanceRequest.request_type == "family_crisis",
            GrievanceRequest.status.in_(["filed", "fast_tracked", "escalated"]),
        ).count()
        if member_ids else 0
    )

    reserve_pct = float(reserve.get("welfare_reserve_percentage", 0.0) or 0.0)
    ssai_score = float(ssai.get("structural_stress_attribution_index", 1.0) or 1.0)

    thresholds = {
        "min_reserve_pct": float(settings.MISSION_MIN_RESERVE_PCT),
        "max_ssai": float(settings.MISSION_MAX_SSAI),
        "max_open_family_crisis": int(settings.MISSION_MAX_OPEN_CRISIS),
    }
    failures: List[str] = []
    if reserve_pct < thresholds["min_reserve_pct"]:
        failures.append(f"Welfare reserve {reserve_pct:.1f}% below minimum {thresholds['min_reserve_pct']:.0f}%.")
    if ssai_score > thresholds["max_ssai"]:
        failures.append(f"Structural stress attribution {ssai_score:.2f} above maximum {thresholds['max_ssai']:.2f}.")
    if open_crisis > thresholds["max_open_family_crisis"]:
        failures.append(f"{open_crisis} unresolved family-crisis requests above maximum {thresholds['max_open_family_crisis']}.")
    budget_passed = not failures

    remediation: List[str] = []
    if reserve_pct < thresholds["min_reserve_pct"]:
        remediation.append("Rebalance rosters / bring in cross-company relief before accepting tasking.")
    if ssai_score > thresholds["max_ssai"]:
        remediation.append("Review leave denial pattern and night-duty concentration for this unit (command self-correction).")
    if open_crisis > thresholds["max_open_family_crisis"]:
        remediation.append("Fast-track open family-crisis leave before mobilization.")

    assessment = MissionGateAssessment(
        unit_id=unit_id,
        tasking_ref=tasking_ref[:120],
        budget_passed=budget_passed,
        metrics_snapshot={
            "reserve_pct": reserve_pct,
            "ssai": ssai_score,
            "open_family_crisis": open_crisis,
        },
        budget_thresholds=thresholds,
        remediation_suggestions=remediation,
        status="pending_ack" if not budget_passed else "risk_accepted",  # passing budgets need no sign-off
    )
    assessment.content_hash = _assessment_hash(assessment)
    db.add(assessment)
    db.commit()
    log_audit(db=db, user=actor_user, resource_type="mission_gate", resource_id=assessment.id,
              action="MISSION_GATE_EVALUATED",
              details={"unit_id": unit_id, "budget_passed": budget_passed, "failures": failures})
    try:
        from services.sync_service import sync_broadcaster
        sync_broadcaster.publish(
            "mission_gate_pending",
            {"assessment_id": assessment.id, "unit_id": unit_id, "budget_passed": budget_passed},
            unit_id=unit_id,
        )
    except Exception as e:  # pragma: no cover
        logger.debug(f"mission-gate event publish skipped: {e}")
    return {
        "assessment_id": assessment.id,
        "unit_id": unit_id,
        "tasking_ref": assessment.tasking_ref,
        "budget_passed": budget_passed,
        "failures": failures,
        "metrics": assessment.metrics_snapshot,
        "thresholds": thresholds,
        "remediation_suggestions": remediation,
        "status": assessment.status,
        "note": "PRAHARI documents welfare impact at tasking. Command authority is absolute: this gate never blocks; it creates a signed, auditable record.",
    }


def acknowledge(db: Session, assessment_id: str, user, decision: str, note: Optional[str]) -> Dict[str, Any]:
    a = db.query(MissionGateAssessment).filter(MissionGateAssessment.id == assessment_id).first()
    if not a:
        raise ValueError("Assessment not found")
    if a.status != "pending_ack":
        raise ValueError(f"Assessment already closed (status={a.status})")
    if a.budget_passed:
        raise ValueError("Budget passed; no acknowledgment is required.")
    if decision not in ("remediate", "accept_risk"):
        raise ValueError("Decision must be 'remediate' or 'accept_risk'.")
    if decision == "accept_risk" and not (note and note.strip()):
        raise ValueError("Risk acceptance requires a mandatory written justification note.")

    a.status = "remediation" if decision == "remediate" else "risk_accepted"
    a.signed_by_user_id = getattr(user, "id", None)
    a.signed_at = datetime.now(timezone.utc)
    a.acknowledged_note = note
    a.content_hash = _assessment_hash(a)
    db.commit()
    log_audit(db=db, user=user, resource_type="mission_gate", resource_id=a.id,
              action=f"MISSION_GATE_{decision.upper()}",
              details={"unit_id": a.unit_id, "content_hash": a.content_hash, "budget_passed": a.budget_passed})
    return {
        "assessment_id": a.id,
        "status": a.status,
        "signed_by_user_id": a.signed_by_user_id,
        "signed_at": a.signed_at.isoformat() if a.signed_at else None,
        "content_hash": a.content_hash,
    }


def unit_snapshot(db: Session, unit_id: str) -> Dict[str, Any]:
    rows = db.query(MissionGateAssessment).filter(
        MissionGateAssessment.unit_id == unit_id
    ).order_by(MissionGateAssessment.created_at.desc()).all()
    return {
        "unit_id": unit_id,
        "assessments": [
            {
                "id": r.id,
                "tasking_ref": r.tasking_ref,
                "budget_passed": r.budget_passed,
                "status": r.status,
                "metrics": r.metrics_snapshot,
                "signed_by_user_id": r.signed_by_user_id,
                "signed_at": r.signed_at.isoformat() if r.signed_at else None,
                "content_hash": r.content_hash,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }
