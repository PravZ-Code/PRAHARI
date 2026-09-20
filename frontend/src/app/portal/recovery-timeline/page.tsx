"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { formatHumanReadable } from "@/lib/formatters";
import {
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  HeartHandshake,
  UserCheck,
  Award,
  Sparkles,
  ArrowRight,
  Printer,
  Shield,
  Layers,
  Activity
} from "lucide-react";

interface TimelineStage {
  stage_id: string;
  stage_number: number;
  title: string;
  status: "completed" | "current" | "pending";
  timestamp: string;
  summary: string;
  metrics: Record<string, string>;
  authority: string;
  statutory_seal: string;
}

interface RecoveryTimelineData {
  personnel_id: string;
  name: string;
  rank: string;
  service_number: string;
  unit_name: string;
  current_stage: number;
  overall_status: string;
  total_stages: number;
  stages: TimelineStage[];
}

export default function RecoveryTimelinePage() {
  const router = useRouter();
  const { lang } = useTranslation();
  const [data, setData] = useState<RecoveryTimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login?redirect=/portal/recovery-timeline");
      return;
    }
    fetchTimeline();
  }, []);

  const fetchTimeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/personnel/recovery-timeline");
      setData(res.data);
    } catch (err: any) {
      console.error("Failed to load Recovery Timeline:", err);
      setError(err?.response?.data?.detail || "Unable to retrieve structured recovery lifecycle.");
    } finally {
      setLoading(false);
    }
  };

  const getStageIcon = (stageId: string, status: string) => {
    if (status === "completed") {
      return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    }
    if (status === "current") {
      return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
    }
    return <Clock className="w-5 h-5 text-slate-300" />;
  };

  const getStageHeaderBg = (status: string) => {
    if (status === "completed") {
      return "border-emerald-500/40 bg-emerald-50/30";
    }
    if (status === "current") {
      return "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20";
    }
    return "border-slate-200 bg-white opacity-70";
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <Link
            href="/portal"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0c3866] hover:text-[#072648] transition-colors mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Trooper Portal</span>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black font-heading text-slate-900 tracking-tight">
              Dedicated Recovery Timeline
            </h1>
            <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-900 text-xs font-bold font-mono border border-emerald-300">
              6-STAGE LIFECYCLE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            End-to-end audit trail tracking operational fatigue detection, human review, relief intervention, and verified recovery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-md border border-slate-300 flex items-center gap-1.5 transition-colors print:hidden"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Timeline</span>
          </button>
          <button
            onClick={fetchTimeline}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 transition-colors print:hidden"
            title="Refresh Timeline"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#0c3866] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Loading recovery timeline...</p>
          <p className="text-xs text-slate-500">Checking duty rosters, rest support records, and follow-up check-ins.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-6 text-red-800 space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span>Timeline Traversal Error</span>
          </div>
          <p className="text-xs">{error}</p>
        </div>
      )}

      {data && (
        <>
          {/* Soldier Identifier & Progress Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-[#072648] to-[#0c3866] text-white rounded-xl p-6 shadow-md border border-slate-700 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center font-bold text-base">
                  {data.name ? data.name.slice(0, 2).toUpperCase() : "CR"}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{data.rank} {data.name}</span>
                    <span className="text-xs font-mono font-normal text-slate-300">({data.service_number})</span>
                  </h2>
                  <p className="text-xs text-slate-300">
                    Battalion Unit: <strong className="text-white">{data.unit_name}</strong> · Recovery Status: <strong className="text-emerald-400">{data.overall_status}</strong>
                  </p>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/15 text-right sm:min-w-[200px]">
                <span className="text-[11px] uppercase tracking-wider text-slate-300 block">Progress State</span>
                <span className="text-base font-black text-emerald-300">
                  Stage {data.current_stage} of {data.total_stages}
                </span>
                <span className="text-[11px] text-slate-300 block">
                  {data.current_stage === 6 ? "Recovery Verified" : "Active Supervision"}
                </span>
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
                <span>Baseline</span>
                <span>Risk Detected</span>
                <span>Human Review</span>
                <span>Intervention</span>
                <span>Follow-up</span>
                <span>Verified</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 transition-all duration-700"
                  style={{ width: `${(data.current_stage / data.total_stages) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* NET RELIEF HIGHLIGHT CARD */}
          <div className="bg-emerald-50 rounded-xl border-2 border-emerald-300 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-emerald-950">
                  Rest Score Recovery Verified: -0.46 (-67.6% Fatigue Reduction)
                </h3>
                <p className="text-xs text-emerald-800">
                  Initial elevated fatigue of 0.68 normalized to healthy 0.22 following scheduled rest and duty rotation.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded bg-white text-emerald-900 font-mono font-extrabold text-xs border border-emerald-300 shrink-0">
              OFFICIAL RECORD VERIFIED
            </span>
          </div>

          {/* THE 6-STAGE TIMELINE STREAM */}
          <div className="space-y-6 relative before:absolute before:inset-0 before:left-6 before:w-0.5 before:bg-slate-200 sm:before:left-7">
            {data.stages.map((stage) => {
              const isCompleted = stage.status === "completed";
              const isCurrent = stage.status === "current";

              return (
                <div key={stage.stage_id} className="relative flex items-start gap-4 sm:gap-6 group">
                  {/* Left Number / Status Bubble */}
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0 z-10 transition-transform group-hover:scale-105 border-4 border-white shadow-sm ${
                      isCompleted
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                        ? "bg-[#0c3866] text-white ring-4 ring-blue-200"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : `0${stage.stage_number}`}
                  </div>

                  {/* Stage Card */}
                  <div className={`flex-1 rounded-xl border p-5 sm:p-6 shadow-xs transition-all space-y-4 ${getStageHeaderBg(stage.status)}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
                            Stage {stage.stage_number} of 6
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                              isCompleted
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : isCurrent
                                ? "bg-blue-100 text-blue-800 border border-blue-300 animate-pulse"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {stage.status === "completed" ? "Completed" : stage.status === "current" ? "In Progress" : "Pending Next"}
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 mt-1">{stage.title}</h3>
                      </div>

                      <div className="text-left sm:text-right text-xs text-slate-500 flex items-center gap-1.5 sm:block">
                        <Clock className="w-3.5 h-3.5 inline-block text-slate-400 sm:mr-1" />
                        <span>{stage.timestamp}</span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {stage.summary}
                    </p>

                    {/* Metrics Grid */}
                    {stage.metrics && Object.keys(stage.metrics).length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                        {Object.entries(stage.metrics).map(([key, val]) => (
                          <div key={key} className="bg-white/80 p-2.5 rounded-lg border border-slate-200">
                            <span className="text-[11px] text-slate-500 block">
                              {formatHumanReadable(key)}:
                            </span>
                            <strong className="text-xs font-bold text-slate-900 mt-0.5 block">
                              {val}
                            </strong>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Authority and Statutory Seal Signatures */}
                    <div className="pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <UserCheck className="w-4 h-4 text-[#0c3866]" />
                        <span>Authorized By: <strong className="text-slate-800">{stage.authority}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>{stage.statutory_seal}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Statutory Verification Footer */}
          <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wider font-heading">
                Official Record Guarantee & Protection
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every stage of this recovery lifecycle is permanently verified and protected. In accordance with service welfare rules, no welfare or recovery record can ever be used against you in Annual Confidential Reports (ACR), promotions, or postings.
            </p>
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
              <span>Welfare Care Standard Verified</span>
              <div className="flex items-center gap-4">
                <Link href="/portal/what-changed" className="text-emerald-300 hover:underline">
                  ← What Changed?
                </Link>
                <Link href="/portal/why-risk-changing" className="text-emerald-300 hover:underline">
                  Why is my risk changing? →
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
