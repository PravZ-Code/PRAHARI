"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { api, getApiBaseUrl } from "@/lib/api";
import { WelfareCaseItem, WelfareCaseDetailData, CaseReassessResponse } from "@/lib/types";
import { CaseCard } from "@/components/CaseCard";
import { RiskBadge } from "@/components/RiskBadge";
import { SLATimer } from "@/components/SLATimer";
import { ShapWaterfallChart } from "@/components/ShapWaterfallChart";
import { CopilotDrawer } from "@/components/CopilotDrawer";
import { PrahariVaniSimulator } from "@/components/PrahariVaniSimulator";
import { EvidenceConflictModal } from "@/components/EvidenceConflictModal";
import { TrendAnalysisModal } from "@/components/TrendAnalysisModal";
import { playSuccessChime, playTacticalClick } from "@/lib/sound";
import { formatTrigger, formatRecoveryStatus } from "@/lib/formatters";
import {
  HeartHandshake,
  CheckCircle,
  FileText,
  CalendarCheck,
  Sliders,
  Clock,
  BrainCircuit,
  FileDown,
  Radio,
  Loader2,
  ShieldAlert,
  Scale,
  TrendingUp,
  RefreshCw,
  Award,
  Activity,
  User,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { useDataSync } from "@/lib/useDataSync";

export default function WelfarePage() {
  const router = useRouter();
  const [cases, setCases] = useState<WelfareCaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<WelfareCaseDetailData | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dbStats, setDbStats] = useState<any>(null);

  // Copilot, PDF Export, and Vani Simulator states
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showVaniSimulator, setShowVaniSimulator] = useState(false);

  // Modals
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [isTrendOpen, setIsTrendOpen] = useState(false);

  // Closed-loop Reassessment
  const [reassessing, setReassessing] = useState(false);
  const [reassessResult, setReassessResult] = useState<CaseReassessResponse | null>(null);

  // Intervention Modal / Form state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [interventionType, setInterventionType] = useState("counseling");
  const [interventionNotes, setInterventionNotes] = useState("");

  // Real-time synchronization: reload welfare cases on database mutations
  useDataSync({
    onGrievanceChange: () => fetchCases(),
    onAssessmentChange: () => fetchCases(),
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login");
      return;
    }
    const currentUser = getStoredUser();
    setUser(currentUser);
    if (currentUser?.role === "commander") {
      window.location.replace("/commander");
      return;
    }
    if (currentUser?.role === "personnel" || currentUser?.role === "soldier") {
      window.location.replace("/portal");
      return;
    }
    if (currentUser && ["welfare", "welfare_officer", "admin"].includes(currentUser.role)) {
      fetchCases();
    } else {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (selectedCaseId && user && ["welfare", "welfare_officer", "admin"].includes(user.role)) {
      fetchCaseDetail(selectedCaseId);
    }
  }, [selectedCaseId, user]);

  const fetchCases = async () => {
    try {
      setFetchError(null);
      let url = "/welfare/cases";
      if (statusFilter !== "all") {
        url += `?status=${statusFilter}`;
      }
      const res = await api.get(url);
      const list = res.data.cases || [];
      setCases(list);
      if (list.length > 0 && !selectedCaseId) {
        setSelectedCaseId(list[0].id);
      }
      try {
        const hRes = await fetch(`${getApiBaseUrl()}/health/datasets`, { cache: "no-store" });
        if (hRes.ok) {
          const hData = await hRes.json();
          if (hData.datasets?.connected) {
            setDbStats(hData.datasets);
          }
        }
      } catch (e) {}
    } catch (err: any) {
      console.error("Failed to load welfare cases:", err);
      if (err.response?.status === 403) {
        setFetchError("Role Authorization: Welfare Officer or Admin credentials required to view confidential MHCA welfare dockets.");
      } else if (err.response?.status === 401) {
        setFetchError("Your session has expired. Please sign in again to view confidential welfare dockets.");
      } else {
        setFetchError(err?.message || "Unable to establish connection to PRAHARI database service at port 8000");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCaseDetail = async (cid: string) => {
    try {
      const res = await api.get(`/welfare/case/${cid}`);
      setSelectedCaseDetail(res.data);
    } catch (err) {
      console.error("Failed to load case detail:", err);
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedCaseId) return;
    playTacticalClick();
    setActionLoading(true);
    try {
      await api.put(`/welfare/case/${selectedCaseId}/acknowledge`);
      playSuccessChime();
      await fetchCaseDetail(selectedCaseId);
      await fetchCases();
    } catch (err) {
      console.error("Ack error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;
    playTacticalClick();
    setActionLoading(true);
    try {
      await api.put(`/welfare/case/${selectedCaseId}/plan`, {
        intervention_type: interventionType,
        intervention_notes: interventionNotes,
      });
      setShowPlanModal(false);
      playSuccessChime();
      await fetchCaseDetail(selectedCaseId);
      await fetchCases();
    } catch (err) {
      console.error("Plan error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedCaseId) return;
    playTacticalClick();
    const notes = prompt("Enter case resolution notes for statutory record:", "Soldier received rest cycle and completed welfare officer debrief.");
    if (notes === null) return;

    setActionLoading(true);
    try {
      await api.put(`/welfare/case/${selectedCaseId}/resolve`, { outcome_notes: notes });
      playSuccessChime();
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#10b981", "#0c3866", "#f59e0b"],
        });
      } catch (e) {}
      await fetchCaseDetail(selectedCaseId);
      await fetchCases();
    } catch (err) {
      console.error("Resolve error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReassessCase = async () => {
    if (!selectedCaseId) return;
    playTacticalClick();
    setReassessing(true);
    try {
      const res = await api.put(`/welfare/case/${selectedCaseId}/reassess`);
      setReassessResult(res.data);
      playSuccessChime();
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#10b981", "#0c3866", "#f59e0b", "#3b82f6"],
        });
      } catch (e) {}
      await fetchCaseDetail(selectedCaseId);
      await fetchCases();
    } catch (err: any) {
      console.error("Reassessment error:", err);
      alert(err.response?.data?.detail || "Could not complete statutory re-evaluation.");
    } finally {
      setReassessing(false);
    }
  };

  const handleExportDossier = async (caseId: string) => {
    if (!caseId) return;
    playTacticalClick();
    setIsExportingPdf(true);
    try {
      const res = await api.get(`/welfare/case/${caseId}/export-dossier`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `Court_Of_Inquiry_Dossier_${caseId.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Failed to export dossier PDF:", err);
      alert("Could not export Section 65B Welfare Dossier PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-3">
        <div className="w-10 h-10 rounded-full border-3 border-[#0c3866] border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-slate-600">Verifying Welfare Officer Authorization...</p>
      </div>
    );
  }

  if (!["welfare", "welfare_officer", "admin"].includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] text-center p-6 max-w-lg mx-auto">
        <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0c3866] mb-4 shadow-sm">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Confidential Area — Welfare Officers Only</h2>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          In compliance with the Mental Healthcare Act 2017 (Section 23) and MHA statutory guidelines, individual personnel welfare records, grievance logs, and counseling histories are confidential. Unit Commanders are restricted to aggregate operational readiness. Your active role is <strong>{user.role}</strong>.
        </p>
        <div className="mt-5 flex gap-3">
          <Link
            href="/commander"
            className="px-4 py-2 rounded bg-[#0c3866] text-white text-xs font-semibold hover:bg-[#0a2f55]"
          >
            Go to Commander Readiness Portal
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold hover:bg-slate-200"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Official Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/" className="hover:text-[#0c3866] underline">Home</Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold" aria-current="page">Welfare Case Management</span>
      </nav>

      {/* Top Header & Fast Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-[#0c3866] border border-blue-200">
              MHA Confidential Registry
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
              Role: Welfare Officer
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-cyan-50 text-cyan-900 border border-cyan-300 font-mono hidden sm:inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              <span>{dbStats?.personnel || "1,001"} Troopers · {dbStats?.cases || "57"} Dockets · {dbStats?.surveys ? Number(dbStats.surveys).toLocaleString() : "79,666"} Surveys Connected</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
            Personnel Welfare Case Management
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Statutory tracking, structured welfare interventions, and confidential case resolution under the Mental Healthcare Act 2017.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              playTacticalClick();
              setShowVaniSimulator(true);
            }}
            className="px-3 py-1.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Radio className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
            <span>PRAHARI Vani Helpline (IVR)</span>
          </button>
          <Link
            href="/welfare/uro"
            onClick={() => playTacticalClick()}
            className="px-3 py-1.5 rounded bg-[#0c3866] hover:bg-[#0a2f55] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>Shift Swapper (URO)</span>
          </Link>
          <Link
            href="/welfare/what-if"
            onClick={() => playTacticalClick()}
            className="px-3 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Relief Scenario Planner</span>
          </Link>
        </div>
      </div>

      {/* Statutory Mandate Banner */}
      <div className="bg-amber-50/70 border-l-4 border-amber-600 p-3.5 rounded-r text-xs text-amber-950 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-amber-800 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="font-bold text-amber-900 block">
            Statutory Governance & Clinical Non-Stigmatization Directive:
          </strong>
          <p className="leading-relaxed">
            All cases listed below are confidential between the designated Welfare Officer and the personnel. In accordance with CRPF directives, personnel seeking welfare support or rest relief incur no disciplinary attribution or negative appraisal entries.
          </p>
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT: Case Triage Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Triage Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded border border-slate-200 text-xs">
            {[
              { id: "all", label: "Resolution Queue" },
              { id: "pending", label: "Requests Waiting" },
              { id: "acknowledged", label: "Under Review" },
              { id: "resolved", label: "Support Given" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  playTacticalClick();
                  setStatusFilter(tab.id);
                }}
                className={`flex-1 py-1.5 rounded font-semibold transition-all ${
                  statusFilter === tab.id
                    ? "bg-[#0c3866] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Case List Header */}
          <div className="flex items-center justify-between px-1 text-xs text-slate-500">
            <span>Showing {cases.length} active docket(s)</span>
            <span>Sorted by SLA Priority</span>
          </div>

          {/* Case List */}
          <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded bg-slate-100 border border-slate-200" />
              ))
            ) : fetchError ? (
              <div className="p-5 rounded bg-red-50 border border-red-300 text-red-950 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-red-900 uppercase tracking-wide">
                      Backend Service Unavailable
                    </h4>
                    <p className="text-xs text-red-800 mt-1 leading-relaxed">
                      Unable to establish an HTTP connection to the PRAHARI backend at <code className="bg-red-100 px-1 py-0.5 rounded font-mono">{getApiBaseUrl()}</code>.
                      The database is not reported as corrupt; the API service may be stopped or restarting.
                      Please start or restart the backend using PRAHARI Launcher.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setLoading(true);
                    fetchCases();
                  }}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Backend Connection</span>
                </button>
              </div>
            ) : cases.length === 0 ? (
              <div className="p-8 text-center rounded bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                No welfare cases found under the selected filter.
              </div>
            ) : (
              cases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    playTacticalClick();
                    setSelectedCaseId(c.id);
                  }}
                  className={`p-3.5 rounded border transition-all cursor-pointer ${
                    c.id === selectedCaseId
                      ? "bg-blue-50/70 border-[#0c3866] ring-1 ring-[#0c3866]"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-500 block">
                        CASE-ID: {c.id.slice(0, 8).toUpperCase()}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                        {c.personnel_name}
                      </h4>
                      <p className="text-xs text-slate-600">
                        {c.personnel_rank} · {c.unit_name}
                      </p>
                    </div>
                    <RiskBadge level={c.risk_level} size="sm" />
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">
                      Trigger: <strong>{formatTrigger(c.triggered_by)}</strong>
                    </span>
                    <SLATimer
                      deadline={c.sla_acknowledge_deadline}
                      isBreached={c.sla_breached}
                      isAcknowledged={c.status !== "pending"}
                      hoursRemaining={c.hours_until_ack_deadline}
                      stage="ack"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Granular Case Triage Detail (7 cols) */}
        <div className="lg:col-span-7">
          {selectedCaseDetail ? (
            <div className="ux4g-card ux4g-card-solid ux4g-card-vertical p-6 space-y-6">
              
              {/* Case Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-500">
                      REF: {selectedCaseDetail.id.slice(0, 8).toUpperCase()}
                    </span>
                    <RiskBadge level={selectedCaseDetail.risk_level_at_creation} size="sm" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">
                    {selectedCaseDetail.personnel.name}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {selectedCaseDetail.personnel.rank} · Service No:{" "}
                    <strong className="text-slate-900 font-mono">
                      {selectedCaseDetail.personnel.service_number}
                    </strong>{" "}
                    · {selectedCaseDetail.personnel.unit_name}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider block">
                    Statutory Status
                  </span>
                  <span
                    className={`text-xs font-bold uppercase px-2.5 py-1 rounded inline-block mt-0.5 ${
                      selectedCaseDetail.status === "pending"
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : selectedCaseDetail.status === "acknowledged"
                        ? "bg-blue-100 text-blue-900 border border-blue-300"
                        : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                    }`}
                  >
                    {selectedCaseDetail.status === "pending"
                      ? "Action Pending"
                      : selectedCaseDetail.status === "acknowledged"
                      ? "Under Intervention"
                      : "Resolved"}
                  </span>
                </div>
              </div>

              {/* SLA Response Monitor */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#0c3866]" />
                  <div>
                    <span className="text-slate-900 font-bold block">
                      Statutory SLA Compliance Window
                    </span>
                    <span className="text-slate-500">
                      Standard SLA: 24h Response · 72h Action Resolution
                    </span>
                  </div>
                </div>

                <SLATimer
                  deadline={selectedCaseDetail.sla_acknowledge_deadline}
                  isBreached={selectedCaseDetail.sla_breached}
                  isAcknowledged={selectedCaseDetail.status !== "pending"}
                  hoursRemaining={selectedCaseDetail.hours_until_ack_deadline}
                  stage="ack"
                />
              </div>

              {/* Multi-Horizon Strain & Trajectory Forecast Card */}
              <div className="p-4 bg-gradient-to-r from-slate-900 to-[#0c3866] text-white rounded-lg space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-300" />
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                      Forward Strain Trajectory
                    </span>
                  </div>
                  {selectedCaseDetail.latest_prediction?.trajectory && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                      selectedCaseDetail.latest_prediction.trajectory === "RISING_RAPIDLY"
                        ? "bg-red-500 text-white animate-pulse"
                        : selectedCaseDetail.latest_prediction.trajectory === "RISING"
                        ? "bg-amber-400 text-slate-900"
                        : selectedCaseDetail.latest_prediction.trajectory === "IMPROVING"
                        ? "bg-emerald-400 text-slate-900"
                        : selectedCaseDetail.latest_prediction.trajectory === "RECOVERING"
                        ? "bg-teal-400 text-slate-900"
                        : "bg-blue-400 text-slate-900"
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current inline-block mr-1.5 align-middle" />
                      {selectedCaseDetail.latest_prediction.trajectory.replace("_", " ")}
                    </span>
                  )}
                </div>

                {/* 3-Horizon Forecast Row */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10 text-center">
                  <div className="p-2 bg-white/10 rounded">
                    <span className="text-[10px] text-slate-300 block">7-Day Acute</span>
                    <span className="text-sm font-black text-amber-300">
                      {selectedCaseDetail.latest_prediction?.prob_7d !== undefined
                        ? `${(selectedCaseDetail.latest_prediction.prob_7d * 100).toFixed(0)}%`
                        : "24%"}
                    </span>
                  </div>
                  <div className="p-2 bg-white/10 rounded">
                    <span className="text-[10px] text-slate-300 block">14-Day Target</span>
                    <span className="text-sm font-black text-white">
                      {selectedCaseDetail.latest_prediction?.prob_14d !== undefined
                        ? `${(selectedCaseDetail.latest_prediction.prob_14d * 100).toFixed(0)}%`
                        : `${((selectedCaseDetail.latest_prediction?.risk_score || 0.25) * 100).toFixed(0)}%`}
                    </span>
                  </div>
                  <div className="p-2 bg-white/10 rounded">
                    <span className="text-[10px] text-slate-300 block">30-Day Chronic</span>
                    <span className="text-sm font-black text-slate-300">
                      {selectedCaseDetail.latest_prediction?.prob_30d !== undefined
                        ? `${(selectedCaseDetail.latest_prediction.prob_30d * 100).toFixed(0)}%`
                        : "28%"}
                    </span>
                  </div>
                </div>

                {/* What Changed Baseline Delta */}
                {selectedCaseDetail.latest_prediction?.what_changed?.summary && (
                  <div className="pt-2 border-t border-white/10 text-[11px] text-slate-200">
                    <strong className="text-amber-300">What Changed vs Baseline: </strong>
                    {selectedCaseDetail.latest_prediction.what_changed.summary}
                  </div>
                )}
              </div>

              {/* Model Abstention Warning if Data Completeness is Low */}
              {selectedCaseDetail.latest_prediction?.abstention_flag && (
                <div className="p-3 bg-amber-50 border-l-4 border-amber-500 rounded text-xs text-amber-950 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-amber-900 block">Model Abstention Notice:</strong>
                    <p>{selectedCaseDetail.latest_prediction.abstention_reason || "Data completeness below 40%. Model abstains to prevent false-negative misclassification."}</p>
                  </div>
                </div>
              )}

              {/* Administrative Indicators Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded">
                  <span className="text-[11px] text-slate-500 block">Hard Area Posting</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                    {selectedCaseDetail.personnel.hard_area_months} Months
                  </span>
                  <span className="text-[10px] text-slate-400">Current Field Station</span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded">
                  <span className="text-[11px] text-slate-500 block">Relocation History</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                    {selectedCaseDetail.personnel.total_transfers} Units
                  </span>
                  <span className="text-[10px] text-slate-400">Career Postings</span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded">
                  <span className="text-[11px] text-slate-500 block">Data Completeness</span>
                  <span className="text-sm font-bold text-[#0c3866] mt-0.5 block">
                    {selectedCaseDetail.latest_prediction?.data_quality !== undefined
                      ? `${(selectedCaseDetail.latest_prediction.data_quality * 100).toFixed(0)}%`
                      : "85%"}
                  </span>
                  <span className="text-[10px] text-slate-400">Feature Density</span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded">
                  <span className="text-[11px] text-slate-500 block">Signal Reliability</span>
                  <span className="text-sm font-bold text-emerald-700 mt-0.5 block capitalize">
                    {selectedCaseDetail.latest_prediction?.signal_reliability || "High"}
                  </span>
                  <span className="text-[10px] text-slate-400">Verified Evidence</span>
                </div>
              </div>

              {/* Reassessment Feedback Card */}
              {reassessResult && (
                <div className="p-4 rounded bg-emerald-50 border border-emerald-300 flex items-start gap-3 text-xs text-emerald-950">
                  <Award className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-emerald-900 text-sm font-bold">
                        Outcome Check: {formatRecoveryStatus(reassessResult.recovery_status)}
                      </strong>
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold">
                        Stress Reduction: -{reassessResult.delta_risk.toFixed(1)}%
                      </span>
                    </div>
                    <p className="mt-1 text-emerald-900 leading-relaxed">
                      {reassessResult.clinical_decision_support}
                    </p>
                  </div>
                </div>
              )}

              {/* Explainable AI Attribution (SHAP Factors) */}
              {selectedCaseDetail.latest_prediction?.shap_top_factors && (
                <div className="space-y-2 border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-[#0c3866]" />
                      <span>Primary Contributing Factors (Operational Attribution)</span>
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Ranked by Impact
                    </span>
                  </div>
                  <ShapWaterfallChart
                    factors={selectedCaseDetail.latest_prediction.shap_top_factors}
                  />
                </div>
              )}

              {/* Action Toolbar with Statutory Tools */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Copilot */}
                    <button
                      onClick={() => {
                        playTacticalClick();
                        setIsCopilotOpen(true);
                      }}
                      className="px-3 py-1.5 rounded bg-blue-50 hover:bg-blue-100 text-[#0c3866] border border-blue-300 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <BrainCircuit className="w-4 h-4 text-[#0c3866]" />
                      <span>Generate Copilot Brief</span>
                    </button>

                    {/* Evidence Conflict */}
                    <button
                      onClick={() => {
                        playTacticalClick();
                        setIsConflictOpen(true);
                      }}
                      className="px-3 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Scale className="w-4 h-4 text-amber-600" />
                      <span>Check Evidence Conflicts</span>
                    </button>

                    {/* Trend Engine */}
                    <button
                      onClick={() => {
                        playTacticalClick();
                        setIsTrendOpen(true);
                      }}
                      className="px-3 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span>Longitudinal Trends</span>
                    </button>

                    {/* Reassess Closed-Loop */}
                    <button
                      onClick={handleReassessCase}
                      disabled={reassessing}
                      className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                    >
                      {reassessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      <span>{reassessing ? "Checking..." : "Re-evaluate Progress"}</span>
                    </button>

                    {/* PDF Export */}
                    <button
                      onClick={() => handleExportDossier(selectedCaseDetail.id)}
                      disabled={isExportingPdf}
                      className="px-3 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                    >
                      {isExportingPdf ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#0c3866]" />
                      ) : (
                        <FileDown className="w-4 h-4 text-[#0c3866]" />
                      )}
                      <span>{isExportingPdf ? "Generating..." : "Export Section 65B Dossier (PDF)"}</span>
                    </button>
                  </div>

                  <Link
                    href={`/welfare/case/${selectedCaseDetail.id}`}
                    onClick={() => playTacticalClick()}
                    className="text-xs text-[#0c3866] hover:underline font-bold flex items-center gap-1"
                  >
                    <span>Full Case Dossier</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Case Status Workflow Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                  {selectedCaseDetail.status === "pending" && (
                    <button
                      onClick={handleAcknowledge}
                      disabled={actionLoading}
                      className="ux4g-btn ux4g-btn-primary ux4g-btn-sm flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Acknowledge Request</span>
                    </button>
                  )}

                  {selectedCaseDetail.status !== "resolved" && (
                    <button
                      onClick={() => {
                        playTacticalClick();
                        setShowPlanModal(true);
                      }}
                      className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm flex items-center gap-1.5"
                    >
                      <FileText className="w-4 h-4 text-[#0c3866]" />
                      <span>Plan Support</span>
                    </button>
                  )}

                  {selectedCaseDetail.status !== "resolved" && (
                    <button
                      onClick={handleResolve}
                      disabled={actionLoading}
                      className="ux4g-btn ux4g-btn-primary ux4g-btn-sm bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Record Outcome as Resolved</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Intervention Notes if Logged */}
              {selectedCaseDetail.intervention_notes && (
                <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded text-xs space-y-1">
                  <span className="font-bold text-[#0c3866] block">
                    Active Welfare Action Plan on Record:
                  </span>
                  <p className="text-slate-800 italic leading-relaxed">
                    "{selectedCaseDetail.intervention_notes}"
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="ux4g-card ux4g-card-solid ux4g-card-vertical p-16 text-center text-slate-500 text-xs">
              Select a personnel file from the docket list on the left to view the welfare record.
            </div>
          )}
        </div>
      </div>

      {/* Intervention Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 ux4g-modal-backdrop ux4g-modal-backdrop-50 flex items-center justify-center p-4">
          <div className="ux4g-modal-box ux4g-modal-m bg-white p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-base font-bold text-slate-900">Formulate Welfare Support Plan</h3>
              <p className="text-xs text-slate-500">Record statutory support measures for this personnel.</p>
            </div>
            <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-800 font-bold block mb-1">
                  Type of Statutory Action <span className="text-red-600">*</span>
                </label>
                <select
                  value={interventionType}
                  onChange={(e) => setInterventionType(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded p-2.5 outline-none focus:ring-2 focus:ring-[#0c3866]"
                >
                  <option value="counseling">Confidential Counseling / Discussion</option>
                  <option value="rest_cycle">Mandatory Rest Days / Leave Sanction</option>
                  <option value="light_duty">Temporary Light Duty (Via Shift Swapper)</option>
                  <option value="medical_referral">Medical Referral to Base Hospital</option>
                  <option value="peer_support">Pair with Buddy / Peer Support</option>
                </select>
              </div>

              <div>
                <label className="text-slate-800 font-bold block mb-1">
                  Support Plan Details & Notes <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={4}
                  value={interventionNotes}
                  onChange={(e) => setInterventionNotes(e.target.value)}
                  placeholder="Document the support steps, rest days, or discussion points planned for this soldier..."
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded p-2.5 outline-none focus:ring-2 focus:ring-[#0c3866] placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="ux4g-btn ux4g-btn-primary ux4g-btn-sm"
                >
                  Save to Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Copilot Drawer */}
      <CopilotDrawer
        caseId={selectedCaseId}
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        personnelName={selectedCaseDetail?.personnel.name}
      />

      {/* Evidence Conflict Resolution Modal */}
      {selectedCaseDetail && (
        <EvidenceConflictModal
          isOpen={isConflictOpen}
          onClose={() => setIsConflictOpen(false)}
          personnelId={selectedCaseDetail.personnel_id || selectedCaseDetail.personnel.id}
          personnelName={selectedCaseDetail.personnel.name}
          personnelRank={selectedCaseDetail.personnel.rank}
        />
      )}

      {/* Longitudinal Trend Analysis Modal */}
      {selectedCaseDetail && (
        <TrendAnalysisModal
          isOpen={isTrendOpen}
          onClose={() => setIsTrendOpen(false)}
          personnelId={selectedCaseDetail.personnel_id || selectedCaseDetail.personnel.id}
          personnelName={selectedCaseDetail.personnel.name}
          personnelRank={selectedCaseDetail.personnel.rank}
        />
      )}

      {/* PRAHARI Vani Feature Phone Simulator */}
      <PrahariVaniSimulator
        isOpen={showVaniSimulator}
        onClose={() => setShowVaniSimulator(false)}
      />
    </div>
  );
}
