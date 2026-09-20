"""Outcome maturation and honest calibration measurements for deployed predictions."""

from datetime import date, datetime, timedelta, timezone
from typing import Iterable, Optional, Sequence, Tuple

import numpy as np
from sqlalchemy import or_
from sqlalchemy.orm import Session

from models.assessment import SelfAssessment
from models.duty_roster import DutyRoster
from models.leave import LeaveRecord
from models.prediction import RiskPrediction


OUTCOME_HORIZON_DAYS = 14
MIN_CALIBRATION_SAMPLE_SIZE = 30
OUTCOME_DEFINITION = "forward_14d_strain_v1"


def compute_observed_ece(
    probability_outcomes: Sequence[Tuple[float, int]], n_bins: int = 10
) -> Optional[float]:
    """Calculate ECE from matured prediction/outcome pairs, or return None when absent."""
    if not probability_outcomes:
        return None

    probabilities = np.clip(
        np.asarray([pair[0] for pair in probability_outcomes], dtype=float), 0.0, 1.0
    )
    outcomes = np.asarray([pair[1] for pair in probability_outcomes], dtype=float)
    boundaries = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0

    for index in range(n_bins):
        lower, upper = boundaries[index], boundaries[index + 1]
        mask = (probabilities >= lower) & (
            probabilities < upper if index < n_bins - 1 else probabilities <= upper
        )
        if np.any(mask):
            ece += float(np.mean(mask)) * abs(float(np.mean(outcomes[mask])) - float(np.mean(probabilities[mask])))

    return round(ece, 4)


def derive_forward_14d_outcome(db: Session, personnel_id: str, anchor_date: date) -> int:
    """Apply the documented 14-day strain definition after the observation window closes."""
    end_date = anchor_date + timedelta(days=OUTCOME_HORIZON_DAYS)
    start_dt = datetime.combine(anchor_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.min.time())
    prior_dt = start_dt - timedelta(days=OUTCOME_HORIZON_DAYS)

    future_assessments = db.query(SelfAssessment).filter(
        SelfAssessment.personnel_id == personnel_id,
        SelfAssessment.assessed_at >= start_dt,
        SelfAssessment.assessed_at < end_dt,
    ).all()
    prior_assessments = db.query(SelfAssessment).filter(
        SelfAssessment.personnel_id == personnel_id,
        SelfAssessment.assessed_at >= prior_dt,
        SelfAssessment.assessed_at < start_dt,
    ).all()
    future_shifts = db.query(DutyRoster).filter(
        DutyRoster.personnel_id == personnel_id,
        DutyRoster.date >= anchor_date,
        DutyRoster.date < end_date,
    ).all()
    future_denials = db.query(LeaveRecord).filter(
        LeaveRecord.personnel_id == personnel_id,
        LeaveRecord.applied_date >= anchor_date,
        LeaveRecord.applied_date < end_date,
        LeaveRecord.status == "denied",
    ).count()

    prior_stress = float(np.mean([item.stress_level for item in prior_assessments])) if prior_assessments else 2.5
    future_stress = float(np.mean([item.stress_level for item in future_assessments])) if future_assessments else 2.5
    future_mood = float(np.mean([item.mood_score for item in future_assessments])) if future_assessments else 3.5
    future_sleep = float(np.mean([item.sleep_quality for item in future_assessments])) if future_assessments else 3.5

    night_shifts = sum(shift.shift_type == "night" for shift in future_shifts)
    longest_duty_streak = 0
    current_streak = 0
    previous_date = None
    for shift in sorted(future_shifts, key=lambda item: item.date):
        if previous_date and (shift.date - previous_date).days > 1:
            current_streak = 0
        if shift.shift_type == "off" or shift.duty_type == "rest":
            current_streak = 0
        else:
            current_streak += 1
            longest_duty_streak = max(longest_duty_streak, current_streak)
        previous_date = shift.date

    return int(
        future_stress >= 3.7
        or future_mood <= 2.3
        or future_sleep <= 2.3
        or future_stress - prior_stress >= 0.75
        or (longest_duty_streak >= 9 and night_shifts >= 3)
        or (future_denials >= 1 and longest_duty_streak >= 7)
    )


def refresh_matured_prediction_outcomes(db: Session, as_of: Optional[datetime] = None) -> int:
    """Attach outcomes only after the entire 14-day observation window has matured."""
    as_of = as_of or datetime.now(timezone.utc)
    cutoff = as_of.date() - timedelta(days=OUTCOME_HORIZON_DAYS)
    pending = db.query(RiskPrediction).filter(
        RiskPrediction.predicted_at < datetime.combine(cutoff, datetime.min.time()),
        RiskPrediction.outcome_14d.is_(None),
        or_(RiskPrediction.abstention_flag.is_(None), RiskPrediction.abstention_flag == 0),
    ).all()

    for prediction in pending:
        prediction.outcome_14d = derive_forward_14d_outcome(
            db, prediction.personnel_id, prediction.predicted_at.date()
        )
        prediction.outcome_observed_at = as_of
        prediction.outcome_definition = OUTCOME_DEFINITION
    return len(pending)
