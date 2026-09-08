import math
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.welfare_case import WelfareCase, SLAEscalation
from models.personnel import Personnel, Unit
from models.prediction import RiskPrediction
from models.buddy_signal import BuddySignal
from ml.feature_engineering import build_feature_vector
from ml.predict import predict_batch, DISPLAY_NAME_MAP

def to_naive(dt):
    if dt is None:
        return None
    return dt.replace(tzinfo=None) if hasattr(dt, "tzinfo") and dt.tzinfo is not None else dt

def get_welfare_cases(
    db: Session,
    status_filters: Optional[List[str]] = None,
    page: int = 1,
    per_page: int = 20
) -> Dict[str, Any]:
    query = db.query(WelfareCase)
    if status_filters:
        query = query.filter(WelfareCase.status.in_(status_filters))

    total = query.count()
    cases = query.order_by(WelfareCase.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    items = []
    for c in cases:
        p = c.personnel
        u = p.unit if p else None

        # Calculate remaining hours to acknowledge deadline
        hours_left = 0.0
        if c.sla_acknowledge_deadline:
            dl = to_naive(c.sla_acknowledge_deadline)
            delta = (dl - now).total_seconds() / 3600.0
            hours_left = round(max(0.0, delta), 1)

        pred = c.trigger_prediction
        r_score = float(pred.risk_score) if pred and pred.risk_score is not None else (0.85 if c.risk_level_at_creation == "red" else 0.65)

        items.append({
            "id": c.id,
            "personnel_id": p.id if p else "",
            "personnel_name": p.name if p else "Unknown",
            "personnel_rank": p.rank if p else "Constable",
            "unit_name": u.name if u else "Unit",
            "risk_level": c.risk_level_at_creation,
            "risk_score": round(r_score, 4),
            "triggered_by": c.triggered_by,
            "status": c.status,
            "created_at": c.created_at,
            "sla_acknowledge_deadline": c.sla_acknowledge_deadline,
            "sla_plan_deadline": c.sla_plan_deadline,
            "sla_breached": c.sla_breached,
            "hours_until_ack_deadline": hours_left,
            "escalation_level": c.escalation_level
        })

    return {"total": total, "page": page, "cases": items}

def get_welfare_case_detail(db: Session, case_id: str) -> Optional[Dict[str, Any]]:
    c = db.query(WelfareCase).filter(WelfareCase.id == case_id).first()
    if not c:
        return None

    p = c.personnel
    u = p.unit if p else None

    # Latest risk prediction
    pred = db.query(RiskPrediction).filter(
        RiskPrediction.personnel_id == p.id
    ).order_by(RiskPrediction.predicted_at.desc()).first()

    pred_summary = None
    if pred:
        shap_factors = []
        for factor in (pred.shap_values or []):
            feat = factor.get("feature", "")
            shap_factors.append({
                "feature": feat,
                "display_name": DISPLAY_NAME_MAP.get(feat, feat),
                "value": factor.get("value"),
                "impact": factor.get("impact", 0.0)
            })

        pred_summary = {
            "risk_score": float(pred.risk_score),
            "risk_level": pred.risk_level,
            "confidence": float(pred.confidence_score),
            "data_quality": float(pred.data_quality_score),
            "shap_top_factors": shap_factors
        }

    # Buddy signals for this personnel's unit in current month
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    buddy_count = db.query(BuddySignal).filter(
        BuddySignal.unit_id == p.unit_id,
        BuddySignal.submitted_at >= (now - timedelta(days=30))
    ).count()

    # Escalations
    escalations = [
        {
            "from_level": e.from_level,
            "to_level": e.to_level,
            "reason": e.reason,
            "escalated_at": e.escalated_at
        }
        for e in c.escalations
    ]

    hours_left = 0.0
    if c.sla_acknowledge_deadline:
        dl = to_naive(c.sla_acknowledge_deadline)
        delta = (dl - now).total_seconds() / 3600.0
        hours_left = round(max(0.0, delta), 1)

    return {
        "id": c.id,
        "personnel": {
            "id": p.id,
            "name": p.name,
            "rank": p.rank,
            "service_number": p.service_number,
            "unit_name": u.name if u else "Unit",
            "hard_area_months": p.hard_area_months,
            "total_transfers": p.total_transfers,
            "current_posting_date": str(p.current_posting_date)
        },
        "triggered_by": c.triggered_by,
        "risk_level_at_creation": c.risk_level_at_creation,
        "status": c.status,
        "created_at": c.created_at,
        "acknowledged_at": c.acknowledged_at,
        "plan_created_at": c.plan_created_at,
        "resolved_at": c.resolved_at,
        "sla_acknowledge_deadline": c.sla_acknowledge_deadline,
        "sla_plan_deadline": c.sla_plan_deadline,
        "sla_breached": c.sla_breached,
        "hours_until_ack_deadline": hours_left,
        "escalation_level": c.escalation_level,
        "intervention_type": c.intervention_type,
        "intervention_notes": c.intervention_notes,
        "outcome_notes": c.outcome_notes,
        "latest_prediction": pred_summary,
        "buddy_signals_this_month": buddy_count,
        "escalation_history": escalations
    }

def simulate_what_if(db: Session, personnel_id: str, scenario: dict) -> dict:
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise ValueError("Personnel not found")

    # 1. Fetch soldier's actual recorded baseline risk prediction from DB
    latest_pred = db.query(RiskPrediction).filter(
        RiskPrediction.personnel_id == personnel_id
    ).order_by(RiskPrediction.predicted_at.desc()).first()

    base_features = build_feature_vector(personnel, db)

    if latest_pred:
        cur_score = float(latest_pred.risk_score)
        cur_level = latest_pred.risk_level
    else:
        raw_pred = predict_batch([base_features])[0]
        cur_score = float(raw_pred["risk_score"])
        cur_level = raw_pred["risk_level"]

    changed_factors = []

    # 2. Shift type modification (circadian circadian relief)
    shift_type = scenario.get("shift_type", "current")
    r_shift = 0.0
    if shift_type == "day":
        night_density = float(base_features.get("night_shift_density_14d", 4.0))
        r_shift = min(0.22, max(0.12, 0.16 * (night_density / 6.0)))
        changed_factors.append({
            "feature": "night_shift_density_14d",
            "display_name": "Night Shift Fatigue",
            "from": f"{int(night_density)} shifts (14d)",
            "to": "0 (Pure Day Watch)"
        })
    elif shift_type == "split":
        r_shift = 0.08
        changed_factors.append({
            "feature": "night_shift_density_14d",
            "display_name": "Shift Intermittency",
            "from": "Current Pattern",
            "to": "Split Rotation (-8% burden)"
        })

    # 3. Add rest days (sleep debt restoration & acute stress dissipation)
    rest_days = int(scenario.get("add_rest_days", 0))
    r_rest = 0.0
    if rest_days > 0:
        # Asymptotic diminishing returns curve for rest days
        r_rest = 0.38 * (1.0 - math.exp(-0.18 * rest_days))
        avg_hrs = float(base_features.get("avg_hours_per_day_14d", 9.0))
        new_hrs = round(max(0.0, avg_hrs * (1.0 - (rest_days / 14.0))), 1)
        changed_factors.append({
            "feature": "avg_hours_per_day_14d",
            "display_name": f"Rest & Sleep Recovery (+{rest_days} days)",
            "from": f"{avg_hrs}h / day",
            "to": f"{new_hrs}h / day"
        })

    # 4. Transfer to peace / semi-hard (theater hazard de-escalation)
    target_area = scenario.get("transfer_to_area", "none")
    r_area = 0.0
    if target_area == "peace":
        r_area = 0.20
        changed_factors.append({
            "feature": "area_type_encoded",
            "display_name": "Hazard Grid Neutralization",
            "from": "Hard Operational Theater",
            "to": "Peace Station (HQ / Reserve)"
        })
    elif target_area == "semi-hard":
        r_area = 0.10
        changed_factors.append({
            "feature": "area_type_encoded",
            "display_name": "Hazard De-escalation",
            "from": "High-Altitude Hard Zone",
            "to": "Semi-Hard Deployment"
        })

    # 5. Approve pending emergency leaves (domestic & psychosocial relief)
    r_leave = 0.0
    if scenario.get("approve_pending_leave"):
        denial_rate = float(base_features.get("leave_denial_rate_6m", 0.5))
        r_leave = min(0.18, max(0.10, 0.15 * (denial_rate + 0.3)))
        changed_factors.append({
            "feature": "leave_denial_rate_6m",
            "display_name": "Emergency Leave Backlog",
            "from": f"{int(denial_rate * 100)}% Denial Frequency",
            "to": "Approved & Cleared"
        })

    # 6. Synergistic Multiplicative Risk Retention
    retention = (1.0 - r_shift) * (1.0 - r_rest) * (1.0 - r_area) * (1.0 - r_leave)
    proj_score = max(0.04, round(cur_score * retention, 4))

    # Determine projected risk level
    if proj_score < 0.25:
        proj_level = "green"
    elif proj_score < 0.50:
        proj_level = "yellow"
    elif proj_score < 0.75:
        proj_level = "orange"
    else:
        proj_level = "red"

    risk_reduction = round(max(0.0, cur_score - proj_score), 4)
    reduction_pct = round((risk_reduction / cur_score) * 100.0, 1) if cur_score > 0 else 0.0

    return {
        "current": {
            "risk_score": cur_score,
            "risk_level": cur_level
        },
        "projected": {
            "risk_score": proj_score,
            "risk_level": proj_level
        },
        "risk_reduction": risk_reduction,
        "risk_reduction_pct": reduction_pct,
        "scenario_applied": scenario,
        "key_factors_changed": changed_factors
    }
