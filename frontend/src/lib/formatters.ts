/**
 * PRAHARI Human-Readable Text Formatters
 * Formats database enums, snake_case identifiers, and operational telemetry
 * into clear, soldier-friendly English in compliance with UX4G 3.0 & GIGW 3.0.
 */

const KNOWN_ACRONYMS = new Set([
  "CRPF",
  "MHA",
  "GD",
  "MOS",
  "SLA",
  "IVR",
  "SMS",
  "USSD",
  "DPDP",
  "HR",
  "ID",
  "12H",
  "48H",
  "SOS",
  "PWA",
  "AI",
  "URO",
  "SHAP",
  "CO",
]);

/**
 * Converts snake_case, kebab-case, or screaming snake_case to polished Title Case English.
 * Preserves known military and technical acronyms (e.g. CRPF, HR, SLA, MOS, IVR).
 */
export function formatHumanReadable(text?: string | null, fallback: string = ""): string {
  if (!text || typeof text !== "string") return fallback;

  // Trim and remove any wrapping brackets like [Roster]
  const cleaned = text.replace(/^[\[\(]+|[\]\)]+$/g, "").trim();
  if (!cleaned) return fallback;

  // Split by underscores, hyphens, and whitespace
  const words = cleaned
    .replace(/[_\-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return fallback;

  return words
    .map((word) => {
      const upper = word.toUpperCase();
      if (KNOWN_ACRONYMS.has(upper)) {
        return upper;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Formats service request, grievance, and leave categories into clear, respectful English.
 */
const CATEGORY_MAP: Record<string, string> = {
  annual_leave: "Annual Leave",
  casual_leave: "Casual Leave",
  family_emergency: "Family Emergency",
  medical_emergency: "Medical Support / Sick Leave",
  bereavement: "Bereavement Leave",
  acute_domestic_crisis: "Urgent Domestic Support",
  administrative_delay: "Administrative Grievance",
  child_education: "Child Education Support",
  pay_and_allowances: "Pay & Allowances",
  welfare_support: "Welfare Support",
  general_leave: "General Leave",
  grievance: "Grievance Redressal",
  leave: "Leave Application",
  other_help: "Welfare Assistance",
  voluntary_self_reports: "Daily Pulse & Notes",
  daily_wellness_pulse: "Daily Rest & Wellness Check-in",
  informal_feedback: "Personal Notes & Feedback",
  all_voluntary_telemetry: "All Voluntary Feedback Records",
  duty_roster: "Duty Roster Record",
  leave_record: "Leave Record / Application",
  posting_tenure: "Posting Tenure / Station Duration",
  shift_type: "Shift Timing / Type",
  prior_to_last_30_days: "Records Older Than 30 Days",
  all_historical: "All Historical Records",
};

export function formatCategory(cat?: string | null, fallback: string = "General Leave"): string {
  if (!cat) return fallback;
  const key = cat.trim().toLowerCase();
  if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
  return formatHumanReadable(cat, fallback);
}

/**
 * Formats service request and workflow statuses into soldier-friendly English.
 */
const STATUS_MAP: Record<string, string> = {
  approved: "Approved",
  rejected: "Rejected",
  pending: "Under Review",
  waiting_for_review: "Waiting for Review",
  waiting_for_decision: "Waiting for Decision",
  fast_tracked: "Fast-Track (12H)",
  in_progress: "In Progress",
  active: "Active",
  closed: "Resolved",
  escalated: "Escalated to Battalion",
  filed: "Filed",
  completed: "Completed",
  need_more_support: "Follow-up Required",
  critical_deviation: "High Workload Shift",
};

export function formatStatus(status?: string | null, fallback: string = "Under Review"): string {
  if (!status) return fallback;
  const key = status.trim().toLowerCase();
  if (STATUS_MAP[key]) return STATUS_MAP[key];
  return formatHumanReadable(status, fallback);
}

/**
 * Formats welfare and telemetry trigger reasons into clear descriptions.
 */
const TRIGGER_MAP: Record<string, string> = {
  model_alert: "Duty Strain Alert",
  strain_escalation: "Elevated Duty Strain",
  help_request: "Trooper Support Request",
  buddy_signal: "Peer Buddy Alert",
  leave_delay: "Leave Request Delay",
  roster_clustering: "Night Shift Clustering",
  manual: "Officer Referral",
  manual_referral: "Officer Referral",
  ivr_emergency_call: "Helpline Emergency Call (IVR)",
  sms_sos: "Emergency SMS Alert",
  ussd_sos: "Emergency Keypad Alert",
  leave_grievance: "Leave Application Grievance",
  high_risk_threshold: "High Workload Warning",
  consecutive_duty: "Consecutive Duty Days",
};

export function formatTrigger(trigger?: string | null, fallback: string = "System Notice"): string {
  if (!trigger) return fallback;
  const key = trigger.trim().toLowerCase();
  if (TRIGGER_MAP[key]) return TRIGGER_MAP[key];
  return formatHumanReadable(trigger, fallback);
}

/**
 * Formats post-intervention recovery outcomes and reassessment statuses.
 */
const RECOVERY_STATUS_MAP: Record<string, string> = {
  recovering: "Rest Post-Duty",
  improved: "Rest Stabilized",
  partial_recovery: "Gradual Improvement",
  restabilized: "Baseline Restored",
  accelerating_strain: "Rapidly Rising Fatigue",
  stable: "Stable Rest",
  no_change: "Monitoring Trend",
};

export function formatRecoveryStatus(status?: string | null, fallback: string = "Active Recovery"): string {
  if (!status) return fallback;
  const key = status.trim().toLowerCase();
  if (RECOVERY_STATUS_MAP[key]) return RECOVERY_STATUS_MAP[key];
  return formatHumanReadable(status, fallback);
}

/**
 * Formats data provenance and audit source labels.
 */
const SOURCE_TYPE_MAP: Record<string, string> = {
  duty_roster: "Duty Roster Record",
  leave_records: "Leave Records",
  telecom_ivr: "Helpline Call (IVR)",
  self_assessment: "Self-Assessment Pulse",
  buddy_signal: "Buddy Alert Signal",
  wearable_biometrics: "Circadian Telemetry",
};

export function formatSourceType(source?: string | null, fallback: string = "Verified Record"): string {
  if (!source) return fallback;
  const key = source.trim().toLowerCase();
  if (SOURCE_TYPE_MAP[key]) return SOURCE_TYPE_MAP[key];
  return formatHumanReadable(source, fallback);
}

/**
 * Formats trajectory and trend movement classifications.
 */
const TRAJECTORY_MAP: Record<string, string> = {
  improving: "Improving (Fatigue Easing)",
  recovering: "Recovering (Rest Post-Duty)",
  rising: "Rising (Fatigue Accumulating)",
  rising_rapidly: "Rising Rapidly (High Acute Load)",
  stable: "Stable (Balanced Baseline)",
  accelerating_strain: "Rapidly Rising Fatigue",
  elevated: "Elevated Operational Strain",
};

export function formatTrajectory(trajectory?: string | null, fallback: string = "Stable Baseline"): string {
  if (!trajectory) return fallback;
  const key = trajectory.trim().toLowerCase();
  if (TRAJECTORY_MAP[key]) return TRAJECTORY_MAP[key];
  return formatHumanReadable(trajectory, fallback);
}

/**
 * Formats buddy system concern categories into polite, supportive English.
 */
const CONCERN_MAP: Record<string, string> = {
  withdrawal: "Quiet / Withdrawn",
  mood_change: "Visible Stress or Mood Change",
  sleep: "Sleep Difficulty / Tiredness",
  aggression: "Irritation or Strain",
  general: "General Wellbeing Concern",
};

export function formatConcern(concern?: string | null, fallback: string = "Wellbeing Concern"): string {
  if (!concern) return fallback;
  const key = concern.trim().toLowerCase();
  if (CONCERN_MAP[key]) return CONCERN_MAP[key];
  return formatHumanReadable(concern, fallback);
}
