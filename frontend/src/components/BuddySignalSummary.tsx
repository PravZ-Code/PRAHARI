import React from "react";
import { BuddyUnitSummaryResponse } from "@/lib/types";
import { Users, AlertCircle } from "lucide-react";

interface BuddySignalSummaryProps {
  summary: BuddyUnitSummaryResponse | null;
}

export const BuddySignalSummary: React.FC<BuddySignalSummaryProps> = ({ summary }) => {
  if (!summary || !summary.weeks || summary.weeks.length === 0) {
    return null;
  }

  const currentWeek = summary.weeks[0];
  const isElevated = currentWeek.total_signals >= 4;

  return (
    <div className="bg-defense-800/80 border border-slate-700/80 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          Anonymous Buddy Feedback (Past 4 Weeks)
        </h4>

        {isElevated && (
          <span className="text-[10px] bg-amber-950/70 border border-amber-500/50 text-amber-300 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            Higher Alerts Logged ({currentWeek.total_signals} this week)
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
        {Object.entries(currentWeek.by_category || {}).map(([cat, count]) => (
          <div key={cat} className="bg-defense-900/70 border border-slate-800 rounded-lg p-2">
            <span className="text-[10px] text-slate-400 capitalize block truncate">
              {cat.replace("_", " ")}
            </span>
            <span className="text-base font-black text-slate-200">{String(count)}</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-500 italic">
        Feedback is combined at company level without names. No one's identity is tracked or stored.
      </p>
    </div>
  );
};
