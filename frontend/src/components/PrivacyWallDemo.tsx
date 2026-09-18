import React, { useState } from "react";
import { Shield, Lock, CheckCircle, Eye, EyeOff } from "lucide-react";
import { RiskBadge } from "./RiskBadge";
import { playTacticalClick } from "@/lib/sound";

interface PrivacyWallDemoProps {
  unitName?: string;
  readinessScore?: number;
  distribution?: { green: number; yellow: number; orange: number; red: number };
}

export const PrivacyWallDemo: React.FC<PrivacyWallDemoProps> = ({
  unitName = "Assigned unit",
  readinessScore = 0,
  distribution = { green: 0, yellow: 0, orange: 0, red: 0 },
}) => {
  const [activeTab, setActiveTab] = useState<"sideBySide" | "commander" | "welfare">("sideBySide");

  const sampleTrooper = {
    name: "Protected personnel record",
    id: "REDACTED",
    hardM: 0,
    denialRate: "—",
    sleepDef: "—",
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 space-y-6 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-base font-mono">
              Privacy Protection: What Each Officer Sees
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            To protect soldiers' careers and privacy, Commanders see team workload numbers, while Welfare Officers handle personal welfare files.
          </p>
        </div>

        {/* Segmented Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            onClick={() => {
              playTacticalClick();
              setActiveTab("sideBySide");
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all duration-150 ${
              activeTab === "sideBySide"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            Side-by-Side View
          </button>
          <button
            onClick={() => {
              playTacticalClick();
              setActiveTab("commander");
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all duration-150 ${
              activeTab === "commander"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            Commander View
          </button>
          <button
            onClick={() => {
              playTacticalClick();
              setActiveTab("welfare");
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all duration-150 ${
              activeTab === "welfare"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            Welfare Officer View
          </button>
        </div>
      </div>

      {/* Split Comparison Screen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT: Commander's Screen */}
        {(activeTab === "sideBySide" || activeTab === "commander") && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Commander's Screen
                </span>
              </div>
              <span className="text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-800 px-2.5 py-0.5 rounded font-mono font-bold">
                ROLE: COMMANDER
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white font-mono">{unitName}</span>
                  <span className="text-emerald-400 font-bold font-mono">{readinessScore}% Ready</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Shows team readiness based on work hours and night shifts without revealing private soldier names.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-400 font-semibold">Soldiers Needing Rest:</span>
                  <span className="text-rose-400 font-bold">{distribution.red + distribution.orange} Soldiers</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-400 font-semibold">Recommended Relief:</span>
                  <span className="text-amber-400 font-bold">Swap Shifts with Fresh Soldiers</span>
                </div>
              </div>

              <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-xl text-slate-300 space-y-1.5 text-[11px] leading-relaxed">
                <div className="flex items-center gap-2 text-rose-400 font-bold font-mono">
                  <Lock className="w-3.5 h-3.5" /> What is Hidden from the Commander:
                </div>
                <p>• Cannot see names of soldiers experiencing high stress.</p>
                <p>• Cannot see private counseling notes or wellness surveys.</p>
                <p>• Cannot be used for punishment, bad postings, or withheld promotions.</p>
              </div>
            </div>
          </div>
        )}

        {/* RIGHT: Welfare Officer's Screen */}
        {(activeTab === "sideBySide" || activeTab === "welfare") && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Welfare Officer's Screen
                </span>
              </div>
              <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2.5 py-0.5 rounded font-mono font-bold">
                ROLE: WELFARE_OFFICER
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-white">{sampleTrooper.name} ({sampleTrooper.id})</span>
                  <RiskBadge level="orange" size="sm" score={0.72} />
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  {sampleTrooper.hardM} Months in Difficult Area • {sampleTrooper.denialRate} Leaves Denied • Sleep Deficit {sampleTrooper.sleepDef}
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <span className="font-semibold text-white block font-mono">Main Stress Reasons:</span>
                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between text-rose-400">
                    <span>Long Posting in Difficult Area:</span>
                    <span className="font-bold">{sampleTrooper.hardM} Continuous Months</span>
                  </div>
                  <div className="flex justify-between text-rose-400">
                    <span>Rejected Leave Rate:</span>
                    <span className="font-bold">{sampleTrooper.denialRate} Leaves Rejected</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-slate-300 space-y-1.5 text-[11px] leading-relaxed">
                <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono">
                  <CheckCircle className="w-3.5 h-3.5" /> Actions Welfare Officers Can Take:
                </div>
                <p>• Offer private counseling and emotional support.</p>
                <p>• Request shift swaps to give the soldier rest.</p>
                <p>• Review and approve urgent leave requests.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
