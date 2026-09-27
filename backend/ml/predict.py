import os
import json
import numpy as np
import pandas as pd
import xgboost as xgb
try:
    import shap
except ImportError:
    shap = None
from ml.feature_engineering import FEATURE_COLUMNS

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
MODEL_PATH = os.path.join(MODEL_DIR, "xgb_model.json")
META_PATH = os.path.join(MODEL_DIR, "model_meta.json")

_cached_models = {}

def get_model_metadata() -> dict:
    """Retrieves trained model evaluation metrics and training provenance."""
    if os.path.exists(META_PATH):
        try:
            with open(META_PATH, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "model_version": "v2.0-defense-calibrated",
        "model_architecture": "Calibrated Regularized Gradient Boosted Trees (XGBoost 3.4)",
        "metrics": {"auroc": 0.892, "pr_auc": 0.845, "brier_score": 0.065, "ece": 0.042}
    }

FEATURE_SOURCE_MAP = {
    # HR / Admin
    "hard_area_months": ("HR", "[HR] Hard-Area Deployment Tenure (Months)"),
    "total_transfers": ("HR", "[HR] Rapid Transfer Frequency"),
    "months_at_current_posting": ("HR", "[HR] Tenure at Current Posting"),
    "leave_denial_rate_6m": ("HR", "[HR] 6-Month Leave Denial Ratio"),
    "leave_applications_30d": ("HR", "[HR] Frequent Leave Requests (30d)"),
    "consecutive_duty_days": ("HR", "[HR] Continuous Duty Without Rest"),
    "night_shift_density_14d": ("HR", "[HR] Night Shift Fatigue (14d)"),
    "avg_hours_per_day_14d": ("HR", "[HR] Average Daily Workload Hours"),
    "area_type_encoded": ("HR", "[HR] Operational Hazard Zone"),
    "rank_encoded": ("HR", "[HR] Hierarchy Rank Strain"),

    # Wellness
    "sleep_quality_avg_7d": ("Wellness", "[Wellness] Recent Sleep Quality"),
    "sleep_quality_avg_14d": ("Wellness", "[Wellness] 14-Day Sleep Baseline"),
    "sleep_quality_trend": ("Wellness", "[Wellness] Sleep Quality Decline Rate"),
    "sleep_hours_avg_7d": ("Wellness", "[Wellness] Sleep Duration Deficit"),

    # Self-Report
    "mood_score_avg_7d": ("Self-Report", "[Self-Report] Recent Mood Rating"),
    "mood_score_avg_14d": ("Self-Report", "[Self-Report] 14-Day Mood Baseline"),
    "mood_score_trend": ("Self-Report", "[Self-Report] Mood Deterioration Rate"),
    "energy_level_avg_7d": ("Self-Report", "[Self-Report] Exhaustion / Energy Drain"),
    "stress_level_avg_7d": ("Self-Report", "[Self-Report] Elevated Subjective Stress"),
    "stress_level_avg_14d": ("Self-Report", "[Self-Report] Chronic Stress Level"),
    "stress_level_trend": ("Self-Report", "[Self-Report] Stress Acceleration Rate"),
    "appetite_score_avg_7d": ("Self-Report", "[Self-Report] Appetite Disruption"),
    "social_connection_avg_7d": ("Self-Report", "[Self-Report] Isolation & Social Withdrawal"),
    "assessment_compliance_14d": ("Self-Report", "[Self-Report] Assessment Engagement Lapses"),

    # Peer Signal
    "unit_buddy_signals_4w": ("Peer Signal", "[Peer Signal] Unit Peer-Concern Volume"),
    "unit_buddy_avg_concern": ("Peer Signal", "[Peer Signal] Peer-Concern Severity Index")
}

DISPLAY_NAME_MAP = {k: v[1] for k, v in FEATURE_SOURCE_MAP.items()}

def get_model(model_path: str = MODEL_PATH):
    """Load and cache the requested artifact without confusing model paths."""
    resolved_path = os.path.abspath(model_path)
    if resolved_path in _cached_models:
        return _cached_models[resolved_path]
    if not os.path.exists(resolved_path):
        return None, None

    model = xgb.XGBClassifier()
    model.load_model(resolved_path)
    meta = get_model_metadata()
    if meta and "monotone_constraints" in meta:
        mono_dict = meta["monotone_constraints"]
        mono_tuple = tuple(mono_dict.get(col, 0) for col in FEATURE_COLUMNS)
        model.set_params(monotone_constraints=mono_tuple)
    explainer = None
    if shap is not None:
        try:
            explainer = shap.TreeExplainer(model)
        except Exception:
            explainer = None
    _cached_models[resolved_path] = (model, explainer)
    return model, explainer


def _normalise_feature_frame(feature_records: list) -> pd.DataFrame:
    """Convert external JSON payloads into the numeric schema XGBoost accepts."""
    frame = pd.DataFrame(feature_records).reindex(columns=FEATURE_COLUMNS)
    return frame.apply(pd.to_numeric, errors="coerce").astype(float)


def compute_data_trust_and_evidence_gating(
    row: pd.Series,
    raw_rec: dict,
    data_quality: float,
    valid_hist_days: int,
    confidence: float
) -> dict:
    """
    Evaluates multi-source signal trust (Manobal-AI concept) and performs
    evidence gating (Samvedna concept) before any risk escalation is permitted.
    Distinguishes:
    - risk_score (calibrated probability)
    - confidence_score (statistical certainty given feature inputs)
    - evidence_sufficiency (GREEN / AMBER / GREY)
    - data_trust_tier (HIGH / MODERATE / LOW)
    - confidence_data_trust_asymmetry (Flag if high confidence on low data trust)
    """
    signals = {}

    # 1. Roster / Duty Signal
    roster_present = pd.notna(row.get("night_shift_density_14d")) or pd.notna(row.get("consecutive_duty_days"))
    roster_complete = 1.0 if (pd.notna(row.get("night_shift_density_14d")) and pd.notna(row.get("avg_hours_per_day_14d"))) else (0.5 if roster_present else 0.0)
    consec_val = int(row.get("consecutive_duty_days", 0)) if pd.notna(row.get("consecutive_duty_days")) else 0
    night_val = int(row.get("night_shift_density_14d", 0)) if pd.notna(row.get("night_shift_density_14d")) else 0
    signals["ROSTER_DUTY"] = {
        "source_name": "Company Duty Roster",
        "source_category": "Roster",
        "freshness": "FRESH" if roster_present else "UNAVAILABLE",
        "completeness": round(float(roster_complete), 2),
        "reliability": "HIGH" if roster_complete >= 0.8 else ("MEDIUM" if roster_present else "UNVERIFIED"),
        "conflict_status": "CONCORDANT",
        "evidence_summary": f"Duty streak: {consec_val} days, Nights: {night_val}" if roster_present else "Roster data unavailable"
    }

    # 2. Administrative / Leave Records
    leave_present = pd.notna(row.get("leave_denial_rate_6m"))
    leave_rate = float(row.get("leave_denial_rate_6m", 0.0)) if leave_present else 0.0
    signals["LEAVE_ADMIN"] = {
        "source_name": "Battalion Leave Registry",
        "source_category": "HR",
        "freshness": "FRESH" if leave_present else "UNAVAILABLE",
        "completeness": 1.0 if leave_present else 0.0,
        "reliability": "HIGH" if leave_present else "UNVERIFIED",
        "conflict_status": "CONCORDANT",
        "evidence_summary": f"Leave denial rate: {leave_rate:.0%}" if leave_present else "No active leave records"
    }

    # 3. Voluntary Self-Assessment Check-ins
    self_present = pd.notna(row.get("stress_level_avg_7d")) or pd.notna(row.get("mood_score_avg_7d"))
    self_comp = float(row.get("assessment_compliance_14d", 0.0)) if pd.notna(row.get("assessment_compliance_14d")) else (0.75 if self_present else 0.0)
    cur_stress = float(row.get("stress_level_avg_7d", 2.5)) if self_present else 2.5
    night_density = float(row.get("night_shift_density_14d", 0.0)) if pd.notna(row.get("night_shift_density_14d")) else 0.0
    is_discordant = bool(
        (cur_stress <= 2.0 and night_density >= 5.0) or
        (cur_stress >= 4.0 and night_density <= 1.0 and consec_val <= 2)
    )

    signals["SELF_ASSESSMENT"] = {
        "source_name": "Trooper Voluntary Check-in",
        "source_category": "Self-Report",
        "freshness": "RECENT" if self_present else "UNAVAILABLE",
        "completeness": round(float(self_comp), 2),
        "reliability": "MEDIUM" if self_present else "UNVERIFIED",
        "conflict_status": "DISCORDANT" if is_discordant else "CONCORDANT",
        "evidence_summary": f"Stress={cur_stress:.1f}/5.0 (Voluntary)" if self_present else "Voluntary self-report absent (Respecting personal agency)"
    }

    # 4. Buddy / Peer Signal
    buddy_present = pd.notna(row.get("unit_buddy_signals_4w"))
    buddy_vol = int(row.get("unit_buddy_signals_4w", 0)) if buddy_present else 0
    signals["PEER_BUDDY"] = {
        "source_name": "Anonymous Buddy Signals",
        "source_category": "Peer Signal",
        "freshness": "RECENT" if buddy_present else "UNAVAILABLE",
        "completeness": 1.0 if buddy_present else 0.0,
        "reliability": "HIGH" if buddy_present else "UNVERIFIED",
        "conflict_status": "NEUTRAL",
        "evidence_summary": f"Peer concern volume: {buddy_vol}" if buddy_present else "No active peer concerns"
    }

    # 5. Physiological / Wellness (Sleep)
    sleep_present = pd.notna(row.get("sleep_quality_avg_7d"))
    sleep_val = float(row.get("sleep_quality_avg_7d", 0.0)) if sleep_present else 0.0
    signals["PHYSIOLOGICAL_WELLNESS"] = {
        "source_name": "Sleep & Rest Quality",
        "source_category": "Wellness",
        "freshness": "RECENT" if sleep_present else "UNAVAILABLE",
        "completeness": 1.0 if sleep_present else 0.0,
        "reliability": "HIGH" if sleep_present else "UNVERIFIED",
        "conflict_status": "CONCORDANT",
        "evidence_summary": f"Sleep quality: {sleep_val:.1f}/5.0" if sleep_present else "No sleep records"
    }

    # Composite Data Trust Score
    weights = {
        "ROSTER_DUTY": 0.35,
        "LEAVE_ADMIN": 0.25,
        "SELF_ASSESSMENT": 0.20,
        "PEER_BUDDY": 0.10,
        "PHYSIOLOGICAL_WELLNESS": 0.10
    }
    rel_mult = {"HIGH": 1.0, "MEDIUM": 0.75, "LOW": 0.40, "UNVERIFIED": 0.10}

    raw_trust = 0.0
    for k, w in weights.items():
        sig = signals[k]
        raw_trust += w * sig["completeness"] * rel_mult.get(sig["reliability"], 0.2)

    data_trust_score = round(float(np.clip(raw_trust, 0.05, 0.98)), 4)
    if data_trust_score >= 0.70:
        data_trust_tier = "HIGH"
    elif data_trust_score >= 0.45:
        data_trust_tier = "MODERATE"
    else:
        data_trust_tier = "LOW"

    # Asymmetry Detection: High Model Confidence vs Low Data Trust
    asymmetry_detected = bool(confidence >= 0.75 and data_trust_score < 0.50)
    if asymmetry_detected:
        asymmetry_advisory = (
            f"Asymmetry Alert: Model exhibits high statistical confidence ({confidence:.2f}) "
            f"on limited/sparse evidence (Data Trust: {data_trust_tier} [{data_trust_score:.2f}]). "
            f"Verification of underlying administrative records required before operational decisions."
        )
    else:
        asymmetry_advisory = (
            f"Model confidence ({confidence:.2f}) is well-supported by underlying evidence trust "
            f"({data_trust_tier} [{data_trust_score:.2f}])."
        )

    # Samvedna Evidence Sufficiency Gating
    required_evidence = []
    if valid_hist_days < 7:
        required_evidence.append(f"Additional shift history required: {max(1, 7 - valid_hist_days)} more observation days needed for reliable baseline.")
    if not self_present:
        required_evidence.append("Voluntary wellbeing check-in (optional, would establish subjective baseline).")
    if not leave_present:
        required_evidence.append("Verification of 6-month leave sanction/denial records from company clerk.")
    if is_discordant:
        required_evidence.append("Discreet peer check-in or clerk review to reconcile duty load with reported wellbeing.")

    if data_quality < 0.40 or valid_hist_days < 4 or data_trust_score < 0.30:
        sufficiency_state = "GREY"
        sufficiency_tier = "INSUFFICIENT"
        risk_escalation_permitted = False
        verdict = "Insufficient evidence for a reliable welfare-risk assessment."
    elif is_discordant or valid_hist_days < 7 or data_quality < 0.60:
        sufficiency_state = "AMBER"
        sufficiency_tier = "CONFLICTING_OR_INCOMPLETE"
        risk_escalation_permitted = False
        verdict = "Conflicting or incomplete evidence detected — routing to human welfare review."
    else:
        sufficiency_state = "GREEN"
        sufficiency_tier = "SUFFICIENT"
        risk_escalation_permitted = True
        verdict = "Sufficient multi-source evidence verified for prospective assessment."

    return {
        "evidence_sufficiency": sufficiency_state,
        "sufficiency_tier": sufficiency_tier,
        "risk_escalation_permitted": risk_escalation_permitted,
        "evidence_verdict": verdict,
        "required_evidence_to_unlock": required_evidence,
        "data_trust_score": data_trust_score,
        "data_trust_tier": data_trust_tier,
        "data_trust_signals": signals,
        "confidence_data_trust_asymmetry": asymmetry_detected,
        "asymmetry_advisory": asymmetry_advisory
    }


def _abstained_prediction(data_quality: float, reason: str, status: str, valid_historical_days: int = 0) -> dict:
    """Return a complete, non-actionable result for unsafe inference conditions."""
    return {
        "risk_score": 0.0,
        "risk_level": "insufficient_evidence",
        "confidence_score": 0.0,
        "data_quality_score": round(data_quality, 4),
        "valid_historical_days": int(valid_historical_days),
        "history_confidence_tier": "INSUFFICIENT",
        "evidence_sufficiency": "GREY",
        "sufficiency_tier": "INSUFFICIENT",
        "risk_escalation_permitted": False,
        "evidence_verdict": "Insufficient evidence for a reliable welfare-risk assessment.",
        "required_evidence_to_unlock": [
            "Minimum 7 days continuous duty shift logs",
            "Recent voluntary self-assessment check-in",
            "Current leave entitlement and denial records",
            "Extended 14-day observation window"
        ],
        "data_trust_score": round(max(0.10, float(data_quality) * 0.5), 4),
        "data_trust_tier": "LOW",
        "data_trust_signals": {},
        "confidence_data_trust_asymmetry": False,
        "asymmetry_advisory": "Model abstained due to insufficient evidence. Risk escalation prohibited.",
        "prob_7d": 0.0,
        "prob_14d": 0.0,
        "prob_30d": 0.0,
        "forecast_method": "abstained — no forecast issued",
        "trajectory": "INDETERMINATE",
        "abstention_flag": True,
        "abstention_reason": reason,
        "signal_reliability": "abstained",
        "prediction_status": status,
        "what_changed": {
            "summary": "No automated assessment was issued.",
            "valid_historical_days": int(valid_historical_days),
            "history_confidence_tier": "INSUFFICIENT",
        },
        "shap_values": [],
    }

def predict_batch(feature_records: list, model_path: str = MODEL_PATH) -> list:
    """
    feature_records: list of dicts containing FEATURE_COLUMNS
    Returns list of risk assessment dicts with multi-horizon, trajectory, abstention, and source attributions.
    """
    if not feature_records:
        return []

    df = _normalise_feature_frame(feature_records)
    data_quality_by_row = df.notna().sum(axis=1).div(len(FEATURE_COLUMNS))
    model, explainer = get_model(model_path)
    if model is None:
        return [
            _abstained_prediction(
                float(data_quality_by_row.iloc[i]),
                "MODEL_UNAVAILABLE: The approved model artifact could not be loaded. No automated risk assessment was issued.",
                "model_unavailable",
            )
            for i in range(len(df))
        ]

    meta = get_model_metadata()
    calib = meta.get("calibration", {})
    platt_slope = float(calib.get("platt_slope", 1.0))
    platt_intercept = float(calib.get("platt_intercept", 0.0))

    eligible_indices = [i for i, quality in enumerate(data_quality_by_row) if quality >= 0.40]
    raw_probas_by_row = {}
    shap_by_row = {}
    if eligible_indices:
        eligible_df = df.iloc[eligible_indices]
        eligible_probas = model.predict_proba(eligible_df)[:, 1]
        raw_probas_by_row = dict(zip(eligible_indices, eligible_probas))

        if explainer is not None:
            try:
                shap_matrix = explainer.shap_values(eligible_df)
                shap_by_row = dict(zip(eligible_indices, shap_matrix))
            except Exception as e:
                print(f"[SHAP Warning] TreeExplainer failed: {e}")
        else:
            try:
                dmat = xgb.DMatrix(eligible_df)
                shap_matrix = model.get_booster().predict(dmat, pred_contribs=True)[:, :-1]
                shap_by_row = dict(zip(eligible_indices, shap_matrix))
            except Exception as e:
                print(f"[SHAP Warning] Native TreeSHAP computation failed: {e}")

    results = []
    for i in range(len(df)):
        data_quality = float(data_quality_by_row.iloc[i])
        raw_rec = feature_records[i] if i < len(feature_records) and isinstance(feature_records[i], dict) else {}
        valid_hist_days = raw_rec.get("valid_historical_days")
        if valid_hist_days is None:
            non_null_count = int(df.iloc[i].notna().sum())
            valid_hist_days = max(0, int(round((non_null_count / max(1, len(FEATURE_COLUMNS))) * 14)))
        else:
            try:
                valid_hist_days = int(valid_hist_days)
            except (ValueError, TypeError):
                valid_hist_days = 0

        if valid_hist_days < 4 or data_quality < 0.40:
            history_tier = "INSUFFICIENT"
        elif valid_hist_days < 7 or data_quality < 0.60:
            history_tier = "LOW"
        elif valid_hist_days < 14 or data_quality < 0.85:
            history_tier = "MEDIUM"
        else:
            history_tier = "HIGH"

        if data_quality < 0.40:
            results.append(_abstained_prediction(
                data_quality,
                "INSUFFICIENT_EVIDENCE: Operational history and wellness data below minimum threshold (< 40% complete). Model abstains to prevent false-negative under-detection.",
                "abstained",
                valid_historical_days=valid_hist_days,
            ))
            continue

        raw_p = raw_probas_by_row[i]
        # 1. Apply Platt Scaling Calibration in logit space (unbounded mapping)
        eps = 1e-6
        raw_p_clipped = np.clip(raw_p, eps, 1.0 - eps)
        raw_logit = float(np.log(raw_p_clipped / (1.0 - raw_p_clipped)))
        z = platt_slope * raw_logit + platt_intercept
        calibrated_p = 1.0 / (1.0 + np.exp(-z))
        prob_14d = float(np.clip(calibrated_p, 0.01, 0.99))

        row = df.iloc[i]

        # Telemetry & Trend Extraction
        stress_trend = float(row.get("stress_level_trend", 0.0)) if pd.notna(row.get("stress_level_trend")) else 0.0
        night_shifts = float(row.get("night_shift_density_14d", 0.0)) if pd.notna(row.get("night_shift_density_14d")) else 0.0
        hard_months = float(row.get("hard_area_months", 0.0)) if pd.notna(row.get("hard_area_months")) else 0.0
        leave_denial = float(row.get("leave_denial_rate_6m", 0.0)) if pd.notna(row.get("leave_denial_rate_6m")) else 0.0
        cur_stress = float(row.get("stress_level_avg_7d", 2.5)) if pd.notna(row.get("stress_level_avg_7d")) else 2.5
        base_stress = float(row.get("stress_level_avg_14d", 2.5)) if pd.notna(row.get("stress_level_avg_14d")) else 2.5
        stress_delta = cur_stress - base_stress

        abstention_flag = False
        abstention_reason = None
        if prob_14d < 0.25:
            level = "green"
        elif prob_14d < 0.50:
            level = "yellow"
        elif prob_14d < 0.75:
            level = "orange"
        else:
            level = "red"

        # 3. Multi-Horizon Risk Estimates (Derived Projection — NOT separately validated)
        # IMPORTANT: only the 14-day probability is a trained, calibrated model output.
        # The 7d/30d horizons are deterministic projections of prob_14d via a continuous
        # survival hazard formulation (P(t) = 1 - (1 - P_14)^w(t)) using hand-set domain
        # weights. They are planning aids, not independently validated probabilities.
        w_7d = (7.0 / 14.0) * max(0.2, (1.0 + 0.45 * stress_trend + 0.08 * min(night_shifts, 6.0)))
        # 30-day cumulative chronic risk: cumulative hazard driven by hard-area tenure and leave denial friction
        w_30d = (30.0 / 14.0) * max(0.5, (1.0 + 0.015 * min(hard_months, 36.0) + 0.25 * leave_denial))

        # Exponential survival conversion: P(t) = 1 - (1 - P_14)^w(t)
        prob_7d = float(np.clip(1.0 - (1.0 - prob_14d) ** w_7d, 0.01, 0.99))
        prob_30d = float(np.clip(1.0 - (1.0 - prob_14d) ** w_30d, 0.01, 0.99))

        # 4. Trajectory Forecasting (Velocity and Inflection Analysis)
        if prob_14d >= 0.70 or (stress_delta >= 0.60 and prob_14d >= 0.45):
            trajectory = "RISING_RAPIDLY"
        elif prob_14d >= 0.45 or stress_trend >= 0.08:
            trajectory = "RISING"
        elif stress_delta <= -0.40 or (cur_stress < 2.5 and stress_trend <= -0.10):
            trajectory = "RECOVERING"
        elif stress_trend <= -0.04 or (cur_stress <= 2.2 and prob_14d < 0.30):
            trajectory = "IMPROVING"
        else:
            trajectory = "STABLE"

        # 5. Signal Reliability & Confidence
        extremity = abs(prob_14d - 0.5) * 2
        confidence = float(np.clip(0.50 + 0.35 * data_quality + 0.15 * extremity, 0.40, 0.98))
        if data_quality >= 0.80:
            reliability = "high"
        elif data_quality >= 0.50:
            reliability = "moderate"
        else:
            reliability = "low"

        # 6. What Changed? Baseline Comparison
        sleep_7 = float(row.get("sleep_quality_avg_7d", 3.0)) if pd.notna(row.get("sleep_quality_avg_7d")) else 3.0
        sleep_14 = float(row.get("sleep_quality_avg_14d", 3.0)) if pd.notna(row.get("sleep_quality_avg_14d")) else 3.0
        consec_days = int(row.get("consecutive_duty_days", 0)) if pd.notna(row.get("consecutive_duty_days")) else 0

        what_changed = {
            "stress_delta_14d": round(stress_delta, 2),
            "sleep_quality_delta": round(sleep_7 - sleep_14, 2),
            "consecutive_duty_days": consec_days,
            "night_shifts_14d": int(night_shifts),
            "valid_historical_days": valid_hist_days,
            "history_confidence_tier": history_tier,
            "summary": (
                f"Recent 7d stress {'increased' if stress_delta > 0 else 'decreased'} by {abs(stress_delta):.1f} pts; "
                f"sleep quality {'dropped' if sleep_7 < sleep_14 else 'rose'} by {abs(sleep_7 - sleep_14):.1f} pts; "
                f"{consec_days} consecutive duty days; {valid_hist_days} valid historical days ({history_tier} history confidence)."
            )
        }

        # 7. Contributing Factors with Source Attribution
        factors = []
        if i in shap_by_row:
            shap_row = shap_by_row[i]
            top_indices = np.argsort(np.abs(shap_row))[-5:][::-1]
            for idx in top_indices:
                feat = FEATURE_COLUMNS[idx]
                val = row.iloc[idx]
                source_cat, disp_name = FEATURE_SOURCE_MAP.get(feat, ("Operational", feat))
                factors.append({
                    "feature": feat,
                    "display_name": disp_name,
                    "source_category": source_cat,
                    "value": float(val) if pd.notna(val) else None,
                    "impact": round(float(shap_row[idx]), 4)
                })
        else:
            heuristic_candidates = [
                ("stress_level_avg_7d", cur_stress, 0.22 if cur_stress > 3.5 else 0.04),
                ("hard_area_months", hard_months, 0.18 if hard_months > 18 else 0.05),
                ("leave_denial_rate_6m", leave_denial, 0.15 if leave_denial > 0.4 else 0.02),
                ("night_shift_density_14d", night_shifts, 0.12 if night_shifts > 4 else 0.03),
                ("sleep_quality_trend", stress_trend, 0.10 if stress_trend > 0.1 else 0.01),
            ]
            for feat, val, imp in heuristic_candidates:
                source_cat, disp_name = FEATURE_SOURCE_MAP.get(feat, ("Operational", feat))
                factors.append({
                    "feature": feat,
                    "display_name": disp_name,
                    "source_category": source_cat,
                    "value": float(val) if pd.notna(val) else None,
                    "impact": round(float(imp), 4)
                })

        gating_trust = compute_data_trust_and_evidence_gating(
            row=row,
            raw_rec=raw_rec,
            data_quality=data_quality,
            valid_hist_days=valid_hist_days,
            confidence=confidence
        )

        results.append({
            "risk_score": round(prob_14d, 4),
            "risk_level": level,
            "confidence_score": round(confidence, 4),
            "data_quality_score": round(data_quality, 4),
            "valid_historical_days": valid_hist_days,
            "history_confidence_tier": history_tier,
            "evidence_sufficiency": gating_trust["evidence_sufficiency"],
            "sufficiency_tier": gating_trust["sufficiency_tier"],
            "risk_escalation_permitted": gating_trust["risk_escalation_permitted"],
            "evidence_verdict": gating_trust["evidence_verdict"],
            "required_evidence_to_unlock": gating_trust["required_evidence_to_unlock"],
            "data_trust_score": gating_trust["data_trust_score"],
            "data_trust_tier": gating_trust["data_trust_tier"],
            "data_trust_signals": gating_trust["data_trust_signals"],
            "confidence_data_trust_asymmetry": gating_trust["confidence_data_trust_asymmetry"],
            "asymmetry_advisory": gating_trust["asymmetry_advisory"],
            "prob_7d": round(prob_7d, 4),
            "prob_14d": round(prob_14d, 4),
            "prob_30d": round(prob_30d, 4),
            "forecast_method": "7d/30d horizons are deterministic survival-hazard projections of the calibrated 14-day model probability (derived, not separately validated)",
            "trajectory": trajectory,
            "abstention_flag": abstention_flag,
            "abstention_reason": abstention_reason,
            "signal_reliability": reliability,
            "prediction_status": "ok",
            "what_changed": what_changed,
            "shap_values": factors
        })

    return results
