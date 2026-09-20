import os
import sys

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from datetime import datetime, date, timedelta
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from database import SessionLocal
from models.personnel import Personnel
from models.assessment import SelfAssessment
from models.duty_roster import DutyRoster
from models.leave import LeaveRecord
from ml.feature_engineering import build_feature_vector, FEATURE_COLUMNS
from ml.train import train_model

def compute_forward_strain_target(p_id: str, t0: date, db: Session) -> int:
    """
    Computes true forward-looking 14-day strain escalation target Y in [t0, t0 + 14d].
    Strictly queries future assessments and operational roster records occurring AFTER t0.
    Eliminates circularity by predicting forward emergence of operational distress.
    """
    t0_dt = datetime.combine(t0, datetime.min.time())
    t_end_14 = t0_dt + timedelta(days=14)
    t_prior = t0_dt - timedelta(days=14)

    # 1. Future assessments in [t0, t0 + 14d]
    future_ass = db.query(SelfAssessment).filter(
        SelfAssessment.personnel_id == p_id,
        SelfAssessment.assessed_at >= t0_dt,
        SelfAssessment.assessed_at < t_end_14
    ).all()

    # Prior assessments in [t0 - 14d, t0] for trend comparison
    prior_ass = db.query(SelfAssessment).filter(
        SelfAssessment.personnel_id == p_id,
        SelfAssessment.assessed_at >= t_prior,
        SelfAssessment.assessed_at < t0_dt
    ).all()

    prior_stress = np.mean([a.stress_level for a in prior_ass]) if prior_ass else 2.5

    # 2. Future duty strain in [t0, t0 + 14d]
    future_shifts = db.query(DutyRoster).filter(
        DutyRoster.personnel_id == p_id,
        DutyRoster.date >= t0,
        DutyRoster.date < (t0 + timedelta(days=14))
    ).all()

    night_shifts_14 = sum(1 for s in future_shifts if s.shift_type == "night")
    consecutive_high = 0
    cur_streak = 0
    for s in sorted(future_shifts, key=lambda x: x.date):
        if s.shift_type != "off":
            cur_streak += 1
            consecutive_high = max(consecutive_high, cur_streak)
        else:
            cur_streak = 0

    # 3. Future leave denials in [t0, t0 + 14d]
    future_denials = db.query(LeaveRecord).filter(
        LeaveRecord.personnel_id == p_id,
        LeaveRecord.applied_date >= t0,
        LeaveRecord.applied_date < (t0 + timedelta(days=14)),
        LeaveRecord.status == "denied"
    ).count()

    if future_ass:
        f_stress_14 = float(np.mean([a.stress_level for a in future_ass]))
        f_mood_14 = float(np.mean([a.mood_score for a in future_ass]))
        f_sleep_14 = float(np.mean([a.sleep_quality for a in future_ass]))
    else:
        f_stress_14 = 2.5
        f_mood_14 = 3.5
        f_sleep_14 = 3.5

    # Multi-dimensional forward strain escalation criteria:
    # - Subjective acute distress (stress >= 3.7 OR mood <= 2.3 OR sleep <= 2.3)
    # - Rapid acute escalation (+0.75 jump over previous 14d baseline)
    # - Severe operational exhaustion (>=9 consecutive duty days with >=3 night shifts)
    # - Administrative strain (leave denial during continuous duty)
    is_high_strain = (
        (f_stress_14 >= 3.7) or
        (f_mood_14 <= 2.3) or
        (f_sleep_14 <= 2.3) or
        ((f_stress_14 - prior_stress) >= 0.75) or
        (consecutive_high >= 9 and night_shifts_14 >= 3) or
        (future_denials >= 1 and consecutive_high >= 7)
    )

    return 1 if is_high_strain else 0

def execute_training(db: Session, empirical_sample_size: int = 4000):
    print("[TRAIN] Initiating PRAHARI Longitudinal Defense ML Pipeline with Real-Life Empirical Datasets...")
    from ml.data_loader import get_combined_training_data

    # Load and fuse real-world Kaggle Employee Burnout (22,750 records) & Sleep Health datasets
    # alongside live operational longitudinal tracking records
    df = get_combined_training_data(db=db, empirical_sample_size=empirical_sample_size, random_state=42)
    y = df["y_14d"].values.astype(int)

    print(f"[DATA] Final Grounded Training Matrix: {df.shape[0]} sample points, {len(FEATURE_COLUMNS)} features.")
    print(f"[DATA] Forward 14-Day Strain Escalation Prevalence: {y.mean():.2%}")

    model, metrics = train_model(df, y)
    print(f"[SUCCESS] Defense Calibrated Model Successfully Trained from Real-Life Public Datasets and Exported.")
    return model, metrics

if __name__ == "__main__":
    db = SessionLocal()
    try:
        execute_training(db)
    finally:
        db.close()
