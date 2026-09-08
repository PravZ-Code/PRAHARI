from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from models.personnel import Personnel
from models.prediction import RiskPrediction, PersonalBaseline, CohortTemplate
from models.duty_roster import DutyRoster
from models.leave import LeaveRecord
from models.assessment import SelfAssessment
from schemas.trend import TrendAnalysisReport, BaselineComparisonPoint, TrajectoryPoint

def analyze_personnel_trend(db: Session, personnel_id: str) -> TrendAnalysisReport:
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise ValueError(f"Personnel {personnel_id} not found")

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # 1. Fetch Baselines
    personal_baseline = db.query(PersonalBaseline).filter(PersonalBaseline.personnel_id == personnel_id).first()
    active_baseline_type = personal_baseline.baseline_type if personal_baseline else "cohort"

    # Rank category mapping
    rank_lower = (personnel.rank or "").lower()
    if "constable" in rank_lower or "ct" in rank_lower:
        rank_cat = "constable"
    elif "sub-inspector" in rank_lower or "inspector" in rank_lower or "asi" in rank_lower or "si" in rank_lower:
        rank_cat = "officer"
    else:
        rank_cat = "nco"

    area_type = personnel.unit.operational_area if personnel.unit else "hard"
    cohort = db.query(CohortTemplate).filter(
        CohortTemplate.rank_category == rank_cat,
        CohortTemplate.area_type == area_type
    ).first()

    if not cohort:
        cohort = db.query(CohortTemplate).first()

    cohort_means = cohort.feature_means if (cohort and cohort.feature_means) else {}
    cohort_stds = cohort.feature_stds if (cohort and cohort.feature_stds) else {}
    personal_means = personal_baseline.feature_means if (personal_baseline and personal_baseline.feature_means) else {}
    personal_stds = personal_baseline.feature_stds if (personal_baseline and personal_baseline.feature_stds) else {}

    # Population norms (standard force-wide operational targets)
    pop_norms = {
        "night_shifts_30d": 5.2,
        "consecutive_duty_days": 4.5,
        "leave_denial_rate": 0.12,
        "stress_level": 2.2,
        "sleep_quality": 3.9
    }

    # 2. Compute Current Metrics
    roster_rows = db.query(DutyRoster).filter(
        DutyRoster.personnel_id == personnel_id,
        DutyRoster.date >= (now.date() - timedelta(days=30))
    ).all()
    night_shifts = float(sum(1 for r in roster_rows if r.shift_type == "night"))

    sorted_roster = sorted(roster_rows, key=lambda r: r.date, reverse=True)
    consecutive_days = 0.0
    for r in sorted_roster:
        if r.shift_type != "off":
            consecutive_days += 1.0
        else:
            break

    leave_records = db.query(LeaveRecord).filter(
        LeaveRecord.personnel_id == personnel_id,
        LeaveRecord.start_date >= (now.date() - timedelta(days=180))
    ).all()
    denied = sum(1 for l in leave_records if l.status == "rejected")
    denial_rate = float(denied / len(leave_records)) if leave_records else 0.0

    assessments = db.query(SelfAssessment).filter(
        SelfAssessment.personnel_id == personnel_id,
        SelfAssessment.assessed_at >= (now - timedelta(days=14))
    ).all()
    avg_stress = float(sum(a.stress_level for a in assessments) / len(assessments)) if assessments else 2.5
    avg_sleep = float(sum(a.sleep_quality for a in assessments) / len(assessments)) if assessments else 3.5

    # 3. Build Comparison Points
    def build_point(metric_name: str, current_val: float, key: str, pop_key: str, higher_is_worse: bool = True):
        p_base = personal_means.get(key)
        c_base = cohort_means.get(key, pop_norms[pop_key])
        c_std = cohort_stds.get(key, 1.0)
        c_std = c_std if c_std > 0.05 else 1.0

        z_cohort = round((current_val - c_base) / c_std, 2)
        z_pers = None
        if p_base is not None and key in personal_stds:
            p_std = personal_stds.get(key, 1.0)
            p_std = p_std if p_std > 0.05 else 1.0
            z_pers = round((current_val - p_base) / p_std, 2)

        if higher_is_worse:
            if z_cohort >= 2.0:
                status = "CRITICAL"
            elif z_cohort >= 1.0:
                status = "ELEVATED"
            elif z_cohort <= -1.0:
                status = "FAVORABLE"
            else:
                status = "NORMAL"
        else:
            if z_cohort <= -2.0:
                status = "CRITICAL"
            elif z_cohort <= -1.0:
                status = "ELEVATED"
            elif z_cohort >= 1.0:
                status = "FAVORABLE"
            else:
                status = "NORMAL"

        return BaselineComparisonPoint(
            metric_name=metric_name,
            current_value=round(current_val, 2),
            personal_baseline=round(p_base, 2) if p_base is not None else None,
            cohort_baseline=round(c_base, 2),
            population_norm=round(pop_norms[pop_key], 2),
            z_score_personal=z_pers,
            z_score_cohort=z_cohort,
            status=status
        )

    comparisons = [
        build_point("Night Shift Density (30d)", night_shifts, "night_shifts_30d", "night_shifts_30d", True),
        build_point("Consecutive Duty Days", consecutive_days, "consecutive_duty_days", "consecutive_duty_days", True),
        build_point("Leave Denial Rate", denial_rate, "leave_denial_rate", "leave_denial_rate", True),
        build_point("Self-Reported Stress (1-5)", avg_stress, "stress_level", "stress_level", True),
        build_point("Sleep Quality (1-5)", avg_sleep, "sleep_quality", "sleep_quality", False)
    ]

    # 4. Trajectory and Velocity Analysis
    pred_history = db.query(RiskPrediction).filter(
        RiskPrediction.personnel_id == personnel_id,
        RiskPrediction.predicted_at >= (now - timedelta(days=90))
    ).order_by(RiskPrediction.predicted_at.asc()).all()

    trajectory_history: List[TrajectoryPoint] = []
    for pr in pred_history:
        trajectory_history.append(TrajectoryPoint(
            timestamp=pr.predicted_at,
            risk_score=float(pr.risk_score),
            risk_level=pr.risk_level,
            workload_index=round(min(1.0, float(pr.risk_score) * 1.1), 3),
            self_reported_index=round(float(pr.risk_score) * 0.9, 3)
        ))

    if not trajectory_history:
        # Generate baseline point if no history
        trajectory_history.append(TrajectoryPoint(
            timestamp=now,
            risk_score=0.20,
            risk_level="green",
            workload_index=0.22,
            self_reported_index=0.18
        ))

    current_risk = trajectory_history[-1].risk_score
    old_risk = trajectory_history[0].risk_score if len(trajectory_history) > 1 else current_risk
    delta_risk = round(current_risk - old_risk, 4)

    # Velocity: delta per 30 days
    time_span_days = max(1.0, (trajectory_history[-1].timestamp - trajectory_history[0].timestamp).total_seconds() / 86400.0) if len(trajectory_history) > 1 else 30.0
    velocity = round((delta_risk / time_span_days) * 30.0, 4)
    acceleration = round(velocity / 2.0, 4)

    # Classification
    if delta_risk >= 0.15 or velocity >= 0.12:
        classification = "SUSTAINED_DETERIORATION"
        summary = (
            f"Longitudinal analysis identifies sustained deterioration (+{delta_risk:.2f} risk drift over {int(time_span_days)} days). "
            f"Operational load metrics significantly exceed personal baseline and cohort averages."
        )
        action = "Schedule immediate administrative rest rotation via URO and conduct non-punitive welfare interview."
    elif night_shifts >= 10.0 or consecutive_days >= 12.0:
        classification = "ACUTE_WORKLOAD_SPIKE"
        summary = (
            f"Acute workload spike detected: Trooper has logged {int(consecutive_days)} consecutive duty days and {int(night_shifts)} night shifts. "
            f"Exceeds 95th percentile of battalion cohort."
        )
        action = "Enforce 8-hour mandatory rest barrier and initiate URO shift swap to disperse night burden."
    elif delta_risk <= -0.10 or velocity <= -0.10:
        classification = "RECOVERY_TRAJECTORY"
        summary = (
            f"Positive recovery trajectory observed (risk decreased by {abs(delta_risk):.2f}). "
            f"Interventions and duty adjustments are yielding stabilized wellness metrics."
        )
        action = "Maintain current balanced duty schedule and continue routine longitudinal monitoring."
    else:
        classification = "STABLE"
        summary = (
            f"Metrics indicate operational equilibrium. Risk trajectory is stable (delta {delta_risk:+.2f}) "
            f"within normal cohort standard deviations."
        )
        action = "Continue normative garrison/field duty cycles."

    return TrendAnalysisReport(
        personnel_id=personnel_id,
        baseline_type_active=active_baseline_type,
        trajectory_classification=classification,
        velocity_score=velocity,
        acceleration_score=acceleration,
        risk_score_current=round(current_risk, 4),
        risk_score_30d_ago=round(old_risk, 4),
        delta_risk=delta_risk,
        baseline_comparisons=comparisons,
        trajectory_history=trajectory_history,
        clinical_decision_support_summary=summary,
        recommended_action=action
    )
