"""F4 — Policy-level What-If cohort simulator.

Extends the single-trooper counterfactual engine to unit-wide policy levers.
For every evaluable (non-abstained) trooper, we rebuild baseline features, apply
policy perturbations, and run ONE batched calibrated inference pass. Abstained
personnel are counted separately and never silently averaged into cohort means.
Aggregate planning aid only: never gates individual welfare access.
"""
import logging
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from config import settings
from models.grievance import GrievanceRequest
from models.personnel import Personnel
from ml.predict import predict_batch
from services.what_if_simulator_service import (
    get_personnel_baseline_features,
    synthesize_counterfactual_features,
)

logger = logging.getLogger(__name__)

_BANDS = ("green", "yellow", "orange", "red")


def _personnel_ids_with_family_crisis(db: Session, unit_personnel: List[Personnel]) -> set:
    ids = [p.id for p in unit_personnel]
    if not ids:
        return set()
    rows = db.query(GrievanceRequest.personnel_id).filter(
        GrievanceRequest.personnel_id.in_(ids),
        GrievanceRequest.request_type == "family_crisis",
        GrievanceRequest.status.in_(["filed", "fast_tracked", "escalated"]),
    ).all()
    return {r[0] for r in rows}


def simulate_policy(db: Session, unit_id: str, levers: Dict[str, Any]) -> Dict[str, Any]:
    unit_people = db.query(Personnel).filter(Personnel.unit_id == unit_id).all()
    if not unit_people:
        return {"status": "insufficient_data", "unit_id": unit_id, "note": "No personnel in unit."}

    max_consec_nights = levers.get("max_consecutive_nights")
    rest_barrier_hours = levers.get("rest_barrier_hours")
    extra_rest_days = float(levers.get("extra_rest_days_per_30d", 0.0) or 0.0)
    auto_approve_family_crisis = bool(levers.get("auto_approve_family_crisis", False))

    crisis_set = _personnel_ids_with_family_crisis(db, unit_people) if auto_approve_family_crisis else set()

    baseline_records, perturbed_records, index = [], [], []
    for p in unit_people:
        base = get_personnel_baseline_features(db, p)
        cf = synthesize_counterfactual_features(base, shift_change="none")  # no-op copy; levers applied below

        # Lever: cap consecutive nights -> reduces night density proportionally
        if max_consec_nights is not None:
            try:
                cap = float(max_consec_nights)
            except (TypeError, ValueError):
                cap = None
            if cap is not None:
                cur = float(cf.get("night_shift_density_14d", 0.0))
                cf["night_shift_density_14d"] = min(cur, cap)
                if cur > cap:
                    cf["consecutive_duty_days"] = min(float(cf.get("consecutive_duty_days", 0.0)), cap)

        # Lever: longer rest barrier -> proxy as fractional rest restoration
        if rest_barrier_hours is not None:
            try:
                barrier = float(rest_barrier_hours)
            except (TypeError, ValueError):
                barrier = 0.0
            if barrier > 8.0:
                extra = (barrier - 8.0) / 4.0  # each +4h barrier ~= one rest day over the window
                cf = synthesize_counterfactual_features(baseline=cf, shift_change="none", rest_days_added=max(0, int(round(extra))))

        # Lever: extra rest days
        if extra_rest_days > 0:
            cf = synthesize_counterfactual_features(baseline=cf, shift_change="none", rest_days_added=max(0, int(round(extra_rest_days))))

        # Lever: auto-approve family crisis leave for affected troopers
        if p.id in crisis_set:
            cf = synthesize_counterfactual_features(baseline=cf, shift_change="none", grant_leave_days=5)

        baseline_records.append(base)
        perturbed_records.append(cf)
        index.append(p.id)

    base_preds = predict_batch(baseline_records)
    cf_preds = predict_batch(perturbed_records)

    evaluable_b, evaluable_c = [], []
    n_abstained = 0
    per_person = []
    for pid, b, c in zip(index, base_preds, cf_preds):
        if b.get("abstention_flag") or c.get("abstention_flag"):
            n_abstained += 1
            per_person.append({"personnel_id": pid, "abstained": True})
            continue
        evaluable_b.append(float(b["risk_score"]))
        evaluable_c.append(float(c["risk_score"]))
        per_person.append({
            "personnel_id": pid,
            "abstained": False,
            "baseline_risk": round(float(b["risk_score"]), 4),
            "projected_risk": round(float(c["risk_score"]), 4),
            "delta": round(float(c["risk_score"]) - float(b["risk_score"]), 4),
        })

    def band_counts(preds, evaluables_flags):
        counts = {k: 0 for k in _BANDS}
        for pr, flag in zip(preds, evaluables_flags):
            if flag:
                continue
            lvl = (pr.get("risk_level") or "green").lower()
            counts[lvl if lvl in counts else "green"] += 1
        return counts

    flags = [bool(r.get("abstention_flag")) for r in base_preds]
    baseline_bands = band_counts(base_preds, flags)
    projected_bands = band_counts(cf_preds, flags)

    mean_before = round(sum(evaluable_b) / len(evaluable_b), 4) if evaluable_b else None
    mean_after = round(sum(evaluable_c) / len(evaluable_c), 4) if evaluable_c else None
    mean_delta = round((mean_after - mean_before), 4) if (mean_before is not None and mean_after is not None) else None

    # Honest cost estimate: rest levers consume coverage hours
    # Each extra rest day per trooper per 30d ≈ 8h of coverage that someone else must absorb.
    coverage_hours = round(extra_rest_days * 8.0 * len(unit_people), 1)
    estlever = levers.get("rest_barrier_hours")
    if estlever and float(estlever) > 8.0:
        coverage_hours += round(((float(estlever) - 8.0) / 4.0) * 8.0 * len(unit_people), 1)
    extra_family_leave_hours = round(5 * 8.0 * len(crisis_set), 1) if auto_approve_family_crisis else 0.0

    return {
        "status": "ok",
        "unit_id": unit_id,
        "levers": {
            "max_consecutive_nights": max_consec_nights,
            "rest_barrier_hours": rest_barrier_hours,
            "auto_approve_family_crisis": auto_approve_family_crisis,
            "extra_rest_days_per_30d": extra_rest_days,
        },
        "cohort": {
            "unit_size": len(unit_people),
            "evaluable_count": len(evaluable_b),
            "abstained_count": n_abstained,
            "abstention_note": "Abstained troopers are excluded from cohort means and reported here explicitly (insufficient evidence).",
        },
        "benefit": {
            "mean_strain_before": mean_before,
            "mean_strain_after": mean_after,
            "mean_strain_delta": mean_delta,
            "band_before": baseline_bands,
            "band_after": projected_bands,
        },
        "cost": {
            "extra_coverage_hours_per_30d": coverage_hours + extra_family_leave_hours,
            "cost_note": "Rest/leave levers consume watch-hours that must be re-covered by the unit reserve; this is the workload floor, not a net welfare 'profit'.",
        },
        "per_person_projections": per_person,
        "illustrative": True,
        "data_maturity_notice": "Projections derive from a model validated on synthetic/proxy data; treat as planning aid, not forecast.",
    }
