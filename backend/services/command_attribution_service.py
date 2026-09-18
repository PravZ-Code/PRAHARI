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
from models.grievance import GrievanceRequest


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


def compute_unit_welfare_debt(db: Session, unit_id: str) -> Dict[str, Any]:
    """
    Section 31: Welfare Debt.
    A PRAHARI concept representing accumulated unresolved welfare pressure,
    not a medical score.
    Combines:
    - Delayed welfare requests & unresolved grievances (35%)
    - Rest deficit & repeated workload overload (35%)
    - Depleted welfare reserve & deferred recovery interventions (30%)
    """
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise ValueError(f"Unit {unit_id} not found")

    personnel_list = db.query(Personnel).filter(Personnel.unit_id == unit_id).all()
    p_ids = [p.id for p in personnel_list]

    if not p_ids:
        return {
            "unit_id": unit_id,
            "unit_name": unit.name,
            "welfare_debt_score": 0.0,
            "welfare_debt_level": "LOW",
            "primary_contributors": ["No active personnel assigned to unit."],
            "simple_verdict": "No welfare debt data available."
        }

    # 1. Unresolved Grievances & SLA Breaches (35% weight)
    grievances = db.query(GrievanceRequest).filter(GrievanceRequest.personnel_id.in_(p_ids)).all()
    tot_g = len(grievances)
    unresolved_g = [g for g in grievances if g.status not in ("resolved", "approved")]
    breached_g = [g for g in grievances if g.sla_breached]
    family_crises_pending = [
        g for g in unresolved_g
        if (g.category or "").lower() in ("family_emergency", "bereavement", "family_crisis", "acute_domestic_crisis")
    ]

    if tot_g > 0:
        raw_g_score = ((len(unresolved_g) * 1.5) + (len(breached_g) * 3.0) + (len(family_crises_pending) * 4.0)) / max(1, tot_g * 1.5)
        grievance_component = min(100.0, raw_g_score * 100.0)
    else:
        grievance_component = 15.0

    # 2. Rest Deficit & Duty Overload (35% weight)
    # Consecutive night duties and long streaks
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    cutoff_30d = (now - timedelta(days=30)).date()
    night_shifts = db.query(
        DutyRoster.personnel_id,
        func.count(DutyRoster.id).label("cnt")
    ).filter(
        DutyRoster.unit_id == unit_id,
        DutyRoster.date >= cutoff_30d,
        DutyRoster.shift_type == "night"
    ).group_by(DutyRoster.personnel_id).all()
    night_counts = [r[1] for r in night_shifts]
    high_night_troopers = sum(1 for c in night_counts if c >= 8)

    # Consecutive days without rest (true calendar-consecutive streaks)
    rosters_30d = db.query(DutyRoster.personnel_id, DutyRoster.date).filter(
        DutyRoster.unit_id == unit_id,
        DutyRoster.date >= cutoff_30d,
        DutyRoster.shift_type != "off",
        DutyRoster.duty_type != "rest"
    ).order_by(DutyRoster.personnel_id, DutyRoster.date.asc()).all()
    duty_dates_by_p: Dict[str, list] = {}
    for pid, d_date in rosters_30d:
        duty_dates_by_p.setdefault(pid, []).append(d_date)

    streaks_exceeded = 0
    for pid, dlist in duty_dates_by_p.items():
        sorted_dates = sorted(set(dlist))
        cur_streak = 1
        max_streak = 1 if sorted_dates else 0
        for idx in range(1, len(sorted_dates)):
            if (sorted_dates[idx] - sorted_dates[idx - 1]).days == 1:
                cur_streak += 1
                max_streak = max(max_streak, cur_streak)
            else:
                cur_streak = 1
        if max_streak >= 10:
            streaks_exceeded += 1

    rest_component = min(100.0, (streaks_exceeded * 12.0) + (high_night_troopers * 8.0) + 15.0)

    # 3. Reserve Depletion & Deferred Interventions (30% weight)
    from services.welfare_resilience_service import compute_welfare_reserve
    reserve_data = compute_welfare_reserve(db, unit_id)
    reserve_pct = reserve_data.get("reserve_percentage", 25.0)

    if reserve_pct < 15.0:
        reserve_component = 85.0
    elif reserve_pct < 25.0:
        reserve_component = 55.0
    elif reserve_pct < 35.0:
        reserve_component = 35.0
    else:
        reserve_component = 12.0

    # Composite Score
    welfare_debt_score = round(
        (0.35 * grievance_component) + (0.35 * rest_component) + (0.30 * reserve_component),
        1
    )

    if welfare_debt_score < 30.0:
        welfare_debt_level = "LOW"
    elif welfare_debt_score < 60.0:
        welfare_debt_level = "MODERATE"
    elif welfare_debt_score < 80.0:
        welfare_debt_level = "HIGH"
    else:
        welfare_debt_level = "CRITICAL"

    # Primary Contributors (Section 31 specification format)
    contributors = []
    if family_crises_pending:
        contributors.append(f"unresolved family request ({len(family_crises_pending)} active)")
    if streaks_exceeded > 0 or high_night_troopers > 0:
        contributors.append(f"repeated rest deficit ({streaks_exceeded} extended streaks, {high_night_troopers} high night shifts)")
    if len(breached_g) > 0:
        contributors.append(f"repeated unresolved grievance ({len(breached_g)} SLA breached)")
    if reserve_pct < 20.0:
        contributors.append(f"deferred recovery intervention (welfare reserve low at {reserve_pct}%)")

    if not contributors:
        contributors.append("Normal operational rotation, minimal welfare accumulation")

    return {
        "unit_id": unit_id,
        "unit_name": unit.name,
        "welfare_debt_score": welfare_debt_score,
        "welfare_debt_level": welfare_debt_level,
        "primary_contributors": contributors,
        "component_breakdown": {
            "unresolved_grievance_pressure": round(grievance_component, 1),
            "rest_deficit_pressure": round(rest_component, 1),
            "reserve_depletion_pressure": round(reserve_component, 1)
        },
        "metrics_summary": {
            "pending_grievances": len(unresolved_g),
            "sla_breaches": len(breached_g),
            "pending_family_crises": len(family_crises_pending),
            "troopers_with_duty_streaks": streaks_exceeded,
            "welfare_reserve_percentage": reserve_pct
        },
        "non_punitive_disclaimer": (
            "Welfare Debt measures administrative backlog and systemic workload friction, "
            "never individual soldier capability or disciplinary standing."
        ),
        "simple_verdict": (
            f"Welfare Debt is {welfare_debt_level} ({welfare_debt_score}/100). "
            f"Primary friction: {', '.join(contributors[:2])}."
        )
    }

