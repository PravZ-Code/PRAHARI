"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { AlertTriangle, FileSignature, Loader2, ShieldAlert } from "lucide-react";

export default function MissionGatePage() {
  const [unitId, setUnitId] = useState("");
  const [taskingRef, setTaskingRef] = useState("");
  const [evaluation, setEvaluation] = useState<any>(null);
  const [pending, setPending] = useState<any>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login?redirect=/commander/mission-gate");
      return;
    }
    const u = getStoredUser();
    if (u?.unit_id) {
      setUnitId(u.unit_id);
      loadPending(u.unit_id);
    }
  }, []);

  const loadPending = async (uid: string) => {
    try {
      const r = await api.get(`/commander/mission-gate/${uid}/pending`);
      setPending(r.data);
    } catch {
      setPending(null);
    }
  };

  const evaluate = async () => {
    if (!unitId || !taskingRef.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ unit_id: unitId, tasking_ref: taskingRef.trim() });
      const r = await api.post(`/commander/mission-gate/evaluate?${params.toString()}`);
      setEvaluation(r.data);
      loadPending(unitId);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Evaluation failed");
    } finally {
      setLoading(false);
    }
  };

  const acknowledge = async (assessmentId: string, decision: "remediate" | "accept_risk") => {
    try {
      await api.post(`/commander/mission-gate/${assessmentId}/acknowledge`, { decision, note: note || undefined });
      setEvaluation(null);
      setNote("");
      loadPending(unitId);
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Acknowledge failed");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <nav className="text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/commander" className="hover:text-[#0c3866]">Commander</Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Mission Risk Budget</span>
      </nav>

      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-[#0c3866] text-white"><FileSignature className="w-6 h-6 text-[#ff9933]" /></div>
        <div>
          <h1 className="text-2xl font-bold text-[#0c3866] font-heading">Tasking Sign-Off (Never a Veto)</h1>
          <p className="text-xs text-slate-600">
            If a tasking fails the welfare budget, this produces a signed, hash-chained acknowledgment — command authority is absolute; PRAHARI records, never blocks.
          </p>
        </div>
      </div>

      <div className="ux4g-card p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs font-bold text-slate-700">Unit ID
            <input className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm" value={unitId} onChange={(e) => setUnitId(e.target.value)} />
          </label>
          <label className="text-xs font-bold text-slate-700">Tasking reference
            <input className="mt-1 w-full border border-slate-300 rounded px-3 py-2 text-sm" value={taskingRef} onChange={(e) => setTaskingRef(e.target.value)} placeholder="e.g. EX-LION-2026" />
          </label>
        </div>
        <button className="ux4g-btn ux4g-btn-primary ux4g-btn-md flex items-center gap-2" onClick={evaluate} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
          Evaluate Welfare Budget
        </button>
      </div>

      {error && <div className="ux4g-alert ux4g-alert-error text-xs"><AlertTriangle className="w-4 h-4" /> {error}</div>}

      {evaluation && (
        <div className={`ux4g-card p-4 space-y-3 border-2 ${evaluation.budget_passed ? "border-emerald-300" : "border-amber-300"}`}>
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-900">{evaluation.tasking_ref}</div>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${evaluation.budget_passed ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-amber-100 text-amber-900 border-amber-300"}`}>
              {evaluation.budget_passed ? "WITHIN BUDGET" : "BUDGET EXCEEDED"}
            </span>
          </div>
          <pre className="text-xs bg-slate-50 border border-slate-200 rounded p-3 overflow-x-auto">{JSON.stringify(evaluation.metrics, null, 2)}</pre>
          {(evaluation.failures || []).length > 0 && (
            <ul className="text-xs text-amber-900 list-disc pl-4">
              {evaluation.failures.map((f: string) => <li key={f}>{f}</li>)}
            </ul>
          )}
          {(evaluation.remediation_suggestions || []).length > 0 && (
            <div className="text-xs">
              <div className="font-bold text-slate-700 mb-1">Suggested remediation</div>
              <ul className="list-disc pl-4 text-slate-600">
                {evaluation.remediation_suggestions.map((s: string) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          )}
          {!evaluation.budget_passed && evaluation.status === "pending_ack" && (
            <div className="space-y-2">
              <textarea
                className="w-full border border-amber-300 rounded px-3 py-2 text-sm"
                rows={2}
                placeholder="Risk-acceptance justification (mandatory, signed & hash-chained)…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="flex gap-2">
                <button className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm" onClick={() => acknowledge(evaluation.assessment_id, "remediate")}>Remediate first</button>
                <button className="ux4g-btn ux4g-btn-outline-danger ux4g-btn-sm" onClick={() => acknowledge(evaluation.assessment_id, "accept_risk")}>Accept &amp; sign risk</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="ux4g-card p-4">
        <div className="text-xs font-bold text-slate-700 mb-2">Unit history</div>
        {!pending || (pending.assessments || []).length === 0 ? (
          <div className="text-xs text-slate-500">No assessments for this unit yet.</div>
        ) : (
          <div className="space-y-2">
            {pending.assessments.map((a: any) => (
              <div key={a.id} className="text-xs flex items-center justify-between border-t border-slate-100 pt-2">
                <div>
                  <div className="font-mono text-slate-700">{a.tasking_ref}</div>
                  <div className="text-slate-500">{a.status} · {a.budget_passed ? "passed" : "exceeded"}</div>
                </div>
                <div className="font-mono text-[10px] text-slate-400">{a.content_hash?.slice(0, 16)}…</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
