"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { CalendarCheck, CheckCircle2, ClipboardCheck, Loader2, ShieldCheck, RefreshCcw, AlertTriangle } from "lucide-react";

interface ReintegrationRow {
  window_id: string;
  personnel_id: string;
  trooper_name: string | null;
  service_number: string | null;
  unit_id: string;
  leave_category: string | null;
  returned_on: string;
  window_end: string;
  status: string;
  checkpoints: { day: number; completed_at: string; completed_by_user_id: string | null; note_summary?: string }[];
  next_checkpoint_due_day: number | null;
}

export default function ReintegrationQueuePage() {
  const [rows, setRows] = useState<ReintegrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login?redirect=/welfare/reintegration");
      return;
    }
    const u = getStoredUser();
    if (!u || !["welfare", "admin", "welfare_officer"].includes(u.role)) {
      window.location.replace("/portal");
      return;
    }
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/welfare/reintegration/sync");
      void res;
      const q = await api.get("/welfare/reintegration/queue");
      setRows(q.data.queue || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load reintegration queue");
    } finally {
      setLoading(false);
    }
  };

  const recordCheckpoint = async (windowId: string, day: number) => {
    try {
      await api.post(`/welfare/reintegration/${windowId}/checkpoint`, {
        day,
        note_summary: note[windowId] || `Day-${day} check completed`,
      });
      setNote((p) => ({ ...p, [windowId]: "" }));
      fetchQueue();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Checkpoint failed");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <nav className="text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/welfare" className="hover:text-[#0c3866]">Welfare Desk</Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Post-Leave Reintegration</span>
      </nav>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#0c3866] text-white"><CalendarCheck className="w-6 h-6 text-[#ff9933]" /></div>
          <div>
            <h1 className="text-2xl font-bold text-[#0c3866] font-heading">Reintegration Windows (Day 0 / 7 / 14)</h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Welfare-side attention after a trooper returns from leave. Commanders see aggregate counts only — no names or content.
            </p>
          </div>
        </div>
        <button onClick={fetchQueue} className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm flex items-center gap-2">
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {error && <div className="ux4g-alert ux4g-alert-error flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}
      {loading ? (
        <div className="flex justify-center p-12 text-slate-500"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="ux4g-card p-8 text-center text-slate-500 text-sm">No active reintegration windows. Approved returns from leave will appear automatically.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.window_id} className="ux4g-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900">{r.trooper_name || r.personnel_id}</div>
                <div className="text-xs text-slate-600 font-mono">{r.service_number || ""} · {r.leave_category || "leave"} · returned {r.returned_on}</div>
                <div className="text-xs mt-1 flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${r.status === "overdue" ? "bg-rose-100 text-rose-800 border-rose-300" : "bg-emerald-100 text-emerald-800 border-emerald-300"}`}>
                    {r.status === "overdue" ? "Overdue" : "Active"}
                  </span>
                  {[0, 7, 14].map((d) => {
                    const done = (r.checkpoints || []).some((c) => c.day === d);
                    return (
                      <span key={d} className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${done ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                        {done ? "✓" : "·"} D{d}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-2 items-stretch sm:items-end">
                <input
                  className="text-xs border border-slate-300 rounded px-2 py-1 w-64"
                  placeholder="Optional welfare note summary (kept confidential)"
                  value={note[r.window_id] || ""}
                  onChange={(e) => setNote((p) => ({ ...p, [r.window_id]: e.target.value }))}
                />
                <div className="flex gap-2 justify-end">
                  {[0, 7, 14].map((d) => (
                    <button key={d} className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm" onClick={() => recordCheckpoint(r.window_id, d)}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> D{d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ux4g-alert ux4g-alert-warning flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 mt-0.5" />
        <p className="text-xs">Troopers may submit a voluntary re-entry pulse from their portal. Refusal to engage carries no adverse career consequence.</p>
      </div>
    </div>
  );
}
