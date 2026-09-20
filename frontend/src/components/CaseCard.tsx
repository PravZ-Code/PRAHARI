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
      className={`p-4 rounded-m3-2xl border transition-all duration-200 cursor-pointer shadow-m3-1 ${
        isSelected
          ? "bg-m3-surface-container-high border-m3-primary shadow-m3-2 ring-2 ring-m3-primary/30"
          : "bg-m3-surface-container border-m3-outline-variant/60 hover:bg-m3-surface-container-high hover:border-m3-outline"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-m3-surface-container-highest border border-m3-outline-variant flex items-center justify-center text-m3-primary">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-m3-on-surface text-sm leading-tight">
              {welfareCase.personnel_name}
            </h4>
            <p className="text-xs text-m3-on-surface-variant font-medium">
              {welfareCase.personnel_rank} • {welfareCase.unit_name}
            </p>
          </div>
        </div>

        <RiskBadge level={welfareCase.risk_level} size="sm" />
      </div>

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-m3-outline-variant/60 text-xs">
        <span className="text-m3-on-surface-variant font-medium flex items-center gap-1.5">
          {trigger ? <trigger.Icon className="w-3.5 h-3.5 text-m3-primary" /> : <Bell className="w-3.5 h-3.5 text-m3-primary" />}
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
  );
};
