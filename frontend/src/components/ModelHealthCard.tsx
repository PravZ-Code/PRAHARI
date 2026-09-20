import React from "react";
import { ModelHealthData } from "@/lib/types";
import { CheckCircle, AlertTriangle, Cpu } from "lucide-react";

interface ModelHealthCardProps {
  health: ModelHealthData | null;
}

export const ModelHealthCard: React.FC<ModelHealthCardProps> = ({ health }) => {
  if (!health || !health.latest_snapshot) {
    return (
      <div className="bg-m3-surface-container-low border border-m3-outline-variant/60 rounded-m3-2xl p-6 text-center text-xs text-m3-on-surface-variant font-medium">
        Checking system health...
      </div>
    );
  }

  const snap = health.latest_snapshot;
  const isDrift = snap.drift_detected;

  return (
    <div className="bg-m3-surface-container border border-m3-outline-variant/70 rounded-m3-3xl p-6 space-y-5 shadow-m3-1">
      <div className="flex items-center justify-between border-b border-m3-outline-variant/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-m3-primary-container flex items-center justify-center text-m3-primary">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-m3-on-surface text-sm">Operational ML Model Health & Drift</h4>
            <span className="text-[11px] text-m3-on-surface-variant font-mono font-medium">Strain Forecasting Engine: Operational</span>
          </div>
        </div>

        {isDrift ? (
          <span className="bg-risk-red-container text-risk-on-red-container border border-risk-red/40 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5 text-risk-red" />
            Accuracy Warning: Data Drift Found
          </span>
        ) : (
          <span className="bg-risk-green-container text-risk-on-green-container border border-risk-green/40 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <CheckCircle className="w-3.5 h-3.5 text-risk-green" />
            Calibrated & Normal
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
        <div className="bg-m3-surface-container-low border border-m3-outline-variant/50 rounded-m3-xl p-4">
          <span className="text-m3-on-surface-variant text-[10px] font-semibold uppercase tracking-wider block">Total Troopers Evaluated</span>
          <span className="text-2xl font-black text-m3-on-surface mt-1.5 block">{snap.total_predictions}</span>
        </div>

        <div className="bg-m3-surface-container-low border border-m3-outline-variant/50 rounded-m3-xl p-4">
          <span className="text-m3-on-surface-variant text-[10px] font-semibold uppercase tracking-wider block">Model Confidence Score</span>
          <span className="text-2xl font-black text-risk-green mt-1.5 block">
            {(snap.avg_confidence * 100).toFixed(1)}%
          </span>
        </div>

        <div className="bg-m3-surface-container-low border border-m3-outline-variant/50 rounded-m3-xl p-4">
          <span className="text-m3-on-surface-variant text-[10px] font-semibold uppercase tracking-wider block">Roster Data Completeness</span>
          <span className="text-2xl font-black text-m3-primary mt-1.5 block">
            {(snap.avg_data_quality * 100).toFixed(1)}%
          </span>
        </div>

        <div className="bg-m3-surface-container-low border border-m3-outline-variant/50 rounded-m3-xl p-4">
          <span className="text-m3-on-surface-variant text-[10px] font-semibold uppercase tracking-wider block">Expected Calibration Error</span>
          <span className="text-2xl font-black text-m3-on-surface mt-1.5 block">
            {snap.calibration_error !== undefined && snap.calibration_error !== null ? snap.calibration_error.toFixed(3) : "N/A"}
          </span>
        </div>
      </div>
      <p className="text-[10px] text-slate-500 italic pt-1">
        Decision Support System Only: Statistical models evaluate operational fatigue and duty load patterns to assist human commanders. System does not provide medical or psychiatric diagnoses.
      </p>
    </div>

  );
};
