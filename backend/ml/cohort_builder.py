import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from typing import List, Dict, Tuple, Any

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

        means = cluster_rows.mean().to_dict()
        stds = cluster_rows.std().fillna(0.1).to_dict()

        templates.append({
            "name": name,
            "rank_category": "constable" if means.get("rank_encoded", 0) <= 1 else "officer",
            "area_type": "hard" if means.get("area_type_encoded", 0) >= 1.5 else "peace",
            "deployment_months_min": int(cluster_rows["hard_area_months"].min()) if "hard_area_months" in cluster_rows else 0,
            "deployment_months_max": int(cluster_rows["hard_area_months"].max()) if "hard_area_months" in cluster_rows else 36,
            "feature_means": {k: round(float(v), 4) for k, v in means.items() if not np.isnan(v)},
            "feature_stds": {k: round(float(v), 4) for k, v in stds.items() if not np.isnan(v)},
            "sample_size": len(cluster_rows),
            "cluster_center": [round(float(v), 4) for v in kmeans.cluster_centers_[i]]
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
