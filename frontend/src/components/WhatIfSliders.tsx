import React, { useState, useEffect } from "react";
import { Sliders, Calculator, ArrowDown, Loader2, CheckCircle2 } from "lucide-react";
import { RiskBadge } from "./RiskBadge";

interface WhatIfSlidersProps {
  onSimulate: (scenario: any) => Promise<any>;
  currentRiskScore: number;
  currentRiskLevel: string;
}

export const WhatIfSliders: React.FC<WhatIfSlidersProps> = ({
  onSimulate,
  currentRiskScore,
  currentRiskLevel,
}) => {
  const [shiftType, setShiftType] = useState<string>("day");
  const [addRestDays, setAddRestDays] = useState<number>(3);
  const [transferArea, setTransferArea] = useState<string>("peace");
  const [approveLeave, setApproveLeave] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);

  const handleRun = async () => {
    setLoading(true);
    try {
      const res = await onSimulate({
        shift_type: shiftType,
        add_rest_days: addRestDays,
        transfer_to_area: transferArea,
        approve_pending_leave: approveLeave,
      });
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleRun();
  }, [shiftType, addRestDays, transferArea, approveLeave]);

  return (
    <div className="bg-m3-surface-container border border-m3-outline-variant/70 rounded-m3-3xl p-6 space-y-6 shadow-m3-1">
      <div className="flex items-center justify-between border-b border-m3-outline-variant/60 pb-3">
        <h4 className="font-bold text-m3-on-surface text-sm flex items-center gap-2">
          <Sliders className="w-4 h-4 text-m3-primary" />
          Duty & Leave Relief Planner
        </h4>
        <span className="text-xs text-m3-on-surface-variant font-medium">Test duty and leave changes to see stress reduction</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4 text-xs">
          <div>
            <label className="text-m3-on-surface font-semibold block mb-1.5">
              Change Work Shift
            </label>
            <select
              value={shiftType}
              onChange={(e) => setShiftType(e.target.value)}
              className="w-full bg-m3-surface-container-lowest border border-m3-outline text-m3-on-surface rounded-m3-xl p-3 focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 outline-none text-xs font-medium transition-all"
            >
              <option value="day">Move to Day Duty Only (No Night Shifts)</option>
              <option value="split">Split Duty (Morning & Evening)</option>
              <option value="current">Keep Current Schedule</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-m3-on-surface font-semibold mb-1.5">
              <span>Add Rest Days:</span>
              <strong className="text-m3-primary px-2.5 py-0.5 rounded-full bg-m3-primary-container text-m3-on-primary-container text-xs">{addRestDays} days</strong>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              value={addRestDays}
              onChange={(e) => setAddRestDays(Number(e.target.value))}
              className="w-full accent-m3-primary cursor-pointer h-2 bg-m3-surface-container-highest rounded-lg"
            />
          </div>

          <div>
            <label className="text-m3-on-surface font-semibold block mb-1.5">
              Transfer to New Area
            </label>
            <select
              value={transferArea}
              onChange={(e) => setTransferArea(e.target.value)}
              className="w-full bg-m3-surface-container-lowest border border-m3-outline text-m3-on-surface rounded-m3-xl p-3 focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 outline-none text-xs font-medium transition-all"
            >
              <option value="peace">Transfer to Peace Area (Hyderabad / HQ)</option>
              <option value="semi-hard">Transfer to Semi-Difficult Area</option>
              <option value="none">Keep in Current Posting</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="approveLeave"
              checked={approveLeave}
              onChange={(e) => setApproveLeave(e.target.checked)}
              className="w-4 h-4 accent-m3-primary rounded cursor-pointer"
            />
            <label htmlFor="approveLeave" className="text-m3-on-surface font-medium cursor-pointer">
              Approve Pending Leave Requests
            </label>
          </div>

          <button
            onClick={handleRun}
            disabled={loading}
            className="m3-btn-filled w-full mt-3 shadow-md font-heading"
          >
            <Calculator className="w-4 h-4" />
            {loading ? "Calculating..." : "Calculate Expected Relief"}
          </button>
        </div>

        {/* Live Result Projection */}
        <div className="bg-m3-surface-container-low border border-m3-outline-variant/60 rounded-m3-2xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-m3-on-surface-variant uppercase tracking-wider">
                Expected Stress Change
              </span>
              {loading && (
                <span className="flex items-center gap-1 text-[10px] text-m3-primary font-semibold">
                  <Loader2 className="w-3 h-3 animate-spin" /> Calculating...
                </span>
              )}
            </div>

            <div className="flex items-center justify-around py-4 border-y border-m3-outline-variant/50">
              <div className="text-center">
                <span className="text-[10px] text-m3-on-surface-variant font-semibold block mb-1">Current Stress</span>
                <span className="text-3xl font-black text-risk-red">
                  {((result?.current?.risk_score ?? currentRiskScore) * 100).toFixed(0)}%
                </span>
                <div className="mt-1.5">
                  <RiskBadge level={result?.current?.risk_level ?? currentRiskLevel} size="sm" />
                </div>
              </div>

              <ArrowDown className="w-6 h-6 text-risk-green -rotate-90 md:rotate-0" />

              <div className="text-center">
                <span className="text-[10px] text-m3-on-surface-variant font-semibold block mb-1">After Changes</span>
                <span className="text-3xl font-black text-risk-green">
                  {result
                    ? `${(result.projected?.risk_score * 100).toFixed(0)}%`
                    : "--%"}
                </span>
                <div className="mt-1.5">
                  {result ? (
                    <RiskBadge level={result.projected?.risk_level} size="sm" />
                  ) : (
                    <span className="text-xs text-m3-on-surface-variant">Calculate changes</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {result && (
            <div className="mt-4 pt-3.5 border-t border-m3-outline-variant/50 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-m3-on-surface font-semibold">
                <span>Expected Stress Reduction:</span>
                <strong className="text-risk-green font-black text-base">
                  -{result.risk_reduction_pct}%
                </strong>
              </div>

              {result.key_factors_changed && result.key_factors_changed.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] uppercase font-bold text-m3-on-surface-variant block">
                    Key Improvements:
                  </span>
                  <div className="space-y-1">
                    {result.key_factors_changed.map((fc: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-[11px] bg-m3-surface-container px-2.5 py-1.5 rounded-m3-md border border-m3-outline-variant/50"
                      >
                        <span className="font-semibold text-m3-on-surface">{fc.display_name}</span>
                        <span className="text-risk-green font-mono font-medium">{fc.to}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-m3-on-surface-variant font-medium leading-relaxed pt-1">
                Recommendation: These changes will help the soldier recover well while keeping all required duties staffed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
