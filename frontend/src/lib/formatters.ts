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

/**
 * Formats request IDs into clean, official identifiers (e.g. PRH-260921-00427).
 * Removes raw UUIDs and technical offline prefixes like #offline-ws- from user view.
 */
export function formatRequestId(id?: string | null, filedAt?: string | null): string {
  if (!id) return "PRH-REQUEST";
  const trimmed = id.trim();
  if (/^PRH-\d{6}-\d+$/i.test(trimmed)) return trimmed.toUpperCase();
  if (/^PRH-\d{4}-\d+$/i.test(trimmed)) return trimmed.toUpperCase();

  let datePart = "";
  if (filedAt) {
    try {
      const d = new Date(filedAt);
      if (!isNaN(d.getTime())) {
        const yy = String(d.getFullYear()).slice(-2);
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        datePart = `${yy}${mm}${dd}`;
      }
    } catch {
      // ignore
    }
  }
  if (!datePart) {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    datePart = `${yy}${mm}${dd}`;
  }

  let hash = 0;
  const cleanId = trimmed.replace(/[^a-zA-Z0-9]/g, "");
  for (let i = 0; i < cleanId.length; i++) {
    hash = (hash << 5) - hash + cleanId.charCodeAt(i);
    hash |= 0;
  }
  const numericSuffix = String((Math.abs(hash) % 90000) + 10000);

  return `PRH-${datePart}-${numericSuffix}`;
}

/**
 * Formats descriptions, sanitizing raw technical or legal payloads for user display.
 */
export function formatDescription(desc?: string | null): string {
  if (!desc) return "No description provided.";
  if (desc.includes("DPDP ACT") || desc.includes("Statutory erasure") || desc.includes("data_category")) {
    return "Personal data correction / erasure request submitted under DPDP Act statutory guidelines.";
  }
  if (desc.startsWith("{") && desc.endsWith("}")) {
    try {
      const parsed = JSON.parse(desc);
      if (parsed.reason) return parsed.reason;
      if (parsed.description) return parsed.description;
    } catch {
      // ignore
    }
  }
  return desc;
}

/**
 * Formats wellbeing status into calm, non-diagnostic government categories.
 * Stable, Monitor, Support recommended, Support active.
 */
export function formatWellbeingStatus(status?: string | null, riskLevel?: string | null): {
  label: "Stable" | "Monitor" | "Support recommended" | "Support active";
  colorClass: string;
  dotColor: string;
  description: string;
} {
  const level = (riskLevel || "").toLowerCase();
  const s = (status || "").toLowerCase();

  if (level === "red" || s.includes("high strain") || s.includes("support active") || s.includes("critical")) {
    return {
      label: "Support active",
      colorClass: "bg-red-50 text-red-700 border-red-200",
      dotColor: "bg-red-500",
      description: "Support resources have been proactively made available to your unit.",
    };
  }
  if (level === "orange" || s.includes("elevated") || s.includes("support recommended") || s.includes("fatigue")) {
    return {
      label: "Support recommended",
      colorClass: "bg-amber-50 text-amber-800 border-amber-200",
      dotColor: "bg-amber-500",
      description: "Rest rotation or scheduled downtime is recommended.",
    };
  }
  if (level === "yellow" || s.includes("moderate") || s.includes("monitor")) {
    return {
      label: "Monitor",
      colorClass: "bg-blue-50 text-blue-700 border-blue-200",
      dotColor: "bg-blue-500",
      description: "Your duty pattern shows moderate activity; rest balance is being monitored.",
    };
  }

  return {
    label: "Stable",
    colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotColor: "bg-emerald-500",
    description: "Your recent duty and recovery pattern is within your normal range.",
  };
}

/**
 * Formats "Recent Changes" factor comparisons into plain, short, soldier-friendly English.
 * Strips clinical terminology (e.g. deep sleep architecture, cortisol, physiological recovery)
 * and presents clear, actionable insights for personnel self-service.
 */
export function formatRecentChange(factor: any): { title: string; detail: string } {
  if (!factor) {
    return { title: "Duty load normal", detail: "Regular shift rotation and recovery schedule." };
  }

  const id = String(factor.id || "").toLowerCase();
  const name = String(factor.name || "").toLowerCase();
  const isWorsening = factor.impact_direction === "worsening";
  const curr = String(factor.current_value || "");
  const base = String(factor.baseline_value || "");

  // 1. Night Patrol Density / Shifts
  if (id.includes("night") || name.includes("night")) {
    const numCurr = parseFloat(curr) || 0;
    const numBase = parseFloat(base) || 0;
    const diff = Math.round(Math.abs(numCurr - numBase) * 10) / 10;

    if (isWorsening || numCurr > numBase) {
      return {
        title: `Night duties: ${diff > 0 ? `${diff} more shifts than usual in last 2 weeks` : `${numCurr} night shifts logged`}`,
        detail: "More night duties than usual. Rest rotation is recommended.",
      };
    }
    return {
      title: `Night duties: ${numCurr} shifts in 2 weeks (normal range)`,
      detail: "Night duty rhythm is balanced.",
    };
  }

  // 2. Average Sleep Duration
  if (id.includes("sleep") || name.includes("sleep")) {
    const numCurr = parseFloat(curr) || 0;
    const numBase = parseFloat(base) || 0;
    const diff = Math.round(Math.abs(numCurr - numBase) * 10) / 10;

    if (isWorsening || numCurr < numBase) {
      return {
        title: `Sleep time: ${numCurr} hours/night (${diff > 0 ? `${diff} hrs less than usual` : "below target"})`,
        detail: "Less sleep recorded recently. Catching up on rest off duty will help.",
      };
    }
    return {
      title: `Sleep time: ${numCurr} hours per night (healthy rest)`,
      detail: "Sleep hours are within your healthy baseline.",
    };
  }

  // 3. Consecutive Duty Streak
  if (id.includes("consecutive") || name.includes("consecutive") || id.includes("duty_streak")) {
    const numCurr = parseInt(curr, 10) || 0;
    const numBase = parseInt(base, 10) || 0;

    if (isWorsening || numCurr > numBase) {
      return {
        title: `Duty streak: ${numCurr} continuous days on duty`,
        detail: `You have worked ${numCurr} days in a row. A full rest day is due soon.`,
      };
    }
    return {
      title: `Duty streak: ${numCurr} days (normal rotation)`,
      detail: "Regular shift rhythm with rest days scheduled.",
    };
  }

  // 4. Rest Gap Between Shifts
  if (id.includes("rest") || name.includes("gap") || name.includes("circadian")) {
    const numCurr = parseFloat(curr) || 0;
    if (isWorsening || (numCurr > 0 && numCurr < 8)) {
      return {
        title: `Break between shifts: ${curr || "Shorter break"}`,
        detail: "Breaks between duties are shorter than normal. Aim for a full 8-hour rest.",
      };
    }
    return {
      title: `Break between shifts: ${curr || "Adequate"}`,
      detail: "Healthy rest break between scheduled duties.",
    };
  }

  // 5. Leave Backlog / Petitions
  if (id.includes("leave") || name.includes("leave")) {
    return {
      title: "Leave requests: Pending company review",
      detail: "Your leave application is awaiting company commander review.",
    };
  }

  // Fallback cleaner for any arbitrary backend string:
  let cleanTitle = factor.name || "Duty adjustment";
  if (cleanTitle.includes("(")) {
    cleanTitle = cleanTitle.split("(")[0].trim();
  }
  if (factor.delta_display) {
    cleanTitle = `${cleanTitle}: ${factor.delta_display}`;
  }

  let cleanDetail = factor.explanation || "Schedule adjustment recorded.";
  cleanDetail = cleanDetail
    .replace(/reduce deep sleep architecture and drive fatigue escalation/gi, "may cause tiredness")
    .replace(/elevates cortisol and slows physiological recovery/gi, "reduces recovery time")
    .replace(/without a 24-hour stand-down breaches recovery barriers/gi, "exceeds recommended continuous duty")
    .replace(/violate the mandatory Section \d+ CRPF Rest Barrier standard/gi, "is less than the standard 8-hour rest")
    .replace(/generate acute psychological stress due to domestic separation/gi, "is pending review");

  return {
    title: cleanTitle,
    detail: cleanDetail,
  };
}


