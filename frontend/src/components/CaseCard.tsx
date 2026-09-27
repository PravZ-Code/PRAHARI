import React from "react";
import { WelfareCaseItem } from "@/lib/types";
import { RiskBadge } from "./RiskBadge";
import { SLATimer } from "./SLATimer";
import { formatTrigger } from "@/lib/formatters";
import { User, Bell, BrainCircuit, ClipboardList, Siren, Users } from "lucide-react";

interface CaseCardProps {
  welfareCase: WelfareCaseItem;
  isSelected?: boolean;
  onClick?: () => void;
}

export const CaseCard: React.FC<CaseCardProps> = ({ welfareCase, isSelected = false, onClick }) => {
  const triggers: Record<string, { label: string; Icon: typeof Bell }> = {
    model_alert: { label: "AI Stress Alert", Icon: BrainCircuit },
    help_request: { label: "Soldier Help Request", Icon: Siren },
    buddy_signal: { label: "Buddy Alert", Icon: Users },
    manual: { label: "Officer Added", Icon: ClipboardList },
    ivr_emergency_call: { label: "Emergency Phone Call", Icon: Siren },
    sms_sos: { label: "Emergency SMS SOS", Icon: Siren },
    ussd_sos: { label: "Emergency Keypad SOS", Icon: Siren },
    leave_grievance: { label: "Leave Complaint", Icon: ClipboardList },
  };
  const trigger = triggers[welfareCase.triggered_by];

  return (
    <div
      onClick={onClick}
      className={`ux4g-card ux4g-card-outline cursor-pointer transition-all duration-200 ${
        isSelected
          ? "border-[var(--ux4g-color-primary-600)] shadow-md ring-2 ring-[var(--ux4g-color-primary-600)]/20"
          : "hover:border-[var(--ux4g-border-neutral-strong)]"
      }`}
    >
      <div className="ux4g-card-body p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--ux4g-bg-neutral-soft,#f5f5f5)] border border-[var(--ux4g-border-neutral-subtle,#e5e5e5)] flex items-center justify-center text-[var(--ux4g-text-brand-primary-default,#4A2BC2)]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h4 className="ux4g-card-title font-bold text-sm leading-tight text-[var(--ux4g-text-neutral-primary,#171717)]">
                {welfareCase.personnel_name}
              </h4>
              <p className="ux4g-card-sub-title text-xs text-[var(--ux4g-text-neutral-secondary,#404040)] font-medium">
                {welfareCase.personnel_rank} • {welfareCase.unit_name}
              </p>
            </div>
          </div>

          <RiskBadge level={welfareCase.risk_level} size="sm" />
        </div>

        <div className="ux4g-card-footer flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--ux4g-border-neutral-subtle,#e5e5e5)] text-xs">
          <span className="text-[var(--ux4g-text-neutral-secondary,#404040)] font-medium flex items-center gap-1.5">
            {trigger ? <trigger.Icon className="w-3.5 h-3.5 text-[var(--ux4g-text-brand-primary-default,#4A2BC2)]" /> : <Bell className="w-3.5 h-3.5 text-[var(--ux4g-text-brand-primary-default,#4A2BC2)]" />}
            {trigger?.label || formatTrigger(welfareCase.triggered_by)}
          </span>

          <SLATimer
            deadline={welfareCase.sla_acknowledge_deadline}
            isBreached={welfareCase.sla_breached}
            isAcknowledged={welfareCase.status !== "pending"}
            hoursRemaining={welfareCase.hours_until_ack_deadline}
            stage="ack"
          />
        </div>
      </div>
    </div>
  );
};
