import os
import sys

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import pandas as pd
from database import engine, Base, SessionLocal
from models import *
from scripts.generate_synthetic_data import generate_all_data
from scripts.train_model import execute_training
from ml.cohort_builder import build_cohort_templates, match_personnel_to_cohort, blend_baseline
from ml.feature_engineering import build_feature_vector
from services.prediction_service import run_batch_predictions

def seed_database():
    print("==========================================================")
    print("[INIT] PRAHARI DEFENSE WELFARE PLATFORM -- FULL SYSTEM SEED")
    print("==========================================================")

    # 1. Create tables
    print("1. Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("[OK] Tables initialized.")

    db = SessionLocal()
    try:
        # 2. Synthetic Data
        print("\n2. Generating realistic paramilitary longitudinal data...")
        generate_all_data(db)

        # 3. Train Model
        print("\n3. Training explainable XGBoost model on synthetic baseline...")
        execute_training(db)

        # 4. Cohort Templates for Cold-Start
        print("\n4. Clustering operational cohorts for Cold-Start bootstrapping...")
        personnel_list = db.query(Personnel).all()
        hr_data = [build_feature_vector(p, db) for p in personnel_list]
        hr_df = pd.DataFrame(hr_data)

        cohorts = build_cohort_templates(hr_df, n_clusters=6)
        db_cohorts = []
        for c in cohorts:
            tmpl = CohortTemplate(
                name=c["name"],
                rank_category=c["rank_category"],
                area_type=c["area_type"],
                deployment_months_min=c["deployment_months_min"],
                deployment_months_max=c["deployment_months_max"],
                feature_means=c["feature_means"],
                feature_stds=c["feature_stds"],
                sample_size=c["sample_size"]
            )
            db.add(tmpl)
            db_cohorts.append((tmpl, c))
        db.commit()

        # 5. Personal Baselines
        print("\n5. Formulating individual personnel baselines...")
        for p, feat in zip(personnel_list, hr_data):
            # Pick closest cohort
            matched_tmpl = match_personnel_to_cohort(feat, cohorts)
            # Days active approx (between 30 and 180)
            days_active = 90 if p.service_number != "CRP-2021-88412" else 180
            blended_means, conf, b_type = blend_baseline(
                matched_tmpl["feature_means"],
                feat,
                days_active=days_active
            )

            p_baseline = PersonalBaseline(
                personnel_id=p.id,
                baseline_type=b_type,
                confidence=conf,
                feature_means=blended_means,
                feature_stds=matched_tmpl["feature_stds"],
                data_points_count=min(90, days_active)
            )
            db.add(p_baseline)
        db.commit()

        # 6. Batch Risk Predictions
        print("\n6. Executing batch risk predictions & initializing Welfare SLAs...")
        pred_res = run_batch_predictions(db)
        print(f"[OK] Predicted risk across {pred_res['total_predicted']} personnel.")
        print(f"[METRIC] Risk Distribution: {pred_res['distribution']}")
        print(f"[ALERT] Welfare Cases Auto-Created: {pred_res['cases_created']}")

        print("\n==========================================================")
        print("[SUCCESS] SEED COMPLETED SUCCESSFULLY! SYSTEM READY FOR DEMO.")
        print("==========================================================")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error during database seed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
