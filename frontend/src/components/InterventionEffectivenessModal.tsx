"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { playTacticalClick } from "@/lib/sound";
import {
  X,
  Award,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  Info,
  Layers,
  Sparkles,
} from "lucide-react";

interface InterventionEffectivenessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InterventionEffectivenessModal: React.FC<InterventionEffectivenessModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchEffectivenessData();
    }
  }, [isOpen]);

  const fetchEffectivenessData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/resilience/intervention-effectiveness");
      setData(res.data);
    } catch (err: any) {
      console.error("Failed to load intervention effectiveness registry:", err);
      setError(err?.response?.data?.detail || "Could not retrieve institutional effectiveness data.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-slate-900 text-white rounded-t-xl border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight">
                    Intervention Effectiveness Registry
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Section 28 Standard
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Empirical recovery outcomes &amp; evidence-based welfare intervention benchmarks
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                playTacticalClick();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#0c3866] animate-spin" />
                <p className="text-xs font-semibold text-slate-600">
                  Loading institutional recovery registry...
                </p>
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-900">Registry Unavailable</h4>
                  <p className="text-xs text-rose-700 mt-0.5">{error}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Summary Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase block">
                      Total Case Dockets
                    </span>
                    <strong className="text-2xl font-bold text-emerald-950">
                      {data?.total_institutional_cases ?? 0}
                    </strong>
                    <span className="text-[10px] text-emerald-700 block">
                      {data?.resolved_cases_count ?? 0} successfully resolved
                    </span>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                    <span className="text-[11px] font-bold text-blue-800 uppercase block">
                      Top-Performing Relief
                    </span>
                    <strong className="text-sm font-bold text-blue-950 block truncate">
                      {data?.top_performing_intervention ?? "Emergency Family Leave"}
                    </strong>
                    <span className="text-[10px] text-blue-700 block">Highest recovery velocity</span>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                    <span className="text-[11px] font-bold text-amber-800 uppercase block">
                      Most Operationally Sustainable
                    </span>
                    <strong className="text-sm font-bold text-amber-950 block truncate">
                      {data?.most_cost_effective_intervention ?? "24h Recovery Rest"}
                    </strong>
                    <span className="text-[10px] text-amber-700 block">Minimal guard mount disruption</span>
                  </div>
                </div>

                {/* Evidence Registry Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-slate-600" />
                      Standard Military Welfare Interventions
                    </h3>
                    <span className="text-[10px] text-slate-500 font-medium">
                      5 Intervention Archetypes
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/75 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">Intervention Type</th>
                          <th className="px-3 py-2.5">Category</th>
                          <th className="px-3 py-2.5 text-center">Benchmark Improvement</th>
                          <th className="px-3 py-2.5 text-center">Avg Days to Recover</th>
                          <th className="px-3 py-2.5 text-center">Operational Impact</th>
                          <th className="px-4 py-2.5">Recommended Triggers</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-800">
                        {data?.registry?.map((item: any) => (
                          <tr key={item.intervention_id} className="hover:bg-slate-50/75 transition-colors">
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {item.name}
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="font-bold text-emerald-700">
                                {item.improvement_percentage}%
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center text-slate-700">
                              {item.avg_recovery_time_days} days
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  item.operational_impact === "Zero" || item.operational_impact === "Low"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : item.operational_impact === "Moderate"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {item.operational_impact}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 text-[11px] max-w-xs">
                              {item.recommended_triggers}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Institutional Note & Data Maturity Notice */}
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Institutional Learning Note:
                    </span>
                    <p className="text-slate-700 leading-relaxed">
                      {data?.institutional_learning_note ??
                        "Benchmark evidence indicates early 24h rest interventions are associated with fewer escalated medical leaves. Evidence-based planning minimizes operational disruption."}
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold text-blue-950 block">Data Maturity Notice:</strong>
                      <p className="text-[11px] text-blue-800 leading-relaxed mt-0.5">
                        {data?.data_maturity_notice ??
                          "Registry percentages are prototype reference benchmarks from synthetic-data validation, not yet measured from field deployments. Live counters reflect real case volumes only."}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end rounded-b-xl">
            <button
              onClick={() => {
                playTacticalClick();
                onClose();
              }}
              className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Close Registry
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
