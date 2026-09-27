"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { AlertTriangle, CheckCircle2, Loader2, Scale, UserCheck } from "lucide-react";

interface HelperRow {
  personnel_id: string;
  name: string;
  rank: string;
  trade: string;
  burden_score?: number;
  recent_debits?: number;
  payback_status?: string | null;
  payback_task_id?: string | null;
  excluded_from_pool?: boolean;
}

export default function HelperLoadPage({ params }: { params: Promise<{ unit_id: string }> }) {
  const { unit_id: unitId } = React.use(params);
  const [rows, setRows] = useState<HelperRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace(`/login?redirect=/commander/helper-load/${unitId || ""}`);
      return;
    }
    if (!unitId) return;
    fetchLoad();
  }, [unitId]);

  const fetchLoad = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get(`/resilience/helper-load/${unitId}`);
      const list: HelperRow[] = r.data?.helpers || r.data || [];
      setRows(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load helper load");
    } finally {
      setLoading(false);
    }
  };

  const complete = async (taskId: string) => {
    try {
      await api.post(`/resilience/helper-load/payback/${taskId}/complete`);
      fetchLoad();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Complete failed");
    }
  };

  const dismiss = async (taskId: string) => {
    const reason = prompt("Dismissal reason (audited):");
    if (!reason) return;
    try {
      await api.post(`/resilience/helper-load/payback/${taskId}/dismiss`, { reason });
      fetchLoad();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Dismiss failed");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <nav className="text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/commander" className="hover:text-[#0c3866]">Commander</Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Welfare Cost Ledger (Who carries the load)</span>
      </nav>

      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-[#0c3866] text-white"><Scale className="w-6 h-6 text-[#ff9933]" /></div>
        <div>
          <h1 className="text-2xl font-bold text-[#0c3866] font-heading">Helper-Load Ledger</h1>
          <p className="text-xs text-slate-600">Every approved swap / cover debits the absorbing helper. Helpers past the burden threshold exit the replacement pool and receive an automatic payback task.</p>
        </div>
      </div>

      {error && <div className="ux4g-alert ux4g-alert-error text-xs"><AlertTriangle className="w-4 h-4" /> {error}</div>}
      {loading ? (
        <div className="flex justify-center p-12 text-slate-500"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <div className="ux4g-card overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-2">Trooper</th>
                <th className="text-left p-2">Trade</th>
                <th className="text-left p-2">Burden</th>
                <th className="text-left p-2">Pool</th>
                <th className="text-left p-2">Payback</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.personnel_id} className="border-t border-slate-100">
                  <td className="p-2">
                    <div className="font-semibold text-slate-900">{r.name}</div>
                    <div className="text-slate-500">{r.rank}</div>
                  </td>
                  <td className="p-2">{r.trade}</td>
                  <td className="p-2 font-mono">{r.burden_score ?? "—"}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${r.excluded_from_pool ? "bg-rose-100 text-rose-800 border-rose-300" : "bg-emerald-100 text-emerald-800 border-emerald-300"}`}>
                      {r.excluded_from_pool ? "Excluded (rest owed)" : "Available"}
                    </span>
                  </td>
                  <td className="p-2">{r.payback_status || "—"}</td>
                  <td className="p-2 text-right space-x-1">
                    {r.payback_task_id && r.payback_status === "open" && (
                      <>
                        <button className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm" onClick={() => complete(r.payback_task_id!)}><UserCheck className="w-3.5 h-3.5" /> Complete</button>
                        <button className="ux4g-btn ux4g-btn-outline-danger ux4g-btn-sm" onClick={() => dismiss(r.payback_task_id!)}>Dismiss</button>
                      </>
                    )}
                    {r.payback_status === "done" && <span className="text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> done</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
