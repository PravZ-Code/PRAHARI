"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { AlertTriangle, BrainCircuit, Loader2, Sliders } from "lucide-react";

export default function PolicyWhatIfPage() {
  const [unitId, setUnitId] = useState("");
  const [levers, setLevers] = useState({
    max_consecutive_nights: 4,
    rest_barrier_hours: 10,
    auto_approve_family_crisis: true,
    extra_rest_days_per_30d: 1.5,
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login?redirect=/commander/policy-what-if");
      return;
    }
    const u = getStoredUser();
    if (u?.unit_id) setUnitId(u.unit_id);
  }, []);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const params = new URLSearchParams({ unit_id: unitId });
      const r = await api.post(`/resilience/policy-what-if?${params.toString()}`, levers);
      setResult(r.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <nav className="text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/commander" className="hover:text-[#0c3866]">Commander</Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Policy What-If</span>
      </nav>

      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-[#0c3866] text-white"><Sliders className="w-6 h-6 text-[#ff9933]" /></div>
        <div>
          <h1 className="text-2xl font-bold text-[#0c3866] font-heading">Unit-Level Policy Simulation</h1>
          <p className="text-xs text-slate-600">Counterfactual planning aid. Abstained troopers are counted separately and never silently averaged. Illustrative only.</p>
        </div>
      </div>

      <div className="ux4g-card p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs font-bold text-slate-700">Unit ID
            <input className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm" value={unitId} onChange={(e) => setUnitId(e.target.value)} />
          </label>
          <label className="text-xs font-bold text-slate-700">Max consecutive night duties
            <input type="number" className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm" value={levers.max_consecutive_nights}
              onChange={(e) => setLevers({ ...levers, max_consecutive_nights: Number(e.target.value) })} />
          </label>
          <label className="text-xs font-bold text-slate-700">Rest barrier (hours)
            <input type="number" className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm" value={levers.rest_barrier_hours}
              onChange={(e) => setLevers({ ...levers, rest_barrier_hours: Number(e.target.value) })} />
          </label>
          <label className="text-xs font-bold text-slate-700">Extra rest days / trooper / 30d
            <input type="number" step="0.5" className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm" value={levers.extra_rest_days_per_30d}
              onChange={(e) => setLevers({ ...levers, extra_rest_days_per_30d: Number(e.target.value) })} />
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 sm:col-span-2">
            <input type="checkbox" checked={levers.auto_approve_family_crisis}
              onChange={(e) => setLevers({ ...levers, auto_approve_family_crisis: e.target.checked })} />
            Auto-approve open family-crisis leave for affected troopers
          </label>
        </div>
        <button className="ux4g-btn ux4g-btn-primary ux4g-btn-md flex items-center gap-2" onClick={run} disabled={loading || !unitId}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
          Run Cohort Simulation
        </button>
      </div>

      {error && <div className="ux4g-alert ux4g-alert-error text-xs"><AlertTriangle className="w-4 h-4" /> {error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="ux4g-card p-4">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Evaluable cohort</div>
              <div className="text-2xl font-bold text-slate-900">{result.cohort?.evaluable_count ?? "—"}</div>
              <div className="text-xs text-slate-500">abstained: {result.cohort?.abstained_count ?? 0}</div>
            </div>
            <div className="ux4g-card p-4">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Mean strain Δ</div>
              <div className={`text-2xl font-bold ${result.benefit?.mean_strain_delta < 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {result.benefit?.mean_strain_delta != null ? result.benefit.mean_strain_delta : "—"}
              </div>
              <div className="text-xs text-slate-500">before {result.benefit?.mean_strain_before ?? "—"} → after {result.benefit?.mean_strain_after ?? "—"}</div>
            </div>
            <div className="ux4g-card p-4">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Coverage cost</div>
              <div className="text-2xl font-bold text-amber-700">{result.cost?.extra_coverage_hours_per_30d ?? "—"}h</div>
              <div className="text-xs text-slate-500">watch-hours to re-cover per 30d</div>
            </div>
          </div>

          <div className="ux4g-card p-4">
            <div className="text-xs font-bold text-slate-700 mb-2">Risk band shift</div>
            <div className="grid grid-cols-4 gap-2 text-xs text-center">
              {["green", "yellow", "orange", "red"].map((b) => (
                <div key={b} className="border border-slate-200 rounded p-2">
                  <div className="font-bold capitalize">{b}</div>
                  <div className="font-mono">{result.benefit?.band_before?.[b] ?? 0} → {result.benefit?.band_after?.[b] ?? 0}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-3">{result.data_maturity_notice}</p>
          </div>
        </div>
      )}
    </div>
  );
}
