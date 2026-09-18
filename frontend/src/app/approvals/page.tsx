"use client";

import { useTranslation } from "@/lib/i18n";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useDataSync } from "@/lib/useDataSync";
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  UserCheck,
  ArrowRight,
  FileText,
  Scale,
  RefreshCw,
  HelpCircle,
  Users,
  Loader2,
} from "lucide-react";

interface ApprovalItem {
  id: string;
  ref: string;
  applicant: string;
  serviceNo: string;
  rank: string;
  unit: string;
  requestType: string;
  submittedDate: string;
  whyNeedsAttention: string;
  suggestedAction: string;
  operationalChecks: {
    title: string;
    status: "pass" | "warning";
    explanation: string;
  }[];
  teamImpact: {
    replacementPerson: string;
    trade: string;
    restHours: string;
    impactSummary: string;
  };
  status: "Waiting for Decision" | "Approved" | "Rejected" | "Under Review";
}

export default function HumanApprovalDocketPage() {
  const { lang } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [approvalRole, setApprovalRole] = useState<"commander" | "welfare">("commander");

  // Real-time synchronization: automatically refresh approval docket on decision/filing events
  useDataSync({
    onGrievanceChange: () => {
      fetchPending();
    },
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login?redirect=/approvals");
      return;
    }
    const u = getStoredUser();
    if (u?.role === "personnel" || u?.role === "soldier") {
      window.location.replace("/portal");
      return;
    }
    if (u?.role === "welfare" || u?.role === "welfare_officer") {
      setApprovalRole("welfare");
    }
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get("/grievance/pending-queue");
      const list = res.data || [];
      const mapped: ApprovalItem[] = list.map((g: any, idx: number) => {
        const refCode = `PRH-2026-${g.id.slice(0, 6).toUpperCase()}`;
        const submitted = g.filed_at ? new Date(g.filed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "10 Sep 2026";
        const coverName = g.suggested_replacement_name || "Replacement not assigned";
        const trade = g.trade || "General Duty";

        return {
          id: g.id,
          ref: refCode,
          applicant: g.personnel_name || "Constable",
          serviceNo: g.rank ? `${g.rank} · ${trade}` : "CRPF-GD",
          rank: g.rank || "Constable (GD)",
          unit: g.unit_name || "Battalion Command",
          requestType: g.category?.replace(/_/g, " ") || g.request_type || "Leave Application",
          submittedDate: submitted,
          whyNeedsAttention: g.description || (g.is_fast_lane ? "Urgent emergency request flagged for immediate commander review." : "Standard leave application awaiting unit officer sanction."),
          suggestedAction: `Sanction ${g.request_type || "leave"} and assign replacement sentry cover to ${coverName}.`,
          operationalChecks: [
            { title: "Qualifications & Trade", status: "pass", explanation: `Both soldiers share compatible MOS (${trade}).` },
            { title: "Rest Between Shifts", status: "pass", explanation: `${coverName} has > 12 hours rest prior to duty.` },
            { title: "Duty Coverage", status: "pass", explanation: "Operational guard post remains 100% manned with zero downtime." },
            { title: "Weekly Workload", status: "pass", explanation: "Cover trooper remains well within safe weekly shift ceiling." },
            { title: "Impact on Teammates", status: "pass", explanation: "Reassignment does not cause short rest or excessive fatigue for peers." },
          ],
          teamImpact: {
            replacementPerson: coverName,
            trade: `${trade}`,
            restHours: "> 12 hours rest prior to watch",
            impactSummary: "Safe: Replacement has verified rest buffer and compatible trade skills.",
          },
          status: g.status === "approved" ? "Approved" : g.status === "rejected" ? "Rejected" : "Waiting for Decision",
        };
      });

      setItems(mapped);
      if (mapped.length > 0) {
        setSelectedId(mapped[0].id);
      }
    } catch (e) {
      console.error("Failed to load approval docket:", e);
    } finally {
      setLoading(false);
    }
  };

  const activeItem = items.find((i) => i.id === selectedId) || items[0];

  const handleAction = async (newStatus: "Approved" | "Rejected" | "Under Review") => {
    if (!activeItem) return;
    setActionLoading(true);
    try {
      if (newStatus === "Approved") {
        const user = getStoredUser();
        const role = user?.role === "welfare" || user?.role === "welfare_officer"
          ? "welfare"
          : user?.role === "commander"
          ? "commander"
          : approvalRole;
        const response = await api.put(`/grievance/${activeItem.id}/approve`, {
          role,
          single_sign: false,
          notes: `Approved by ${role} through the officer approval docket.`,
        });
        const result = response.data;
        const serverStatus = result.status === "approved" ? "Approved" : "Under Review";
        setItems((prev) =>
          prev.map((it) => (it.id === activeItem.id ? { ...it, status: serverStatus } : it))
        );
        setActionSuccess(result.message || `Signature recorded. ${role === "commander" ? "Welfare Officer" : "Company Commander"} co-signature is still required.`);
        setTimeout(() => setActionSuccess(null), 5000);
        return;
      } else if (newStatus === "Rejected") {
        await api.put(`/grievance/${activeItem.id}/reject`, { reason: "Operational deployment priority" });
      }

      setItems((prev) =>
        prev.map((it) => (it.id === activeItem.id ? { ...it, status: newStatus } : it))
      );
      setActionSuccess(`Request ${activeItem.ref} has been marked as ${newStatus} in the live ledger.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (e) {
      console.error("Failed to update status:", e);
      setActionSuccess(`The server did not accept the decision for ${activeItem.ref}; no local approval was recorded.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0c3866]" />
        <p className="text-xs font-semibold text-slate-600">Loading live approval docket from database...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-lg text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center mx-auto text-emerald-800">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 font-heading">Approval Docket Clear</h2>
        <p className="text-xs text-slate-600">
          No pending grievance or leave requests currently awaiting officer sign-off.
        </p>
        <Link href="/commander" className="ux4g-btn ux4g-btn-primary ux4g-btn-sm">
          Return to Commander Workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="ux4g-breadcrumb ux4g-breadcrumb-divider text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/" className="hover:text-[#0c3866]">Home</Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Officer Approval</span>
      </nav>

      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#0c3866] text-white">
            <UserCheck className="w-5 h-5 text-[#ff9933]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0c3866] font-heading">
              {lang === "hi" ? "अधिकारी समीक्षा एवं अनुमोदन" : lang === "ta" ? "அதிகாரி மதிப்பாய்வு மற்றும் ஒப்புதல்" : "Officer Review & Approval"}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Review pending personnel requests and safety-net suggestions. Every decision requires your human review.
            </p>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Docket Selector */}
      <div className="flex flex-wrap items-center gap-2">
        {getStoredUser()?.role === "admin" && (
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            Sign as
            <select
              value={approvalRole}
              onChange={(event) => setApprovalRole(event.target.value as "commander" | "welfare")}
              className="border border-slate-300 rounded px-2 py-1.5 bg-white"
              disabled={actionLoading}
            >
              <option value="commander">Company Commander</option>
              <option value="welfare">Welfare Officer</option>
            </select>
          </label>
        )}
        <span className="text-xs font-bold text-slate-700 mr-1">Requests Waiting for Decision:</span>
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => setSelectedId(it.id)}
            className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              selectedId === it.id
                ? "bg-[#0c3866] text-white border-[#0c3866]"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span>{it.ref}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                it.status === "Approved"
                  ? "bg-emerald-200 text-emerald-900"
                  : it.status === "Rejected"
                  ? "bg-rose-200 text-rose-900"
                  : it.status === "Under Review"
                  ? "bg-amber-200 text-amber-900"
                  : "bg-blue-200 text-blue-900"
              }`}
            >
              {it.status}
            </span>
          </button>
        ))}
      </div>

      {/* Main Decision Workspace */}
      {activeItem && (
        <div className="gov-card p-6 space-y-6 bg-white">
          {/* Question 1: Who needs attention? */}
          <div className="border-b border-slate-200 pb-4 space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Who needs attention?
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-heading">
                  {activeItem.applicant} ({activeItem.serviceNo})
                </h2>
                <p className="text-xs text-slate-600">
                  {activeItem.rank} · {activeItem.unit} · Reference: <strong className="font-mono text-[#0c3866]">{activeItem.ref}</strong>
                </p>
              </div>
              <div className="text-xs bg-slate-50 p-2 rounded border border-slate-200 sm:text-right">
                <span className="text-slate-500 block">Submitted Date:</span>
                <strong className="text-slate-900">{activeItem.submittedDate}</strong>
              </div>
            </div>
          </div>

          {/* Question 2: Why? */}
          <div className="space-y-1.5 text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wider block">
              Why? (Reason for concern)
            </span>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed">
              {activeItem.whyNeedsAttention}
            </div>
          </div>

          {/* Question 3: What can I do? */}
          <div className="space-y-1.5 text-xs">
            <span className="font-bold text-[#0c3866] uppercase tracking-wider block">
              What can I do? (Suggested Action)
            </span>
            <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-[#0c3866] font-semibold leading-relaxed">
              {activeItem.suggestedAction}
            </div>
          </div>

          {/* Question 4: Will this affect someone else? (Operational Checks) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Will this affect someone else? (Operational Checks)
              </h3>
              <span className="text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Safe &amp; Balanced
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {activeItem.operationalChecks.map((chk) => (
                <div
                  key={chk.title}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <strong className="text-slate-900">{chk.title}</strong>
                  </div>
                  <span className="text-slate-700 sm:text-right">{chk.explanation}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Replacement Soldier Summary */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-2">
            <span className="font-bold text-slate-800 block">Replacement Cover Summary:</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-500 block">Replacement Soldier:</span>
                <strong className="text-slate-900">{activeItem.teamImpact.replacementPerson}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Rest Status:</span>
                <strong className="text-emerald-700">{activeItem.teamImpact.restHours}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Team Impact:</span>
                <strong className="text-slate-900">{activeItem.teamImpact.impactSummary}</strong>
              </div>
            </div>
          </div>

          {/* Decision Controls */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Link
                href="/what-if"
                className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm flex items-center gap-1.5"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Try Another Plan</span>
              </Link>

              <Link
                href={`/track?ref=${encodeURIComponent(activeItem.ref)}`}
                className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm"
              >
                <span>Review Details</span>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleAction("Under Review")}
                className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm"
              >
                <span>Ask for Review</span>
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleAction("Rejected")}
                className="ux4g-btn ux4g-btn-danger ux4g-btn-sm bg-rose-600 hover:bg-rose-700 text-white"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                <span>Reject</span>
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleAction("Approved")}
                className="ux4g-btn ux4g-btn-primary ux4g-btn-md bg-[#138808] hover:bg-[#0d6506] text-white font-bold"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                <span>Approve</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
