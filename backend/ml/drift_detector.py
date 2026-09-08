import numpy as np
from scipy.stats import entropy
from typing import Dict, Any

CATEGORIES = ["green", "yellow", "orange", "red"]

def compute_distribution_drift(
    current_counts: Dict[str, int],
    baseline_counts: Dict[str, int],
    threshold: float = 0.12
) -> Dict[str, Any]:
    """
    Measures KL-Divergence between the operational risk distribution and
    the baseline distribution established during initial deployment.
    """
    c_arr = np.array([max(1, current_counts.get(k, 0)) for k in CATEGORIES], dtype=float)
    b_arr = np.array([max(1, baseline_counts.get(k, 0)) for k in CATEGORIES], dtype=float)

    p = c_arr / c_arr.sum()
    q = b_arr / b_arr.sum()

    kl_div = float(entropy(p, q))

    # Population Stability Index (PSI)
    psi = float(np.sum((p - q) * np.log(p / q)))
    drift_flag = (kl_div > threshold) or (psi >= 0.20)

    detail = ""
    if drift_flag:
        detail = (
            f"Alert: Operational risk distribution shifted from baseline (KL-Div: {kl_div:.4f}, PSI: {psi:.4f}). "
            f"Current: Green={p[0]:.1%}, Yellow={p[1]:.1%}, Orange={p[2]:.1%}, Red={p[3]:.1%}. "
            f"Review model calibration or evaluate force-wide operational shock events."
        )
    else:
        detail = f"Model outputs well-calibrated against reference population (KL-Div: {kl_div:.4f} <= {threshold}, PSI: {psi:.4f} < 0.20)."

    return {
        "kl_divergence": round(kl_div, 4),
        "population_stability_index": round(psi, 4),
        "drift_detected": drift_flag,
        "drift_details": detail,
        "current_proportions": {k: round(float(v), 3) for k, v in zip(CATEGORIES, p)},
        "baseline_proportions": {k: round(float(v), 3) for k, v in zip(CATEGORIES, q)},
    }
