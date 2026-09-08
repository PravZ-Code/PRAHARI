import math
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from models.personnel import Personnel
from models.duty_roster import DutyRoster
from models.leave import LeaveRecord
from models.assessment import SelfAssessment
from models.buddy_signal import BuddySignal
from schemas.evidence import EvidenceConflictReport, EvidenceSourceProvenance

def analyze_evidence_conflict(db: Session, personnel_id: str) -> EvidenceConflictReport:
    """
    Evaluates multi-modal evidence streams to detect concordance or discordance
    between organizational operational demands and self-reported wellness.
    Strictly provides objective decision support without stigmatizing language.
    """
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise ValueError(f"Personnel {personnel_id} not found")

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # 1. ORGANIZATIONAL OPERATIONAL LOAD
    roster_rows = db.query(DutyRoster).filter(
        DutyRoster.personnel_id == personnel_id,
        DutyRoster.date >= (now.date() - timedelta(days=30))
    ).all()

    night_shifts = sum(1 for r in roster_rows if r.shift_type == "night")
    consecutive_days = 0
    # Sort descending by date to compute current duty streak
    sorted_roster = sorted(roster_rows, key=lambda r: r.date, reverse=True)
    for r in sorted_roster:
        if r.shift_type != "off":
            consecutive_days += 1
        else:
            break

    # 2. HR & LEAVE ADMINISTRATION
    leave_records = db.query(LeaveRecord).filter(
        LeaveRecord.personnel_id == personnel_id,
        LeaveRecord.start_date >= (now.date() - timedelta(days=180))
    ).all()
    total_leaves = len(leave_records)
    denied_leaves = sum(1 for l in leave_records if l.status == "rejected")
    leave_denial_rate = (denied_leaves / total_leaves) if total_leaves > 0 else 0.0

    hard_area_months = personnel.hard_area_months or 0
    area_weight = 0.35 if personnel.unit and personnel.unit.operational_area == "hard" else 0.15

    # 3. SELF-REPORTED ASSESSMENTS
    assessments = db.query(SelfAssessment).filter(
        SelfAssessment.personnel_id == personnel_id,
        SelfAssessment.assessed_at >= (now - timedelta(days=14))
    ).all()

    # Check for Cold-Start (new recruit or recent unit transfer < 7 days data)
    cold_start_imputed = False
    if len(roster_rows) < 7 and not assessments:
        cold_start_imputed = True
        # Bayesian trade-prior baseline imputation
        trade_prior = {"GD": 0.28, "Armorer": 0.20, "Radio Operator": 0.22, "Medic": 0.24, "Driver": 0.25}.get(personnel.trade or "GD", 0.25)
        duty_load_factor = min(1.0, trade_prior + area_weight)
        org_burden = min(1.0, max(0.05, duty_load_factor))
    else:
        # Compute Organizational Burden Score (0.0 to 1.0)
        duty_load_factor = min(1.0, (night_shifts / 14.0) * 0.4 + (consecutive_days / 14.0) * 0.3 + (hard_area_months / 36.0) * 0.3)
        leave_load_factor = min(1.0, leave_denial_rate * 0.7 + (total_leaves / 5.0) * 0.3)
        org_burden = min(1.0, max(0.05, duty_load_factor * 0.65 + leave_load_factor * 0.20 + area_weight * 0.15))

    if assessments:
        avg_stress = sum(a.stress_level for a in assessments) / len(assessments)
        avg_mood = sum(a.mood_score for a in assessments) / len(assessments)
        avg_sleep_q = sum(a.sleep_quality for a in assessments) / len(assessments)
        # Invert mood & sleep so higher means higher strain
        subjective_strain = ((avg_stress / 5.0) * 0.4 + ((6.0 - avg_mood) / 5.0) * 0.3 + ((6.0 - avg_sleep_q) / 5.0) * 0.3)
        self_strain = min(1.0, max(0.05, subjective_strain))
        self_completeness = min(1.0, len(assessments) / 7.0)
        self_freshness = (now - assessments[-1].assessed_at.replace(tzinfo=None)).total_seconds() / 86400.0 if assessments[-1].assessed_at else 1.0
    else:
        self_strain = 0.25  # Neutral default baseline
        self_completeness = 0.0
        self_freshness = 14.0

    # 4. PEER BUDDY SIGNALS
    buddy_signals = db.query(BuddySignal).filter(
        BuddySignal.unit_id == personnel.unit_id,
        BuddySignal.submitted_at >= (now - timedelta(days=30))
    ).all()
    buddy_count = len(buddy_signals)
    buddy_factor = min(1.0, buddy_count / 5.0)

    # 5. MATHEMATICAL STOIC MASKING DECEPTION INDEX (SMDI)
    # SMDI = 1 / (1 + exp(-k * (alpha * OrgBurden + beta * Buddy - gamma * SelfStrain - theta)))
    # High score (> 0.65) indicates active concealment/masking under military stigma pressure.
    logit = 6.0 * (0.50 * org_burden + 0.30 * buddy_factor - 0.45 * self_strain - 0.15)
    smdi_score = round(1.0 / (1.0 + math.exp(-logit)), 4)

    # 6. CONFLICT CLASSIFICATION & DECISION SUPPORT
    delta = round(abs(org_burden - self_strain), 4)

    if org_burden >= 0.60 and self_strain <= 0.35:
        conflict_detected = True
        conflict_type = "DISCORDANT_LOW_SELF_REPORT"
        # Escalate to CRITICAL if peer buddy signals corroborate organizational burden
        if buddy_count >= 3:
            severity = "CRITICAL"

            narrative = (
                f"CRITICAL Evidence conflict with peer corroboration: Self-reported strain is low ({self_strain:.2f}/1.0), "
                f"contradicted by heavy operational duty indicators ({org_burden:.2f}/1.0) "
                f"comprising {consecutive_days} consecutive duty days, {night_shifts} night shifts in 30d, "
                f"and {denied_leaves} recent leave denials. Additionally, {buddy_count} anonymous peer buddy signals "
                f"have been raised for this unit in 30d, corroborating systemic strain. "
                f"Trooper may be exhibiting stoic masking under acute fatigue and stigma pressure."
            )
            recommendation = "URGENT: Initiate discreet welfare officer personal visit. Do NOT rely solely on self-reports. Cross-reference duty roster for immediate rest rotation."
        else:
            severity = "ELEVATED"
            narrative = (
                f"Evidence conflict detected: Self-reported strain is low ({self_strain:.2f}/1.0), "
                f"in contrast with heavy operational duty indicators ({org_burden:.2f}/1.0) "
                f"comprising {consecutive_days} consecutive duty days, {night_shifts} night shifts in 30d, "
                f"and {denied_leaves} recent leave denials. Trooper may be masking acute fatigue or experiencing stigma."
            )
            recommendation = "Initiate discreet, non-stigmatizing administrative welfare check and schedule routine rest rotation."
    elif org_burden <= 0.35 and self_strain >= 0.60:
        conflict_detected = True
        conflict_type = "DISCORDANT_HIGH_SUBJECTIVE_STRAIN"
        severity = "MODERATE"
        narrative = (
            f"Evidence divergence detected: Elevated subjective distress reported ({self_strain:.2f}/1.0) "
            f"despite low operational workload burden ({org_burden:.2f}/1.0). "
            f"May reflect domestic friction, familial distress, financial stress, or personal health issues outside duty rosters."
        )
        recommendation = "Offer confidential counseling and welfare officer consultation focused on familial or domestic support."
    elif org_burden >= 0.60 and self_strain >= 0.60:
        conflict_detected = False
        conflict_type = "CONCORDANT_ACUTE_STRAIN"
        severity = "ELEVATED"
        narrative = (
            f"Evidence concordance confirmed: High subjective distress ({self_strain:.2f}) matches heavy operational "
            f"workload burden ({org_burden:.2f}). Clear operational burnout indicators present across all sources."
        )
        recommendation = "Prioritize urgent URO roster rebalancing, rest relief, and welfare officer case intervention."
    else:
        conflict_detected = False
        conflict_type = "CONCORDANT_WELLNESS"
        severity = "NONE"
        narrative = (
            f"Evidence concordance confirmed: Workload demands ({org_burden:.2f}) and self-reported wellness ({self_strain:.2f}) "
            f"are balanced within normative operational thresholds."
        )
        recommendation = "Maintain standard operational duty cycles and continue longitudinal wellness monitoring."

    # 6. PROVENANCE DATA SOURCES
    provenance_list = [
        EvidenceSourceProvenance(
            source_name="Company Duty Roster",
            source_type="ORGANIZATIONAL_DUTY",
            is_self_reported=False,
            reliability_weight=0.95,
            data_completeness=1.0 if len(roster_rows) >= 25 else round(len(roster_rows) / 30.0, 2),
            freshness_days=1.0,
            evidence_summary=f"{len(roster_rows)} duty entries (30d), {night_shifts} night shifts, {consecutive_days} consecutive duty streak."
        ),
        EvidenceSourceProvenance(
            source_name="Battalion Leave Registry",
            source_type="ADMIN_HR_RECORDS",
            is_self_reported=False,
            reliability_weight=0.98,
            data_completeness=1.0,
            freshness_days=2.0,
            evidence_summary=f"{total_leaves} applications in 180d, {denied_leaves} rejections ({leave_denial_rate:.0%} denial rate)."
        ),
        EvidenceSourceProvenance(
            source_name="Trooper Self-Assessment",
            source_type="SELF_ASSESSMENT",
            is_self_reported=True,
            reliability_weight=0.75,
            data_completeness=round(self_completeness, 2),
            freshness_days=round(self_freshness, 1),
            evidence_summary=f"{len(assessments)} voluntary logs in 14d. Stress={self_strain:.2f}/1.0."
        ),
        EvidenceSourceProvenance(
            source_name="Anonymous Buddy Signals",
            source_type="PEER_BUDDY_SIGNAL",
            is_self_reported=False,
            reliability_weight=0.82,
            data_completeness=0.90,
            freshness_days=3.0,
            evidence_summary=f"{buddy_count} signals recorded in unit over 30 days."
        ),
    ]

    return EvidenceConflictReport(
        personnel_id=personnel_id,
        conflict_detected=conflict_detected,
        conflict_type=conflict_type,
        severity=severity,
        organizational_burden_score=round(org_burden, 4),
        self_reported_strain_score=round(self_strain, 4),
        divergence_delta=delta,
        stoic_masking_deception_index=smdi_score,
        cold_start_imputed=cold_start_imputed,
        decision_support_narrative=narrative,
        recommended_welfare_action=recommendation,
        provenance_sources=provenance_list
    )

