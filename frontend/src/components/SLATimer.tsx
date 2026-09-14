import React from "react";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface SLATimerProps {
  deadline: string;
  isBreached: boolean;
  isAcknowledged?: boolean;
  isPlanCreated?: boolean;
  hoursRemaining?: number;
  stage?: "ack" | "plan";
}

export const SLATimer: React.FC<SLATimerProps> = ({
  deadline,
  isBreached,
  isAcknowledged,
  isPlanCreated,
  hoursRemaining,
  stage = "ack",
}) => {
  if (stage === "ack" && isAcknowledged) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-m3-on-secondary-container font-semibold bg-m3-secondary-container px-3 py-1 rounded-full border border-m3-secondary/30 shadow-sm">
        <CheckCircle2 className="w-3.5 h-3.5 text-m3-secondary" /> In Progress
      </span>
    );
  }

  if (stage === "plan" && isPlanCreated) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-m3-on-secondary-container font-semibold bg-m3-secondary-container px-3 py-1 rounded-full border border-m3-secondary/30 shadow-sm">
        <CheckCircle2 className="w-3.5 h-3.5 text-m3-secondary" /> Plan Ready
      </span>
    );
  }

  if (isBreached) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-m3-on-error-container bg-m3-error-container px-3 py-1 rounded-full border border-m3-error/40 animate-pulse shadow-sm">
        <AlertTriangle className="w-3.5 h-3.5 text-m3-error" /> TIME OVERDUE
      </span>
    );
  }

  const hours = hoursRemaining !== undefined ? hoursRemaining : 18;
  const isUrgent = hours < 6;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border shadow-sm ${
        isUrgent
          ? "bg-risk-yellow-container text-risk-on-yellow-container border-risk-yellow/40 animate-pulse"
          : "bg-m3-surface-container-high text-m3-on-surface border-m3-outline-variant"
      }`}
    >
      <Clock className={`w-3.5 h-3.5 ${isUrgent ? "text-risk-yellow" : "text-m3-on-surface-variant"}`} />
      <span>{hours.toFixed(0)}h left to respond</span>
    </span>
  );
};
