import os
import sys

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from database import SessionLocal
from models.personnel import Personnel
from ml.feature_engineering import build_feature_vector, FEATURE_COLUMNS
from ml.train import train_model

def execute_training(db: Session):
    print("[TRAIN] Initiating PRAHARI Defense XGBoost Training Pipeline...")
    personnel_list = db.query(Personnel).all()
    if not personnel_list:
        print("[ERROR] No personnel data found in database. Run generate_synthetic_data.py first.")
        return

    features = []
    labels = []

    for p in personnel_list:
        feat = build_feature_vector(p, db)
        features.append(feat)

        # Continuous latent logistic strain formulation calibrated for defense human factors:
        hard_m = feat.get("hard_area_months", 0)
        denial = feat.get("leave_denial_rate_6m", 0.0)
        stress = feat.get("stress_level_avg_7d", np.nan)
        sleep = feat.get("sleep_quality_avg_7d", np.nan)
        night_density = feat.get("night_shift_density_14d", 0.0)
        consec_duty = feat.get("consecutive_duty_days", 0)

        # Baseline intercept tuned for ~20-25% high-strain prevalence in operational formations
        z = -2.40
        z += 0.075 * min(hard_m, 36)
        z += 2.80 * denial
        if not np.isnan(stress):
            z += 0.40 * (stress - 3.0)
        if not np.isnan(sleep):
            z -= 0.35 * (sleep - 3.0)
        z += 0.15 * min(night_density, 10)
        if consec_duty >= 10:
            z += 0.50

        prob = 1.0 / (1.0 + np.exp(-z))
        srv_num = getattr(p, "service_number", "")
        seed_hash = abs(hash(srv_num)) % (2**31 - 1) if srv_num else 42
        rng = np.random.RandomState(seed_hash)
        is_high = rng.rand() < prob

        labels.append(1 if is_high else 0)

    df = pd.DataFrame(features)
    y = np.array(labels)

    print(f"[DATA] Training Matrix: {df.shape[0]} troopers, {df.shape[1]} features. Positive class ratio: {y.mean():.2%}")
    model, metrics = train_model(df, y)
    return model, metrics

if __name__ == "__main__":
    db = SessionLocal()
    try:
        execute_training(db)
    finally:
        db.close()
