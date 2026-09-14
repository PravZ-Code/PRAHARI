import React from "react";
import { RiskLevel } from "@/lib/types";

interface RiskBadgeProps {
  level: RiskLevel | string;
  score?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, score, className = "", size = "md" }) => {
  const normLevel = (level || "green").toLowerCase();

  const colors: Record<string, string> = {
    green: "bg-risk-green-container/90 text-risk-on-green-container border-risk-green/40 shadow-sm",
    yellow: "bg-risk-yellow-container/90 text-risk-on-yellow-container border-risk-yellow/40 shadow-sm",
    orange: "bg-risk-orange-container/90 text-risk-on-orange-container border-risk-orange/40 shadow-sm",
    red: "bg-risk-red-container/90 text-risk-on-red-container border-risk-red/40 shadow-sm",
  };

  const dots: Record<string, string> = {
    green: "bg-risk-green",
    yellow: "bg-risk-yellow",
    orange: "bg-risk-orange",
    red: "bg-risk-red animate-pulse",
  };

  const sizeStyles = {
    sm: "text-[11px] px-2.5 py-0.5",
    md: "text-xs px-3 py-1",
    lg: "text-sm px-4 py-1.5 font-medium",
  };

  const labelMap: Record<string, string> = {
    green: "Normal",
    yellow: "Moderate",
    orange: "Elevated",
    red: "Urgent",
  };
  const displayLabel = labelMap[normLevel] || normLevel;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border tracking-wide font-semibold ${
        colors[normLevel] || colors.green
      } ${sizeStyles[size]} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dots[normLevel] || dots.green}`} />
      <span>{displayLabel}</span>
      {score !== undefined && (
        <span className="opacity-80 text-[10px] font-mono">({(score * 100).toFixed(0)}%)</span>
      )}
    </span>
  );
};
