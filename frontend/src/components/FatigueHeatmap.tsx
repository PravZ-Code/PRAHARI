"use client";

import React, { useState, useEffect } from "react";
import { Flame, Info, Loader2 } from "lucide-react";
import { DutyDay, TrooperFatigueProfile } from "@/lib/types";
import { api } from "@/lib/api";

interface FatigueHeatmapProps {
  unitId?: string;
}

export const FatigueHeatmap: React.FC<FatigueHeatmapProps> = ({ unitId }) => {
  const [troopers, setTroopers] = useState<TrooperFatigueProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hoveredDay, setHoveredDay] = useState<{
    trooperName: string;
    day: DutyDay;
  } | null>(null);

  useEffect(() => {
    if (!unitId) return;
    setLoading(true);
    api
      .get(`/commander/unit/${unitId}/fatigue`)
      .then((res) => {
        setTroopers(res.data.troopers || []);
      })
      .catch((err) => {
        console.error("Failed to load unit fatigue telemetry:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [unitId]);

  const getShiftColor = (shift: DutyDay["shift"], score: number) => {
    if (shift === "REST") return "bg-slate-700/60 hover:bg-slate-600 text-slate-400";
    if (score >= 85 || shift === "DOUBLE") return "bg-rose-600 hover:bg-rose-500 text-white";
    if (score >= 65 || shift === "NIGHT") return "bg-amber-500 hover:bg-amber-400 text-black";
    if (score >= 40) return "bg-yellow-400 hover:bg-yellow-300 text-black";
    return "bg-emerald-500 hover:bg-emerald-400 text-black";
  };

  return (
    <div className="bg-m3-surface-container border border-m3-outline-variant/70 rounded-m3-3xl p-6 space-y-4 shadow-m3-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-m3-outline-variant/50 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-m3-on-surface text-sm">
              Work Shifts & Fatigue Schedule (Past 30 Days)
            </h4>
            <p className="text-[11px] text-m3-on-surface-variant">
              Shows soldiers with too many night shifts or not enough daily rest.
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold font-mono">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Normal Day Duty (&lt;8h)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Night Duty (8h)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-rose-600 inline-block" /> Long Shift (&gt;12h/Double)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-slate-700 inline-block" /> Rest Day
          </span>
        </div>
      </div>

      {/* Heatmap Matrix */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[760px] space-y-2">
          {/* Day Numbers Header */}
          <div className="flex items-center text-[10px] font-mono text-m3-on-surface-variant/80 border-b border-m3-outline-variant/30 pb-1">
            <div className="w-48 flex-shrink-0 font-bold uppercase tracking-wider">
              Soldier & Role
            </div>
            <div className="flex-1 grid grid-cols-[repeat(30,minmax(0,1fr))] gap-1 text-center font-bold">
              {Array.from({ length: 30 }, (_, i) => (
                <div key={i} className="text-[9px]">
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="w-28 flex-shrink-0 text-right font-bold uppercase tracking-wider pr-2">
              Stress Alert
            </div>
          </div>

          {/* Trooper Rows */}
          {loading && (
            <div className="flex items-center justify-center py-8 text-xs text-m3-on-surface-variant gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-m3-primary" />
              <span>Loading 30-day duty roster...</span>
            </div>
          )}

          {!loading && troopers.length === 0 && (
            <div className="text-center py-6 text-xs text-m3-on-surface-variant italic">
              No duty roster entries found for the selected unit.
            </div>
          )}

          {troopers.map((trooper) => {
            const isHighStrain = trooper.nightShiftPct > 30 || trooper.consecutiveDays > 10;
            return (
              <div
                key={trooper.id}
                className={`flex items-center p-2 rounded-xl border transition-colors ${
                  isHighStrain
                    ? "bg-rose-950/10 border-rose-500/30"
                    : "bg-m3-surface-container-low/40 border-m3-outline-variant/40"
                }`}
              >
                {/* Trooper Info */}
                <div className="w-48 flex-shrink-0 pr-2">
                  <div className="text-xs font-bold text-m3-on-surface truncate flex items-center gap-1.5">
                    {trooper.name}
                    {isHighStrain && (
                      <span title="High Night Duty Alert" className="text-rose-500 cursor-help">
                        ●
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-m3-on-surface-variant font-medium truncate">
                    {trooper.rank} • {trooper.trade}
                  </div>
                </div>

                {/* 30 Day Blocks */}
                <div className="flex-1 grid grid-cols-[repeat(30,minmax(0,1fr))] gap-1">
                  {trooper.days.map((d) => (
                    <button
                      key={d.day}
                      onMouseEnter={() => setHoveredDay({ trooperName: trooper.name, day: d })}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`h-6 rounded text-[9px] font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${getShiftColor(
                        d.shift,
                        d.fatigueScore
                      )}`}
                      title={`${trooper.name}: Day ${d.day} (${d.shift}, ${d.hours}h, Fatigue: ${d.fatigueScore}%)`}
                    >
                      {d.shift === "REST" ? "-" : d.hours}
                    </button>
                  ))}
                </div>

                {/* Metrics */}
                <div className="w-28 flex-shrink-0 text-right pr-2">
                  <span
                    className={`text-xs font-black font-mono block ${
                      isHighStrain ? "text-rose-500" : "text-emerald-500"
                    }`}
                  >
                    {trooper.nightShiftPct}% Night
                  </span>
                  <span className="text-[10px] text-m3-on-surface-variant font-mono">
                    {trooper.consecutiveDays}d consec.
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Tooltip Inspector */}
      {hoveredDay ? (
        <div className="bg-slate-900 border border-slate-700 text-white rounded-xl p-3 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 rounded bg-amber-500" />
            <div>
              <span className="font-bold text-slate-100">{hoveredDay.trooperName}</span>
              <p className="text-slate-400 text-[11px]">
                Date: {hoveredDay.day.date} • Shift Type: <strong>{hoveredDay.day.shift}</strong> ({hoveredDay.day.hours} Hours Assigned)
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase text-slate-400 font-bold block">Tiredness Score</span>
            <span className="text-base font-black text-rose-400">{hoveredDay.day.fatigueScore}%</span>
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-m3-on-surface-variant/70 italic flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" /> Hover over any day box to see shift hours and tiredness level.
        </div>
      )}
    </div>
  );
};
