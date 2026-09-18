export type UserRole = "personnel" | "jawan" | "soldier" | "commander" | "welfare" | "welfare_officer" | "admin";
export type RiskLevel = "green" | "yellow" | "orange" | "red";

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name?: string | null;
  rank?: string | null;
  email?: string | null;
  service_number?: string | null;
  unit_name?: string | null;
  personnel_id?: string | null;
  unit_id?: string | null;
}

export interface UnitCardData {
  id: string;
  name: string;
  location?: string;
  operational_area: string;
  strength: number;
  readiness_score: number;
  risk_distribution: Record<RiskLevel, number>;
}

export interface UnitReadinessDetail {
  unit_id: string;
  unit_name: string;
  readiness_score: number;
  readiness_trend: { date: string; score: number }[];
  risk_distribution: Record<RiskLevel, number>;
  personnel_count: number;
}

export interface WorkloadTrend {
  date: string;
  avg_hours: number;
  night_shift_count: number;
  day_shift_count: number;
  off_count: number;
  avg_consecutive_days_on: number;
}

export interface DutyDay {
  day: number;
  date: string;
  shift: "DAY" | "NIGHT" | "EXTENDED" | "REST" | "DOUBLE";
  hours: number;
  fatigueScore: number;
}

export interface TrooperFatigueProfile {
  id: string;
  name: string;
  rank: string;
  trade: string;
  consecutiveDays: number;
  nightShiftPct: number;
  days: DutyDay[];
}

export interface UnitFatigueResponse {
  unit_id: string;
  troopers: TrooperFatigueProfile[];
}

export type TrajectoryStatus = "STABLE" | "IMPROVING" | "RISING" | "RISING_RAPIDLY" | "RECOVERING";

export interface ShapFactor {
  feature: string;
  display_name?: string;
  source_category?: "HR" | "Self-Report" | "Wellness" | "Peer Signal" | "Operational";
  value?: number | null;
  impact: number;
  contribution_pct?: number;
}

export interface PredictionSummary {
  risk_score: number;
  risk_level: RiskLevel | "insufficient_evidence";
  confidence: number;
  confidence_score?: number;
  data_quality: number;
  trajectory?: TrajectoryStatus;
  prob_7d?: number;
  prob_14d?: number;
  prob_30d?: number;
  abstention_flag?: boolean;
  abstention_reason?: string | null;
  signal_reliability?: "high" | "moderate" | "low";
  what_changed?: {
    stress_delta_14d?: number;
    sleep_quality_delta?: number;
    consecutive_duty_days?: number;
    night_shifts_14d?: number;
    summary?: string;
  };
  shap_top_factors: ShapFactor[];
}

export interface PersonalAccessLogItem {
  id: string;
  timestamp: string;
  accessor_name: string;
  accessor_role: string;
  accessor_rank?: string | null;
  action: string;
  endpoint: string;
  purpose_description: string;
  statutory_compliance: string;
  tamper_verified: boolean;
}

export interface PersonalAccessLogResponse {
  personnel_id: string;
  name: string;
  rank: string;
  total_access_events: number;
  ledger_integrity_verified: boolean;
  privacy_firewall_status: string;
  access_logs: PersonalAccessLogItem[];
}

export interface SoldierWellbeingData {
  personnel_id: string;
  name: string;
  rank: string;
  service_number?: string;
  trade?: string;
  unit_name?: string;
  wellbeing_status: string;
  risk_score: number;
  risk_level: string;
  trajectory: TrajectoryStatus;
  multi_horizon_forecast: {
    prob_7d: number;
    prob_14d: number;
    prob_30d: number;
  };
  model_confidence: number;
  data_completeness: number;
  signal_reliability: "high" | "moderate" | "low";
  abstention_flag: boolean;
  abstention_reason?: string | null;
  what_changed: {
    stress_delta_14d?: number;
    sleep_quality_delta?: number;
    consecutive_duty_days?: number;
    night_shifts_14d?: number;
    summary?: string;
  };
  contributing_factors: ShapFactor[];
  assessments_completed: number;
  statutory_confidentiality: {
    section_21_active: boolean;
    command_firewall: string;
    data_protection_act: string;
  };
}

export interface WelfareCaseItem {
  id: string;
  personnel_id: string;
  personnel_name: string;
  personnel_rank: string;
  unit_name: string;
  risk_level: RiskLevel;
  risk_score?: number;
  triggered_by: string;
  status: string;
  created_at: string;
  sla_acknowledge_deadline: string;
  sla_plan_deadline: string;
  sla_breached: boolean;
  hours_until_ack_deadline: number;
  escalation_level: number;
}

export interface WelfareCaseDetailData {
  id: string;
  personnel_id?: string;
  personnel: {
    id: string;
    name: string;
    rank: string;
    service_number: string;
    unit_name: string;
    hard_area_months: number;
    total_transfers: number;
    current_posting_date: string;
  };
  triggered_by: string;
  risk_level_at_creation: RiskLevel;
  status: string;
  created_at: string;
  acknowledged_at?: string | null;
  plan_created_at?: string | null;
  resolved_at?: string | null;
  sla_acknowledge_deadline: string;
  sla_plan_deadline: string;
  sla_breached: boolean;
  hours_until_ack_deadline?: number;
  escalation_level: number;
  intervention_type?: string | null;
  intervention_notes?: string | null;
  outcome_notes?: string | null;
  latest_prediction?: PredictionSummary;
  buddy_signals_this_month: number;
  escalation_history: {
    from_level: number;
    to_level: number;
    reason: string;
    escalated_at: string;
  }[];
}

export interface SwapItem {
  swap_id: number;
  roster_id_a?: string;
  roster_id_b?: string;
  trade?: string;
  person_a: {
    id: string;
    name: string;
    rank: string;
    trade?: string;
    risk_level: RiskLevel | string;
    current_duty: string;
    clinical_redacted?: boolean;
  };
  person_b: {
    id: string;
    name: string;
    rank: string;
    trade?: string;
    risk_level: RiskLevel | string;
    current_duty: string;
    clinical_redacted?: boolean;
  };
  date: string;
  projected_risk_change_a?: { from: number; to: number };
  projected_risk_change_b?: { from: number; to: number };
}

export interface URORunData {
  run_id: string;
  unit_id: string;
  before: Record<RiskLevel, number>;
  after: Record<RiskLevel, number>;
  swaps: SwapItem[];
  risk_reduction_pct: number;
  status: string;
  commander_approved?: boolean;
  commander_approved_at?: string | null;
  commander_user_id?: string | null;
  welfare_approved?: boolean;
  welfare_approved_at?: string | null;
  welfare_user_id?: string | null;
  roster_committed?: boolean;
}

export interface BuddyWeekSummary {
  week_number?: number;
  year?: number;
  total_signals: number;
  by_category?: Record<string, number>;
  avg_concern_level?: number;
  week_start?: string;
  by_severity?: Record<string, number>;
}

export interface BuddyUnitSummaryResponse {
  unit_id: string;
  unit_name: string;
  weeks?: BuddyWeekSummary[];
  weeks_analyzed?: number;
  total_signals?: number;
  elevated_signals_count?: number;
  by_category?: { category: string; count: number; percentage: number }[];
  by_severity?: { level_1: number; level_2: number; level_3: number };
}

export interface CopilotBriefResponse {
  case_id: string;
  personnel_id: string;
  personnel_name: string;
  personnel_rank: string;
  unit_name: string;
  risk_level: string;
  risk_score: number;
  brief_markdown: string;
  cited_sources: string[];
  is_fallback: boolean;
  model_used: string;
  generated_at: string;
}

export interface CopilotChatResponse {
  response: string;
  cited_sources: string[];
  is_fallback: boolean;
  model_used: string;
  generated_at: string;
}

export interface ChainVerificationResponse {
  chain_status: "INTACT" | "COMPROMISED";
  total_blocks: number;
  tampered_index?: number | null;
  verified_count?: number;
  anchors_verified?: number;
  kms_signatures_verified?: boolean;
  bsa_section?: string;
  latest_block_hash?: string;
  external_anchor_root?: string | null;
  reason?: string;
  tamper_reason?: string;
  asymmetric_signatures_verified?: boolean;
  external_anchors_count?: number;
  external_anchors_verified?: boolean;
  kms_key_node?: string;
  evidentiary_standard?: string;
}


export interface ModelHealthData {
  model_version: string;
  brier_score?: number;
  last_trained?: string | null;
  latest_snapshot?: {
    date: string;
    total_predictions: number;
    distribution: Record<RiskLevel, number>;
    avg_confidence: number;
    avg_data_quality: number;
    calibration_error: number;
    drift_detected: boolean;
  };
  trend_7d: {
    date: string;
    avg_confidence: number;
    drift_detected: boolean;
  }[];
}

export interface EvidenceSourceProvenance {
  source_name: string;
  source_type: string;
  is_self_reported: boolean;
  reliability_weight: number;
  data_completeness: number;
  freshness_days: number;
  evidence_summary: string;
}

export interface EvidenceConflictReport {
  personnel_id: string;
  conflict_detected: boolean;
  conflict_type: string;
  severity: string;
  organizational_burden_score: number;
  self_reported_strain_score: number;
  divergence_delta: number;
  decision_support_narrative: string;
  recommended_welfare_action: string;
  provenance_sources: EvidenceSourceProvenance[];
}

export interface BaselineComparisonPoint {
  metric_name: string;
  current_value: number;
  personal_baseline?: number | null;
  cohort_baseline: number;
  population_norm: number;
  z_score_personal?: number | null;
  z_score_cohort: number;
  status: string;
}

export interface TrajectoryPoint {
  timestamp: string;
  risk_score: number;
  risk_level?: string;
  workload_index: number;
  self_reported_index: number;
}

export interface TrendAnalysisReport {
  personnel_id: string;
  baseline_type_active: string;
  trajectory_classification: string;
  velocity_score: number;
  acceleration_score: number;
  risk_score_current: number;
  risk_score_30d_ago: number;
  delta_risk: number;
  baseline_comparisons: BaselineComparisonPoint[];
  trajectory_history: TrajectoryPoint[];
  clinical_decision_support_summary: string;
  recommended_action: string;
}

export interface CaseReassessResponse {
  case_id: string;
  personnel_id: string;
  personnel_name: string;
  initial_risk_score: number;
  initial_risk_level: string;
  current_risk_score: number;
  current_risk_level: string;
  delta_risk: number;
  recovery_status: string;
  reassessed_at: string;
  clinical_decision_support: string;
}
