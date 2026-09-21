import React, { useEffect, useState } from "react";
import { URORunData } from "@/lib/types";
import { RiskBadge } from "./RiskBadge";
import { ArrowRight, ShieldCheck, TrendingDown, CheckCircle, RefreshCw, Moon, Sun, Clock } from "lucide-react";
import { getStoredUser } from "@/lib/auth";

interface UROVisualizerProps {
  data: URORunData | null;
  loading?: boolean;
  onApprove?: () => void;
  isApproving?: boolean;
  viewerRole?: string;
}

export const UROVisualizer: React.FC<UROVisualizerProps> = ({
  data,
  loading = false,
  onApprove,
  isApproving = false,
  viewerRole,
}) => {
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setCurrentUserRole(user.role);
    }
  }, []);

  const effectiveRole = viewerRole || currentUserRole;
  const isCommander = effectiveRole === "commander";

  if (loading) {
    return (
      <div className="bg-m3-surface-container border border-m3-outline-variant/70 rounded-m3-3xl p-12 text-center space-y-4 shadow-m3-1">
        <RefreshCw className="w-9 h-9 text-m3-primary animate-spin mx-auto" />
        <h4 className="text-sm font-bold text-m3-on-surface">Finding Best Shift Swaps...</h4>
        <p className="text-xs text-m3-on-surface-variant max-w-sm mx-auto font-medium">
          Checking duty hours, soldier jobs, and required guard post staffing.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-m3-surface-container-low border border-m3-outline-variant/60 rounded-m3-2xl p-10 text-center text-m3-on-surface-variant text-sm font-medium">
        Click &quot;Find Best Shift Swaps&quot; to balance shifts and reduce soldier fatigue.
      </div>
    );
  }

  const beforeAcute = (data.before?.orange || 0) + (data.before?.red || 0);
  const afterAcute = (data.after?.orange || 0) + (data.after?.red || 0);

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Baseline Strain */}
        <div className="bg-m3-surface-container border border-m3-outline-variant/70 rounded-m3-2xl p-5 shadow-m3-1">
          <span className="text-xs text-m3-on-surface-variant font-semibold uppercase tracking-wider block">
            Current Overworked Soldiers
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-risk-red">{beforeAcute}</span>
            <span className="text-xs text-m3-on-surface-variant">
              soldiers needing rest
            </span>
          </div>
          <div className="flex gap-2.5 mt-3.5 text-[11px] font-medium">
            {isCommander ? (
              <>
                <span className="text-risk-red">Night: {data.before?.red || 0}</span>
                <span className="text-risk-orange">Split: {data.before?.orange || 0}</span>
                <span className="text-risk-yellow">Day: {data.before?.yellow || 0}</span>
                <span className="text-risk-green">Rest: {data.before?.green || 0}</span>
              </>
            ) : (
              <>
                <span className="text-risk-green">Green: {data.before?.green}</span>
                <span className="text-risk-yellow">Yellow: {data.before?.yellow}</span>
                <span className="text-risk-orange">Orange: {data.before?.orange}</span>
                <span className="text-risk-red">Red: {data.before?.red}</span>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Optimized Strain */}
        <div className="bg-m3-surface-container border border-m3-outline-variant/70 rounded-m3-2xl p-5 shadow-m3-1">
          <span className="text-xs text-m3-on-surface-variant font-semibold uppercase tracking-wider block">
            After Recommended Swaps
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-risk-green">{afterAcute}</span>
            <span className="text-xs text-m3-on-surface-variant">
              soldiers needing rest
            </span>
          </div>
          <div className="flex gap-2.5 mt-3.5 text-[11px] font-medium">
            {isCommander ? (
              <>
                <span className="text-risk-red">Night: {data.after?.red || 0}</span>
                <span className="text-risk-orange">Split: {data.after?.orange || 0}</span>
                <span className="text-risk-yellow">Day: {data.after?.yellow || 0}</span>
                <span className="text-risk-green">Rest: {data.after?.green || 0}</span>
              </>
            ) : (
              <>
                <span className="text-risk-green">Green: {data.after?.green}</span>
                <span className="text-risk-yellow">Yellow: {data.after?.yellow}</span>
                <span className="text-risk-orange">Orange: {data.after?.orange}</span>
                <span className="text-risk-red">Red: {data.after?.red}</span>
              </>
            )}
          </div>
        </div>

        {/* Card 3: Net Recovery */}
        <div className="bg-gradient-to-br from-m3-primary-container to-m3-surface-container-high border border-m3-primary/40 rounded-m3-2xl p-5 flex flex-col justify-between shadow-m3-2">
          <div>
            <span className="text-xs text-m3-on-primary-container font-bold uppercase tracking-wider block flex items-center gap-1.5 font-heading">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              Overall Fatigue Index Reduction
            </span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-4xl font-black text-white">
                {isCommander ? `+${data.risk_reduction_pct}%` : `-${data.risk_reduction_pct}%`}
              </span>
            </div>
          </div>
          <span className="text-xs text-m3-on-primary-container/80 font-medium">
            {`${data.swaps?.length || 0} shift swaps between soldiers with the same job`}
          </span>
        </div>
      </div>

      {/* Swaps Schedule Table */}
      <div className="bg-m3-surface-container border border-m3-outline-variant/70 rounded-m3-3xl overflow-hidden shadow-m3-1">
        <div className="p-5 border-b border-m3-outline-variant/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-m3-on-surface text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-risk-green" />
              Recommended Shift Swaps
            </h4>
            <p className="text-xs text-m3-on-surface-variant mt-0.5">
              Tired soldiers on long night shifts are moved to lighter day duty. Well-rested soldiers take over guard duty.
            </p>
          </div>

          {onApprove && data.status !== "approved" && (
            <button
              onClick={onApprove}
              disabled={isApproving}
              className="m3-btn-filled bg-risk-green text-black hover:bg-risk-green/90 font-bold text-xs shadow-md shrink-0"
            >
              <CheckCircle className="w-4 h-4" />
              {isApproving ? "Saving..." : "Review & Approve Swaps"}
            </button>
          )}

          {data.status === "approved" && (
            <span className="bg-risk-green-container text-risk-on-green-container border border-risk-green/40 text-xs font-bold px-3.5 py-1 rounded-full flex items-center gap-1.5 shrink-0">
              <CheckCircle className="w-3.5 h-3.5 text-risk-green" /> New Schedule Approved & Saved
            </span>
          )}
        </div>

        <div className="divide-y divide-m3-outline-variant/40">
          {(data.swaps || []).map((swap) => (
            <div
              key={swap.swap_id}
              className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-m3-surface-container-high/60 transition-colors text-xs"
            >
              {/* Person A (Relieved Trooper) */}
              <div className="flex items-center gap-3 min-w-[240px]">
                <div className="w-7 h-7 rounded-full bg-risk-red-container text-risk-on-red-container border border-risk-red/40 flex items-center justify-center font-bold text-[11px] shrink-0">
                  {swap.swap_id}
                </div>
                <div>
                  <div className="font-bold text-m3-on-surface flex items-center gap-2 flex-wrap">
                    <span>{swap.person_a.name}</span>
                    <span className="text-[10px] text-m3-on-surface-variant font-mono">
                      ({swap.person_a.rank || "Constable"} • {swap.trade || swap.person_a.trade || "GD"})
                    </span>
                    {isCommander ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80 flex items-center gap-1">
                        <Moon className="w-3 h-3 text-amber-400" /> NEEDS REST
                      </span>
                    ) : (
                      <RiskBadge level={swap.person_a.risk_level} size="sm" />
                    )}
                  </div>

                  <p className="text-[11px] text-risk-red font-semibold mt-0.5">
                    Relieved from: <strong className="uppercase">{swap.person_a.current_duty}</strong>
                  </p>

                  {isCommander ? (
                    <p className="text-[10px] text-m3-on-surface-variant font-medium mt-0.5">
                      Shift Adjustment: <strong className="text-risk-green">Moved: Night Shift to Lighter Day Duty</strong>
                    </p>
                  ) : (
                    <p className="text-[10px] text-m3-on-surface-variant font-medium mt-0.5">
                      Risk: {((swap.projected_risk_change_a?.from || 0) * 100).toFixed(0)}% to{" "}
                      <strong className="text-risk-green font-bold">
                        {((swap.projected_risk_change_a?.to || 0) * 100).toFixed(0)}%
                      </strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Arrow Indicator */}
              <div className="hidden md:flex flex-col items-center justify-center px-4 text-m3-on-surface-variant">
                <span className="text-[10px] font-mono text-m3-on-surface-variant mb-0.5">{swap.date}</span>
                <ArrowRight className="w-4 h-4 text-m3-primary" />
                <span className="text-[9px] text-m3-on-surface-variant uppercase tracking-wider font-semibold">
                  Swap Duties
                </span>
              </div>

              {/* Person B (Absorbing Trooper) */}
              <div className="flex items-center gap-3 min-w-[240px]">
                <div>
                  <div className="font-bold text-m3-on-surface flex items-center gap-2 flex-wrap">
                    <span>{swap.person_b.name}</span>
                    <span className="text-[10px] text-m3-on-surface-variant font-mono">
                      ({swap.person_b.rank || "Constable"} • {swap.trade || swap.person_b.trade || "GD"})
                    </span>
                    {isCommander ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400" /> WELL RESTED
                      </span>
                    ) : (
                      <RiskBadge level={swap.person_b.risk_level} size="sm" />
                    )}
                  </div>

                  <p className="text-[11px] text-risk-green font-semibold mt-0.5">
                    Takes over: <strong className="uppercase">{swap.person_a.current_duty}</strong>
                  </p>

                  {isCommander ? (
                    <p className="text-[10px] text-m3-on-surface-variant font-medium mt-0.5">
                      Rest Check: <strong className="text-m3-on-surface">Has had 8+ hours of rest</strong>
                    </p>
                  ) : (
                    <p className="text-[10px] text-m3-on-surface-variant font-medium mt-0.5">
                      Risk: {((swap.projected_risk_change_b?.from || 0) * 100).toFixed(0)}% to{" "}
                      <span className="text-m3-on-surface font-semibold">
                        {((swap.projected_risk_change_b?.to || 0) * 100).toFixed(0)}% (safe capacity)
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Section 21 MHA Privacy Compliance Notice Footer */}
        {isCommander && (
          <div className="p-3.5 bg-slate-950/70 border-t border-slate-800/80 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Privacy Protection: Medical and personal notes are kept private. Only work hours and rest times are shown.</span>
            </span>
            <span className="text-emerald-400 font-bold shrink-0">Private & Protected</span>
          </div>
        )}
      </div>
    </div>
  );
};

