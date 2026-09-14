import React from "react";
import { ShapFactor } from "@/lib/types";

interface ShapWaterfallChartProps {
  factors: ShapFactor[];
}

export const ShapWaterfallChart: React.FC<ShapWaterfallChartProps> = ({ factors }) => {
  if (!factors || factors.length === 0) {
    return (
      <div className="text-xs text-slate-500 italic p-4 text-center">
        No factor details available.
      </div>
    );
  }

  const totalAbsImpact = factors.reduce((sum, f) => sum + Math.abs(f.impact || 0), 0) || 1.0;
  const maxAbsImpact = Math.max(...factors.map((f) => Math.abs(f.impact || 0.01)), 0.01);

  return (
    <div className="space-y-3">
      {factors.map((factor, idx) => {
        const impact = factor.impact || 0;
        const isPositive = impact >= 0;
        const widthPct = Math.min(100, Math.round((Math.abs(impact) / maxAbsImpact) * 100));
        // Calculate clean, human-readable contribution percentage (e.g. 38%, 24%, 18%)
        const contribPct = factor.contribution_pct ?? Math.round((Math.abs(impact) / totalAbsImpact) * 100);

        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-200">
                {factor.display_name || factor.feature.replace(/_/g, " ")}
              </span>
              <div className="flex items-center gap-2">
                {factor.value !== undefined && factor.value !== null && (
                  <span className="text-slate-400 text-[11px]">
                    Value: <strong className="text-slate-200">{factor.value}</strong>
                  </span>
                )}
                <span
                  className={`font-semibold px-1.5 py-0.5 rounded text-[11px] ${
                    isPositive
                      ? "bg-rose-950/60 text-rose-300 border border-rose-800/40"
                      : "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40"
                  }`}
                >
                  {contribPct}% Impact
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isPositive ? "bg-rose-500" : "bg-emerald-500"
                }`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
