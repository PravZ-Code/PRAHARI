import React from "react";

interface ConfidenceMeterProps {
  confidence: number;
  dataQuality?: number;
  baselineType?: string;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({
  confidence,
  dataQuality,
  baselineType,
}) => {
  const confPct = Math.round(confidence * 100);
  const qualPct = dataQuality !== undefined ? Math.round(dataQuality * 100) : null;

  return (
    <div className="bg-defense-800/80 border border-slate-700/60 rounded-lg p-3 text-xs space-y-2">
      <div className="flex items-center justify-between text-slate-300">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          Model Confidence
        </span>
        <span className="font-bold text-white">{confPct}%</span>
      </div>
      <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            confPct > 80 ? "bg-emerald-400" : confPct > 60 ? "bg-blue-400" : "bg-amber-400"
          }`}
          style={{ width: `${confPct}%` }}
        />
      </div>

      {qualPct !== null && (
        <>
          <div className="flex items-center justify-between text-slate-400 pt-1">
            <span>Input Completeness</span>
            <span className="font-medium text-slate-200">{qualPct}%</span>
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-1 overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-400 transition-all duration-500"
              style={{ width: `${qualPct}%` }}
            />
          </div>
        </>
      )}

      {baselineType && (
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-700/40">
          <span>Baseline Mode:</span>
          <span className="uppercase text-blue-400 font-semibold tracking-wider">
            {baselineType}
          </span>
        </div>
      )}
    </div>
  );
};
