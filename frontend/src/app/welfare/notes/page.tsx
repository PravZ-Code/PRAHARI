"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { ClipboardCheck, FileLock2, Loader2, Lock, ShieldCheck, Trash2 } from "lucide-react";

interface NoteRow {
  id: string;
  author_user_id: string;
  status: "active" | "destroyed";
  created_at: string | null;
  destroyed_at: string | null;
  destroyed_reason: string | null;
  existence_hmac: string;
}

export default function WelfareNotesPage() {
  const [caseId, setCaseId] = useState("");
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [newText, setNewText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proof, setProof] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login?redirect=/welfare/notes");
      return;
    }
    const u = getStoredUser();
    if (!u || !["welfare", "admin", "welfare_officer"].includes(u.role)) {
      window.location.replace("/portal");
    }
  }, []);

  const load = async () => {
    if (!caseId.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const r = await api.get(`/welfare/case/${caseId.trim()}/notes`);
      setNotes(r.data.notes || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load notes");
      setNotes([]);
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (!caseId.trim() || !newText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/welfare/notes", { case_id: caseId.trim(), plaintext: newText });
      setNewText("");
      load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to create note");
    } finally {
      setBusy(false);
    }
  };

  const destroy = async (id: string) => {
    if (!confirm("Permanently erase this note? The content will be cryptographically unrecoverable. The ledger keeps only an existence proof.")) return;
    setBusy(true);
    try {
      const reason = prompt("Erasure reason (audited):", "officer_manual") || "officer_manual";
      await api.post(`/welfare/notes/${id}/destroy`, { reason });
      load();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Erase failed");
    } finally {
      setBusy(false);
    }
  };

  const showProof = async (id: string) => {
    try {
      const r = await api.get(`/welfare/notes/${id}/proof`);
      setProof(r.data);
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Proof unavailable");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <nav className="text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/welfare" className="hover:text-[#0c3866]">Welfare Desk</Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Confidential Case Notes (Provable Erasure)</span>
      </nav>

      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-[#0c3866] text-white"><FileLock2 className="w-6 h-6 text-[#ff9933]" /></div>
        <div>
          <h1 className="text-2xl font-bold text-[#0c3866] font-heading">Welfare Notes — Crypto-Shredded</h1>
          <p className="text-xs text-slate-600">Notes are envelope-encrypted per note. Erasure destroys the key: content becomes unrecoverable, but an existence proof remains for court inquiry.</p>
        </div>
      </div>

      <div className="ux4g-card p-4 space-y-3">
        <label className="text-xs font-bold text-slate-700">Welfare Case ID</label>
        <div className="flex gap-2">
          <input className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm" value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="case id" />
          <button className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm" onClick={load}><Loader2 className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} /> Load</button>
        </div>
        <label className="text-xs font-bold text-slate-700">New Note (encrypted at rest)</label>
        <textarea className="w-full border border-slate-300 rounded px-3 py-2 text-sm" rows={3} value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="Confidential welfare note…" />
        <button className="ux4g-btn ux4g-btn-primary ux4g-btn-sm" onClick={create} disabled={busy}><Lock className="w-4 h-4" /> Create Encrypted Note</button>
      </div>

      {error && <div className="ux4g-alert ux4g-alert-error text-xs">{error}</div>}

      <div className="space-y-2">
        {notes.map((n) => (
          <div key={n.id} className="ux4g-card p-3 flex items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-mono text-slate-700">{n.id}</div>
              <div className="text-slate-500">created {n.created_at || "—"} · status <span className={n.status === "destroyed" ? "text-rose-700 font-bold" : "text-emerald-700 font-bold"}>{n.status}</span></div>
              <div className="font-mono text-[10px] text-slate-400 break-all">proof: {n.existence_hmac}</div>
            </div>
            <div className="flex gap-2">
              <button className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm" onClick={() => showProof(n.id)}><ShieldCheck className="w-4 h-4" /> Proof</button>
              {n.status === "active" && (
                <button className="ux4g-btn ux4g-btn-outline-danger ux4g-btn-sm" onClick={() => destroy(n.id)}><Trash2 className="w-4 h-4" /> Erase</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {proof && (
        <div className="ux4g-card p-4 text-xs font-mono whitespace-pre-wrap bg-slate-50 border border-slate-200">{JSON.stringify(proof, null, 2)}</div>
      )}

      <div className="ux4g-alert ux4g-alert-warning flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 mt-0.5" />
        <p className="text-xs">Retention sweep: notes on resolved cases are auto-erased after the configured retention window. DPDP §12(3) erasure by a trooper takes priority.</p>
      </div>
    </div>
  );
}
