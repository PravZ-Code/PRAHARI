import React from "react";
import { UnitCardData } from "@/lib/types";
import { MapPin, Users, Shield, Activity } from "lucide-react";
import { playTacticalClick } from "@/lib/sound";

interface UnitReadinessCardProps {
  unit: UnitCardData;
  isSelected?: boolean;
  onClick?: () => void;
}

export const UnitReadinessCard: React.FC<UnitReadinessCardProps> = ({
  unit,
  isSelected = false,
  onClick,
}) => {
  const isHealthy = unit.readiness_score >= 75;
  const isWarning = unit.readiness_score >= 60 && unit.readiness_score < 75;

  const total = unit.strength || 50;
  const dist = unit.risk_distribution || { green: 0, yellow: 0, orange: 0, red: 0 };

  const greenW = `${Math.round((dist.green / total) * 100)}%`;
  const yellowW = `${Math.round((dist.yellow / total) * 100)}%`;
  const orangeW = `${Math.round((dist.orange / total) * 100)}%`;
  const redW = `${Math.round((dist.red / total) * 100)}%`;

  return (
    <div
      onClick={() => {
        playTacticalClick();
        if (onClick) onClick();
      }}
      className={`relative p-5 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-xl ${
        isSelected
          ? "bg-slate-800/90 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50"
          : "bg-slate-900/80 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-base tracking-wide font-mono">{unit.name}</h3>
            <span
              className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border font-mono ${
                unit.operational_area === "hard"
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : unit.operational_area === "semi-hard"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              }`}
            >
              {unit.operational_area} zone
            </span>
          </div>
          {unit.location && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1 font-mono">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              {unit.location}
            </p>
          )}
        </div>

        <div className="text-right">
          <div className="flex items-baseline justify-end gap-0.5">
            <span
              className={`text-2xl font-black tracking-tight font-mono ${
                isHealthy
                  ? "text-emerald-400"
                  : isWarning
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            >
              {unit.readiness_score.toFixed(0)}
            </span>
            <span className="text-xs text-slate-400 font-semibold">%</span>
          </div>
          <span className="text-[9px] text-slate-400 tracking-wider block font-mono">Ready for Duty</span>
        </div>
      </div>

      <div className="space-y-2 pt-3 border-t border-slate-800">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            Soldiers: <strong className="text-white font-semibold">{unit.strength}</strong>
          </span>
          <span>
            Fatigued: <strong className="text-rose-400 font-semibold">{dist.orange + dist.red}</strong>
          </span>
        </div>

        {/* Stacked risk bar */}
        <div className="w-full bg-slate-950 rounded-full h-2.5 flex overflow-hidden p-0.5 border border-slate-800">
          <div className="bg-emerald-500 rounded-l-full transition-all" style={{ width: greenW }} title={`Healthy: ${dist.green}`} />
          <div className="bg-amber-500 transition-all" style={{ width: yellowW }} title={`Mild Strain: ${dist.yellow}`} />
          <div className="bg-orange-500 transition-all" style={{ width: orangeW }} title={`Elevated: ${dist.orange}`} />
          <div className="bg-rose-500 rounded-r-full transition-all" style={{ width: redW }} title={`High Fatigue: ${dist.red}`} />
        </div>
      </div>
    </div>
  );
};
