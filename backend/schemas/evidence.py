from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class EvidenceSourceProvenance(BaseModel):
    source_name: str
    source_type: str  # 'ORGANIZATIONAL_DUTY', 'ADMIN_HR_RECORDS', 'SELF_ASSESSMENT', 'PEER_BUDDY_SIGNAL'
    is_self_reported: bool
    reliability_weight: float = Field(..., ge=0.0, le=1.0)
    data_completeness: float = Field(..., ge=0.0, le=1.0)
    freshness_days: float
    evidence_summary: str

class EvidenceConflictReport(BaseModel):
    personnel_id: str
    conflict_detected: bool
    conflict_type: str  # 'CONCORDANT_WELLNESS', 'CONCORDANT_ACUTE_STRAIN', 'DISCORDANT_LOW_SELF_REPORT', 'DISCORDANT_HIGH_SUBJECTIVE_STRAIN'
    severity: str  # 'NONE', 'LOW', 'MODERATE', 'ELEVATED'
    organizational_burden_score: float = Field(..., ge=0.0, le=1.0)
    self_reported_strain_score: float = Field(..., ge=0.0, le=1.0)
    divergence_delta: float
    stoic_masking_deception_index: Optional[float] = Field(None, ge=0.0, le=1.0, description="Mathematical SMDI deception metric")
    cold_start_imputed: bool = Field(False, description="Whether Bayesian cohort imputation was used for new recruits")
    decision_support_narrative: str
    recommended_welfare_action: str
    provenance_sources: List[EvidenceSourceProvenance]
