"""
Command Attribution Service — Structural Stress Attribution Index (SSAI).
Measures unit-level administrative scheduling and leave denial patterns against
peer units under similar operational conditions. Designed as a private, non-punitive
self-correction insight for Company Commanders.
"""

from datetime import datetime, date, timedelta, timezone
from typing import Dict, Any, List
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.personnel import Unit, Personnel
from models.leave import LeaveRecord
from models.duty_roster import DutyRoster
from models.prediction import RiskPrediction


def compute_structural_stress_attribution(db: Session, unit_id: str) -> Dict[str, Any]:
    """
    Computes the Structural Stress Attribution Index (SSAI) for a company,
    benchmarking administrative leave decisions, night shift distribution equality,
    and rest barrier adherence against peer units in matching operational areas.
    """
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise ValueError(f"Unit {unit_id} not found")

    personnel_list = db.query(Personnel).filter(Personnel.unit_id == unit_id).all()
    total_strength = len(personnel_list)
    if total_strength == 0:
        return {
            "unit_id": unit_id,
            "unit_name": unit.name,
            "operational_area": unit.operational_area,
            "attribution_score": 0.0,
            "status": "INSUFFICIENT_DATA",
            "private_commander_insight": "No active personnel found in this unit."
        }

    p_ids = [p.id for p in personnel_list]
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    cutoff_90d = (now - timedelta(days=90)).date()
    cutoff_30d = (now - timedelta(days=30)).date()

    # 1. LEAVE DENIAL PATTERN
    leaves = db.query(LeaveRecord).filter(
        LeaveRecord.personnel_id.in_(p_ids),
        LeaveRecord.applied_date >= cutoff_90d
    ).all()
    total_leaves = len(leaves)
    denied_leaves = sum(1 for l in leaves if l.status in ("rejected", "denied"))
    unit_leave_denial_rate = (denied_leaves / total_leaves) if total_leaves > 0 else 0.05

    # 2. NIGHT SHIFT DISTRIBUTION SKEW (Inequality check)
    # Count night shifts per personnel in the last 30 days
    night_counts = db.query(
        DutyRoster.personnel_id,
        func.count(DutyRoster.id).label("night_count")
    ).filter(
        DutyRoster.unit_id == unit_id,
        DutyRoster.date >= cutoff_30d,
        DutyRoster.shift_type == "night"
    ).group_by(DutyRoster.personnel_id).all()

    night_map = {row[0]: row[1] for row in night_counts}
    all_nights = [night_map.get(pid, 0) for pid in p_ids]
    total_nights = sum(all_nights)

    if total_nights > 0 and len(all_nights) > 1:
        # Sort descending to find top 20% concentration
        sorted_nights = sorted(all_nights, reverse=True)
        top_20_count = max(1, int(len(all_nights) * 0.20))
        top_20_sum = sum(sorted_nights[:top_20_count])
        night_concentration_ratio = top_20_sum / total_nights  # Expect ~0.20 if even; >0.50 if heavy skew
    else:
        night_concentration_ratio = 0.20

    # 3. REST BARRIER BREACHES (Consecutive duty streaks > 10 days without an 'off')
    streaks_exceeded = 0
    for pid in p_ids:
        rosters = db.query(DutyRoster).filter(
            DutyRoster.personnel_id == pid,
            DutyRoster.date >= cutoff_30d
        ).order_by(DutyRoster.date.desc()).all()
        current_streak = 0
        for r in rosters:
            if r.shift_type != "off":
                current_streak += 1
            else:
                break
        if current_streak >= 10:
            streaks_exceeded += 1
    streak_breach_rate = (streaks_exceeded / total_strength) if total_strength > 0 else 0.0

    # 4. PEER GROUP BASELINE (Controlling for operational hardship area)
    peer_units = db.query(Unit).filter(
        Unit.operational_area == unit.operational_area,
        Unit.id != unit_id
    ).all()

    if peer_units:
        peer_denial_rates = []
        for pu in peer_units:
            pu_pids = [p.id for p in pu.personnel]
            if not pu_pids:
                continue
            pu_leaves = db.query(LeaveRecord).filter(
                LeaveRecord.personnel_id.in_(pu_pids),
                LeaveRecord.applied_date >= cutoff_90d
            ).all()
            if pu_leaves:
                rate = sum(1 for l in pu_leaves if l.status in ("rejected", "denied")) / len(pu_leaves)
                peer_denial_rates.append(rate)
        peer_avg_denial_rate = float(np.mean(peer_denial_rates)) if peer_denial_rates else 0.15
    else:
        # Standard baseline norms by terrain
        peer_avg_denial_rate = 0.25 if unit.operational_area == "hard" else 0.12

    peer_avg_denial_rate = max(0.05, peer_avg_denial_rate)
    leave_ratio_vs_peers = round(unit_leave_denial_rate / peer_avg_denial_rate, 2)

    # 5. STRUCTURAL STRESS ATTRIBUTION INDEX (0.0 to 1.0)
    denial_factor = min(1.0, (leave_ratio_vs_peers - 0.5) / 2.5) if leave_ratio_vs_peers > 1.0 else 0.10
    skew_factor = min(1.0, max(0.0, (night_concentration_ratio - 0.25) / 0.50))
    rest_factor = min(1.0, streak_breach_rate / 0.25)

    ssai_score = round(float(
        denial_factor * 0.40 +
        skew_factor * 0.35 +
        rest_factor * 0.25
    ), 3)

    # 6. PRIVATE, RESPECTFUL SELF-CORRECTION GUIDANCE
    if ssai_score >= 0.55:
        status = "SELF_CORRECTION_RECOMMENDED"
        insight_text = (
            f"Command Practice Insight (Private to Commander): Unit leave denial rate is {leave_ratio_vs_peers:.1f}x "
            f"the battalion average for {unit.operational_area} terrain. Shift distribution indicates the top 20% of troopers "
            f"absorb {night_concentration_ratio:.0%} of all night duties. "
            f"Consider rotating night duties across other sections and reviewing pending leave requests."
        )
        recommendations = [
            f"Review leave requests: Current denial rate is {unit_leave_denial_rate:.0%} vs peer norm of {peer_avg_denial_rate:.0%}.",
            f"Broaden night shift distribution: Top section absorbs {night_concentration_ratio:.0%} of night duties.",
            f"Rotate {streaks_exceeded} troopers who have exceeded 10 consecutive duty days without a rest cycle."
        ]
        escalate_to_hq = True if ssai_score >= 0.75 else False
    else:
        status = "BALANCED_COMMAND_PRACTICE"
        insight_text = (
            f"Command Practice Insight: Unit scheduling patterns are balanced. "
            f"Leave denial rate ({unit_leave_denial_rate:.0%}) and shift distribution ({night_concentration_ratio:.0%} top-tier load) "
            f"align closely with battalion peer standards in {unit.operational_area} terrain."
        )
        recommendations = [
            "Maintain current equitable roster distribution.",
            "Continue honoring standard 8-hour rest barriers between shifts."
        ]
        escalate_to_hq = False

    return {
        "unit_id": unit_id,
        "unit_name": unit.name,
        "operational_area": unit.operational_area,
        "structural_stress_attribution_index": ssai_score,
        "status": status,
        "metrics": {
            "unit_leave_denial_rate": round(unit_leave_denial_rate, 3),
            "peer_baseline_denial_rate": round(peer_avg_denial_rate, 3),
            "leave_denial_ratio_vs_peers": leave_ratio_vs_peers,
            "night_shift_top20_concentration": round(night_concentration_ratio, 3),
            "troopers_with_consecutive_streaks_10d": streaks_exceeded
        },
        "private_commander_insight": insight_text,
        "actionable_self_correction_recommendations": recommendations,
        "battalion_oversight_escalation_required": escalate_to_hq
    }
