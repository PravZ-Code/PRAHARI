import os
import json
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from typing import List, Dict, Tuple, Any

COHORTS_FILE = os.path.join(os.path.dirname(__file__), "model", "cohort_templates.json")

HR_FEATURE_SUBSET = [
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
]

COHORT_LABELS = [
    "High-Altitude / Border Outpost Constabulary",
    "Counter-Insurgency Tactical Units",
    "Rapid Relocation & High-Mobility Reserves",
    "Static High-Security Installation Guard",
    "Administrative & Rear-Echelon Support",
    "Junior Commissioned Leadership Tier"
]

def build_cohort_templates(hr_features_df: pd.DataFrame, n_clusters: int = 6) -> List[Dict[str, Any]]:
    """
    Groups historical personnel by administrative strain profiles to formulate
    Day-1 Cold-Start baselines for newly deployed personnel.
    """
    subset = hr_features_df[HR_FEATURE_SUBSET].fillna(0)
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(subset)

    templates = []
    for i in range(n_clusters):
        cluster_rows = hr_features_df[labels == i]
        name = COHORT_LABELS[i] if i < len(COHORT_LABELS) else f"Operational Cohort {i+1}"
        numeric_cluster_rows = cluster_rows.select_dtypes(include=[np.number])
        means = numeric_cluster_rows.mean().to_dict()
        stds = numeric_cluster_rows.std().fillna(0.1).to_dict()

        templates.append({
            "cohort_id": f"cohort_cluster_{i+1}",
            "name": name,
            "cohort_name": name,
            "rank_category": "constable" if means.get("rank_encoded", 0) <= 1 else "officer",
            "area_type": "hard" if means.get("area_type_encoded", 0) >= 1.5 else "peace",
            "deployment_months_min": int(numeric_cluster_rows["hard_area_months"].min()) if "hard_area_months" in numeric_cluster_rows else 0,
            "deployment_months_max": int(numeric_cluster_rows["hard_area_months"].max()) if "hard_area_months" in numeric_cluster_rows else 36,
            "feature_means": {k: round(float(v), 4) for k, v in means.items() if pd.notna(v)},
            "feature_stds": {k: round(float(v), 4) for k, v in stds.items() if pd.notna(v)},
            "sample_size": len(cluster_rows),
            "cluster_center": [round(float(v), 4) for v in kmeans.cluster_centers_[i]],
            "centroid": {k: round(float(means.get(k, 0.0)), 4) for k in HR_FEATURE_SUBSET},
            "baseline_stats": {
                "sleep_quality_mean": round(float(means.get("sleep_quality_avg_7d", 3.0)), 2),
                "stress_level_mean": round(float(means.get("stress_level_avg_7d", 2.5)), 2),
                "mood_score_mean": round(float(means.get("mood_score_avg_7d", 3.5)), 2)
            }
        })

    return templates

def match_personnel_to_cohort(personnel_features: dict, templates: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Finds closest cohort template via euclidean distance on HR features."""
    if not templates:
        return None

    best_template = None
    min_dist = float("inf")

    for tmpl in templates:
        center = tmpl.get("cluster_center", [])
        if not center:
            continue
        feat_vals = [float(personnel_features.get(f, 0.0) or 0.0) for f in HR_FEATURE_SUBSET]
        dist = sum((a - b) ** 2 for a, b in zip(feat_vals, center))
        if dist < min_dist:
            min_dist = dist
            best_template = tmpl

    return best_template or templates[0]

def blend_baseline(cohort_means: dict, personal_means: dict, days_active: int) -> Tuple[dict, float, str]:
    """
    Interpolates between cohort template prior and personal longitudinal evidence:
    alpha: 1.0 (Day 1) -> 0.0 (Day 90)
    confidence: 0.60 (Day 1) -> 0.95 (Day 90)
    """
    days = max(0, min(90, days_active))
    alpha = max(0.0, 1.0 - (days / 90.0))
    confidence = round(0.60 + (0.35 * (days / 90.0)), 3)

    if days < 14:
        b_type = "cohort"
    elif days < 90:
        b_type = "mixed"
    else:
        b_type = "personalized"

    blended = {}
    all_keys = set(cohort_means.keys()).union(set(personal_means.keys()))
    for k in all_keys:
        c_val = cohort_means.get(k, 0.0)
        p_val = personal_means.get(k)
        if p_val is not None and not np.isnan(p_val):
            blended[k] = round(alpha * c_val + (1.0 - alpha) * float(p_val), 4)
        else:
            blended[k] = round(float(c_val), 4)

    return blended, confidence, b_type
 
def get_cached_cohort_templates(cohorts_path: str = COHORTS_FILE) -> List[Dict[str, Any]]:
    """Retrieves pre-clustered cohort templates from disk or returns empty list."""
    if os.path.exists(cohorts_path):
        try:
            with open(cohorts_path, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return []

