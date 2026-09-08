import numpy as np
import pandas as pd
from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.personnel import Personnel
from models.leave import LeaveRecord
from models.duty_roster import DutyRoster
from models.assessment import SelfAssessment
from models.buddy_signal import BuddySignal

FEATURE_COLUMNS = [
    # HR / Administrative (always available)
    "hard_area_months",
    "total_transfers",
    "months_at_current_posting",
    "leave_denial_rate_6m",
    "leave_applications_30d",
    "consecutive_duty_days",
    "night_shift_density_14d",
    "avg_hours_per_day_14d",
    "area_type_encoded",
    "rank_encoded",

    # Self-Assessment (optional/voluntary)
    "sleep_quality_avg_7d",
    "sleep_quality_avg_14d",
    "sleep_quality_trend",
    "sleep_hours_avg_7d",
    "mood_score_avg_7d",
    "mood_score_avg_14d",
    "mood_score_trend",
    "energy_level_avg_7d",
    "stress_level_avg_7d",
    "stress_level_avg_14d",
    "stress_level_trend",
    "appetite_score_avg_7d",
    "social_connection_avg_7d",
    "assessment_compliance_14d",

    # Buddy Check (unit-level environmental signal)
    "unit_buddy_signals_4w",
    "unit_buddy_avg_concern",
]

RANK_MAP = {
    "Constable": 0,
    "Head Constable": 1,
    "ASI": 2,
    "SI": 3,
    "Inspector": 4,
    "DySP": 5
}

AREA_MAP = {
    "peace": 0,
    "semi-hard": 1,
    "hard": 2
}

def calculate_linear_trend(values: list) -> float:
    """Calculates linear slope of a sequence of numerical values."""
    if len(values) < 2:
        return 0.0
    x = np.arange(len(values))
    y = np.array(values, dtype=float)
    if np.all(y == y[0]):
        return 0.0
    slope, _ = np.polyfit(x, y, 1)
    return float(slope)

def build_feature_vector(personnel: Personnel, db: Session, as_of_date: date = None) -> dict:
    """
    Constructs a complete 26-element feature dictionary for a personnel member
    evaluating their operational strain as of `as_of_date` (defaults to today).
    """
    if as_of_date is None:
        as_of_date = date.today()

    today_dt = datetime.combine(as_of_date, datetime.max.time())
    d14_ago = as_of_date - timedelta(days=14)
    d30_ago = as_of_date - timedelta(days=30)
    m6_ago = as_of_date - timedelta(days=180)
    w4_ago = as_of_date - timedelta(days=28)

    # 1. Administrative Features
    hard_area_months = personnel.hard_area_months or 0
    total_transfers = personnel.total_transfers or 0

    if personnel.current_posting_date:
        months_posting = max(0, int((as_of_date - personnel.current_posting_date).days / 30))
    else:
        months_posting = 0

    area_encoded = AREA_MAP.get(personnel.unit.operational_area if personnel.unit else "hard", 2)
    rank_encoded = RANK_MAP.get(personnel.rank, 0)

    # Leave statistics
    recent_leaves = db.query(LeaveRecord).filter(
        LeaveRecord.personnel_id == personnel.id,
        LeaveRecord.applied_date >= m6_ago,
        LeaveRecord.applied_date <= as_of_date
    ).all()

    total_applied = len(recent_leaves)
    total_denied = sum(1 for l in recent_leaves if l.status == "denied")
    leave_denial_rate = (total_denied / total_applied) if total_applied > 0 else 0.0

    leave_30d = sum(1 for l in recent_leaves if l.applied_date >= d30_ago)

    # Duty roster statistics (trailing 14 days)
    recent_shifts = db.query(DutyRoster).filter(
        DutyRoster.personnel_id == personnel.id,
        DutyRoster.date >= d14_ago,
        DutyRoster.date <= as_of_date
    ).order_by(DutyRoster.date.asc()).all()

    night_shifts = sum(1 for s in recent_shifts if s.shift_type == "night")
    total_hours = sum(float(s.hours) for s in recent_shifts)
    avg_hours = (total_hours / 14.0) if recent_shifts else 0.0

    # Consecutive duty days calculation
    all_shifts = db.query(DutyRoster).filter(
        DutyRoster.personnel_id == personnel.id,
        DutyRoster.date <= as_of_date
    ).order_by(DutyRoster.date.desc()).limit(30).all()

    consecutive_days = 0
    for s in all_shifts:
        if s.shift_type == "off" or s.duty_type == "rest":
            break
        consecutive_days += 1

    # 2. Self-Assessment Features
    d14_start = datetime.combine(d14_ago, datetime.min.time())
    assessments_14d = db.query(SelfAssessment).filter(
        SelfAssessment.personnel_id == personnel.id,
        SelfAssessment.assessed_at >= d14_start,
        SelfAssessment.assessed_at <= today_dt
    ).order_by(SelfAssessment.assessed_at.asc()).all()

    d7_start = datetime.combine(as_of_date - timedelta(days=7), datetime.min.time())
    def _dt_val(val):
        return val.replace(tzinfo=None) if hasattr(val, "tzinfo") and val.tzinfo is not None else val

    assessments_7d = [a for a in assessments_14d if _dt_val(a.assessed_at) >= d7_start]

    compliance_14d = len(assessments_14d) / 14.0

    if assessments_14d:
        sq_14 = [a.sleep_quality for a in assessments_14d]
        mood_14 = [a.mood_score for a in assessments_14d]
        stress_14 = [a.stress_level for a in assessments_14d]

        sleep_quality_avg_14d = float(np.mean(sq_14))
        mood_score_avg_14d = float(np.mean(mood_14))
        stress_level_avg_14d = float(np.mean(stress_14))

        sleep_quality_trend = calculate_linear_trend(sq_14)
        mood_score_trend = calculate_linear_trend(mood_14)
        stress_level_trend = calculate_linear_trend(stress_14)
    else:
        sleep_quality_avg_14d = np.nan
        mood_score_avg_14d = np.nan
        stress_level_avg_14d = np.nan
        sleep_quality_trend = np.nan
        mood_score_trend = np.nan
        stress_level_trend = np.nan

    if assessments_7d:
        sleep_quality_avg_7d = float(np.mean([a.sleep_quality for a in assessments_7d]))
        sleep_hours_avg_7d = float(np.mean([float(a.sleep_hours) for a in assessments_7d]))
        mood_score_avg_7d = float(np.mean([a.mood_score for a in assessments_7d]))
        energy_level_avg_7d = float(np.mean([a.energy_level for a in assessments_7d]))
        stress_level_avg_7d = float(np.mean([a.stress_level for a in assessments_7d]))
        appetite_score_avg_7d = float(np.mean([a.appetite_score for a in assessments_7d]))
        social_connection_avg_7d = float(np.mean([a.social_connection for a in assessments_7d]))
    else:
        sleep_quality_avg_7d = np.nan
        sleep_hours_avg_7d = np.nan
        mood_score_avg_7d = np.nan
        energy_level_avg_7d = np.nan
        stress_level_avg_7d = np.nan
        appetite_score_avg_7d = np.nan
        social_connection_avg_7d = np.nan

    # 3. Buddy Check Features
    w4_dt = datetime.combine(w4_ago, datetime.min.time())
    buddy_signals = db.query(BuddySignal).filter(
        BuddySignal.unit_id == personnel.unit_id,
        BuddySignal.submitted_at >= w4_dt
    ).all()

    unit_buddy_count = len(buddy_signals)
    unit_buddy_avg = float(np.mean([b.concern_level for b in buddy_signals])) if buddy_signals else 0.0

    features = {
        "hard_area_months": float(hard_area_months),
        "total_transfers": float(total_transfers),
        "months_at_current_posting": float(months_posting),
        "leave_denial_rate_6m": float(leave_denial_rate),
        "leave_applications_30d": float(leave_30d),
        "consecutive_duty_days": float(consecutive_days),
        "night_shift_density_14d": float(night_shifts),
        "avg_hours_per_day_14d": float(avg_hours),
        "area_type_encoded": float(area_encoded),
        "rank_encoded": float(rank_encoded),
        "sleep_quality_avg_7d": sleep_quality_avg_7d,
        "sleep_quality_avg_14d": sleep_quality_avg_14d,
        "sleep_quality_trend": sleep_quality_trend,
        "sleep_hours_avg_7d": sleep_hours_avg_7d,
        "mood_score_avg_7d": mood_score_avg_7d,
        "mood_score_avg_14d": mood_score_avg_14d,
        "mood_score_trend": mood_score_trend,
        "energy_level_avg_7d": energy_level_avg_7d,
        "stress_level_avg_7d": stress_level_avg_7d,
        "stress_level_avg_14d": stress_level_avg_14d,
        "stress_level_trend": stress_level_trend,
        "appetite_score_avg_7d": appetite_score_avg_7d,
        "social_connection_avg_7d": social_connection_avg_7d,
        "assessment_compliance_14d": float(compliance_14d),
        "unit_buddy_signals_4w": float(unit_buddy_count),
        "unit_buddy_avg_concern": float(unit_buddy_avg),
    }

    return features
