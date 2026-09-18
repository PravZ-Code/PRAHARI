"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import { api } from "@/lib/api";
import { WelfareCaseDetailData, CaseReassessResponse } from "@/lib/types";
import { RiskBadge } from "@/components/RiskBadge";
import { SLATimer } from "@/components/SLATimer";
import { ShapWaterfallChart } from "@/components/ShapWaterfallChart";
import { CopilotDrawer } from "@/components/CopilotDrawer";
import { EvidenceConflictModal } from "@/components/EvidenceConflictModal";
import { TrendAnalysisModal } from "@/components/TrendAnalysisModal";
import { playSuccessChime, playTacticalClick } from "@/lib/sound";
import {
  ArrowLeft,
  User,
  HeartHandshake,
  CheckCircle,
  FileDown,
  BrainCircuit,
  Loader2,
  Scale,
  TrendingUp,
  RefreshCw,
  ShieldAlert,
  Activity,
  Award,
  ShieldCheck,
  FileText,
} from "lucide-react";

import { isAuthenticated, getStoredUser } from "@/lib/auth";

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params?.id as string;
  const [detail, setDetail] = useState<WelfareCaseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Modals & Drawers
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [isTrendOpen, setIsTrendOpen] = useState(false);

  // Closed-loop reassessment state
  const [reassessing, setReassessing] = useState(false);
  const [reassessResult, setReassessResult] = useState<CaseReassessResponse | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login?redirect=" + encodeURIComponent(window.location.pathname));
      return;
    }
    const user = getStoredUser();
    if (user && user.role !== "welfare" && user.role !== "welfare_officer" && user.role !== "admin") {
      window.location.replace("/portal");
      return;
    }
    if (caseId) {
      fetchCase();
    }
  }, [caseId]);

  const fetchCase = async () => {
    try {
      const res = await api.get(`/welfare/case/${caseId}`);
      setDetail(res.data);
    } catch (err: any) {
      console.error("Failed to load case:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        window.location.replace("/login?redirect=" + encodeURIComponent(window.location.pathname));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportDossier = async () => {
    if (!caseId) return;
    playTacticalClick();
    setIsExporting(true);
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
      console.error("Failed to export PDF dossier:", err);
      alert("Failed to export Section 65B Welfare Dossier. Please retry.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleReassessCase = async () => {
    if (!caseId) return;
    playTacticalClick();
    setReassessing(true);
    try {
      const res = await api.put(`/welfare/case/${caseId}/reassess`);
      setReassessResult(res.data);
      playSuccessChime();
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#10b981", "#0c3866", "#f59e0b"],
        });
      } catch (e) {}
      await fetchCase();
    } catch (err: any) {
      console.error("Reassessment error:", err);
      alert(err.response?.data?.detail || "Could not complete statutory re-evaluation.");
    } finally {
      setReassessing(false);
    }
  };

  if (loading || !detail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-500 text-xs">
        <Loader2 className="w-8 h-8 text-[#0c3866] animate-spin" />
        <span>Loading confidential welfare docket...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Official Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/" className="hover:text-[#0c3866] underline">Home</Link>
        <span>/</span>
        <Link href="/welfare" className="hover:text-[#0c3866] underline">Welfare Case Management</Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold" aria-current="page">Case #{detail.id.slice(0, 8).toUpperCase()}</span>
      </nav>

      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link
            href="/welfare"
            onClick={() => playTacticalClick()}
            className="text-xs text-slate-600 hover:text-[#0c3866] flex items-center gap-1.5 font-semibold transition-colors mb-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Welfare Docket Queue</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Personnel Welfare Case Dossier
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Full administrative record, contributing stress factors, and Section 65B certified evidence trail.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* AI Copilot */}
          <button
            onClick={() => {
              playTacticalClick();
              setIsCopilotOpen(true);
            }}
            className="bg-blue-50 hover:bg-blue-100 text-[#0c3866] border border-blue-300 font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <BrainCircuit className="w-4 h-4 text-[#0c3866]" />
            <span>Generate Copilot Brief</span>
          </button>

          {/* Evidence Conflict Button */}
          <button
            onClick={() => {
              playTacticalClick();
              setIsConflictOpen(true);
            }}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs px-3 py-1.5 rounded flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Scale className="w-4 h-4 text-amber-600" />
            <span>Check Conflicts</span>
          </button>

          {/* Longitudinal Trend Button */}
          <button
            onClick={() => {
              playTacticalClick();
              setIsTrendOpen(true);
            }}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs px-3 py-1.5 rounded flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>View Trend</span>
          </button>

          {/* Reassess Closed-Loop Welfare */}
          <button
            onClick={handleReassessCase}
            disabled={reassessing}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
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
            onClick={handleExportDossier}
            disabled={isExporting}
            className="bg-[#0c3866] hover:bg-[#0a2f55] text-white font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <FileDown className="w-4 h-4 text-white" />
            )}
            <span>{isExporting ? "Exporting..." : "Export Section 65B PDF"}</span>
          </button>
        </div>
      </div>

      {/* Reassessment Banner Feedback */}
      {reassessResult && (
        <div className="p-4 rounded bg-emerald-50 border border-emerald-300 flex items-start gap-3 text-xs text-emerald-950">
          <Award className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <strong className="text-emerald-900 text-sm font-bold">
                Progress Check Completed: {reassessResult.recovery_status.replace(/_/g, " ")}
              </strong>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold">
                Stress Change: -{reassessResult.delta_risk.toFixed(1)}%
              </span>
            </div>
            <p className="mt-1 text-emerald-900 leading-relaxed">
              {reassessResult.clinical_decision_support}
            </p>
          </div>
        </div>
      )}

      {/* Main Case Dossier Card */}
      <div className="gov-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-500">
                CASE REF: {detail.id.toUpperCase()}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-[#0c3866] font-semibold">
                Protected Under Mental Healthcare Act 2017
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              {detail.personnel.rank} {detail.personnel.name}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Service No: <strong className="text-slate-900 font-mono">{detail.personnel.service_number}</strong> · Unit: {detail.personnel.unit_name}
            </p>
          </div>
          <RiskBadge level={detail.risk_level_at_creation} size="lg" />
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="text-slate-500 block">Current Formation</span>
            <strong className="text-slate-900 text-sm block mt-1">{detail.personnel.unit_name}</strong>
            <span className="text-[10px] text-slate-400">Tactical Assignment</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="text-slate-500 block">Hard Area Tenure</span>
            <strong className="text-red-700 text-sm block mt-1">{detail.personnel.hard_area_months} Months</strong>
            <span className="text-[10px] text-slate-400">High Altitude / CI Zone</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="text-slate-500 block">Docket Status</span>
            <strong className="text-emerald-700 text-sm block mt-1 uppercase">{detail.status}</strong>
            <span className="text-[10px] text-slate-400">Statutory Welfare Track</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="text-slate-500 block">Response SLA Tracking</span>
            <div className="mt-1">
              <SLATimer
                deadline={detail.sla_acknowledge_deadline}
                isBreached={detail.sla_breached}
                isAcknowledged={detail.status !== "pending"}
                hoursRemaining={detail.hours_until_ack_deadline}
              />
            </div>
          </div>
        </div>

        {/* Explainable AI Attribution (SHAP Waterfall) */}
        {detail.latest_prediction?.shap_top_factors && (
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#0c3866]" />
                <span>Primary Operational Stress Catalysts (SHAP Attribution)</span>
              </h3>
              <span className="text-[11px] text-slate-500">
                Ranked by Magnitude
              </span>
            </div>
            <ShapWaterfallChart factors={detail.latest_prediction.shap_top_factors} />
          </div>
        )}

        {/* Intervention Notes if Logged */}
        {detail.intervention_notes && (
          <div className="p-4 bg-blue-50/50 border border-blue-200 rounded text-xs space-y-1">
            <span className="font-bold text-[#0c3866] block">
              Active Welfare Action Plan on Record:
            </span>
            <p className="text-slate-800 italic leading-relaxed">
              "{detail.intervention_notes}"
            </p>
          </div>
        )}
      </div>

      {/* Slide-out AI Copilot Drawer */}
      <CopilotDrawer
        caseId={caseId}
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        personnelName={detail.personnel.name}
      />

      {/* Evidence Conflict Resolution Modal */}
      <EvidenceConflictModal
        isOpen={isConflictOpen}
        onClose={() => setIsConflictOpen(false)}
        personnelId={detail.personnel_id || detail.personnel.id}
        personnelName={detail.personnel.name}
        personnelRank={detail.personnel.rank}
      />

      {/* Longitudinal Trend Analysis Modal */}
      <TrendAnalysisModal
        isOpen={isTrendOpen}
        onClose={() => setIsTrendOpen(false)}
        personnelId={detail.personnel_id || detail.personnel.id}
        personnelName={detail.personnel.name}
        personnelRank={detail.personnel.rank}
      />
    </div>
  );
}
