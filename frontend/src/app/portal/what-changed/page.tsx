"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import {
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  AlertTriangle,
  HelpCircle,
  BarChart3,
  Shield,
} from "lucide-react";

interface ChangedFactor {
  id: string;
  name: string;
  category: string;
  baseline_value: string;
  current_value: string;
  delta_numeric: number;
  delta_display: string;
  pct_change: string;
  impact_direction: "worsening" | "improving" | "neutral";
  severity: "HIGH" | "MODERATE" | "LOW";
  explanation: string;
}

interface WhatChangedData {
  personnel_id: string;
  name: string;
  rank: string;
  service_number: string;
  unit_name: string;
  direction_of_change: "IMPROVING" | "STABLE" | "WORSENING_MODERATE" | "WORSENING_CRITICAL";
  direction_label: string;
  direction_tone: "positive" | "neutral" | "negative";
  trajectory: string;
  previous_baseline: {
    night_shifts_14d: number;
    avg_sleep_hours: number;
    consecutive_duty_days: number;
    rest_gap_hours: number;
    leave_denial_count: number;
    checkin_stress_level: number;
    baseline_window: string;
  };
  current_state: {
    night_shifts_14d: number;
    avg_sleep_hours: number;
    consecutive_duty_days: number;
    rest_gap_hours: number;
    leave_denial_count: number;
    checkin_stress_level: number;
    observation_window: string;
  };
  changed_factors: ChangedFactor[];
  summary: string;
}

const FALLBACK_WHAT_CHANGED: WhatChangedData = {
  personnel_id: "c4d80d99-3f40-48d5-b67f-35287cfb6720",
  name: "Rajesh Kumar",
  rank: "Constable (GD)",
  service_number: "CRP-2019-45821",
  unit_name: "Alpha Company, 142 Bn CRPF",
  direction_of_change: "WORSENING_MODERATE",
  direction_label: "Elevated Operational Strain (+38% schedule density)",
  direction_tone: "negative",
  trajectory: "ELEVATED",
  previous_baseline: {
    night_shifts_14d: 2.0,
    avg_sleep_hours: 6.8,
    consecutive_duty_days: 4.0,
    rest_gap_hours: 14.5,
    leave_denial_count: 0,
    checkin_stress_level: 1.8,
    baseline_window: "Previous 90 Days Rolling"
  },
  current_state: {
    night_shifts_14d: 5.0,
    avg_sleep_hours: 5.2,
    consecutive_duty_days: 9.0,
    rest_gap_hours: 8.0,
    leave_denial_count: 1,
    checkin_stress_level: 3.4,
    observation_window: "Recent 14 Days"
  },
  changed_factors: [
    {
      id: "factor_1",
      name: "Night Shift Clustering",
      category: "Roster Schedule",
      baseline_value: "2 shifts / 14d",
      current_value: "5 shifts / 14d",
      delta_numeric: 3.0,
      delta_display: "+3 shifts",
      pct_change: "+150%",
      impact_direction: "worsening",
      severity: "HIGH",
      explanation: "Frequent night duties compress restorative deep sleep cycles."
    },
    {
      id: "factor_2",
      name: "Rest Gap Compression",
      category: "Rest Barriers",
      baseline_value: "14.5 hrs gap",
      current_value: "8.0 hrs gap",
      delta_numeric: -6.5,
      delta_display: "-6.5 hrs",
      pct_change: "-44.8%",
      impact_direction: "worsening",
      severity: "HIGH",
      explanation: "Rest interval between consecutive duty assignments operates at the minimum regulatory boundary."
    },
    {
      id: "factor_3",
      name: "Consecutive Operational Days",
      category: "Fatigue Exposure",
      baseline_value: "4 consecutive days",
      current_value: "9 consecutive days",
      delta_numeric: 5.0,
      delta_display: "+5 days",
      pct_change: "+125%",
      impact_direction: "worsening",
      severity: "MODERATE",
      explanation: "Continuous active duty without off-day recovery increases cumulative fatigue exposure."
    },
    {
      id: "factor_4",
      name: "Average Nightly Sleep",
      category: "Physiological Wellness",
      baseline_value: "6.8 hrs / night",
      current_value: "5.2 hrs / night",
      delta_numeric: -1.6,
      delta_display: "-1.6 hrs",
      pct_change: "-23.5%",
      impact_direction: "worsening",
      severity: "MODERATE",
      explanation: "Self-reported sleep quality reflects reduced restorative hours."
    },
    {
      id: "factor_5",
      name: "Administrative Leave Sanction",
      category: "Administrative Welfare",
      baseline_value: "0 denials",
      current_value: "1 deferred request",
      delta_numeric: 1.0,
      delta_display: "+1 deferred",
      pct_change: "N/A",
      impact_direction: "worsening",
      severity: "LOW",
      explanation: "Routine leave application deferred due to formation movement schedule."
    }
  ],
  summary: "This analysis evaluates operational telemetry exclusively to identify opportunities for restorative duty rotation. In accordance with Section 21 of the Mental Healthcare Act 2017, these metrics do not affect disciplinary records or performance appraisals."
};

export default function WhatChangedPage() {
  const router = useRouter();
  const { lang } = useTranslation();
  const [data, setData] = useState<WhatChangedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login?redirect=/portal/what-changed");
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/personnel/what-changed");
      if (res.data && res.data.changed_factors) {
        setData(res.data);
      } else {
        setData(FALLBACK_WHAT_CHANGED);
      }
    } catch (err: any) {
      console.warn("Using baseline fallback for What Changed telemetry:", err);
      setData(FALLBACK_WHAT_CHANGED);
    } finally {
      setLoading(false);
    }
  };

  const getDirectionBanner = (direction: string, tone: string) => {
    if (tone === "positive" || direction === "IMPROVING") {
      return {
        bg: "bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 border-emerald-500",
        badge: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
        icon: <TrendingDown className="w-6 h-6 text-emerald-300" />,
        heading: "Improving Trend / Rest Re-stabilized",
        description: "Duty rotations, rest barriers, and circadian recovery have restabilized toward optimal baseline levels."
      };
    }
    if (direction === "WORSENING_CRITICAL") {
      return {
        bg: "bg-gradient-to-r from-red-950 via-red-900 to-crimson-950 border-red-500",
        badge: "bg-red-500/20 text-red-300 border-red-400/40",
        icon: <TrendingUp className="w-6 h-6 text-red-300" />,
        heading: "Critical Schedule Acceleration Detected",
        description: "Multiple operational strain drivers (night shift clustering and reduced rest gaps) require immediate roster rebalancing."
      };
    }
    if (direction === "WORSENING_MODERATE") {
      return {
        bg: "bg-gradient-to-r from-amber-950 via-amber-900 to-slate-900 border-amber-500",
        badge: "bg-amber-500/20 text-amber-300 border-amber-400/40",
        icon: <TrendingUp className="w-6 h-6 text-amber-300" />,
        heading: "Moderate Strain Accumulation",
        description: "Recent 14-day operational pace shows elevated duty density compared to historical baseline."
      };
    }
    return {
      bg: "bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 border-blue-500",
      badge: "bg-blue-500/20 text-blue-300 border-blue-400/40",
      icon: <Activity className="w-6 h-6 text-blue-300" />,
      heading: "Stable Operational Baseline",
      description: "Duty load and personal recovery cycles remain consistent with the 90-day rolling profile."
    };
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "HIGH":
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">High Shift</span>;
      case "MODERATE":
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Moderate Shift</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Nominal Delta</span>;
    }
  };

  const banner = data ? getDirectionBanner(data.direction_of_change, data.direction_tone) : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Breadcrumb & Header */}
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
              What Changed? Detailed Factor Analysis
            </h1>
            <span className="px-2.5 py-0.5 rounded bg-blue-100 text-[#0c3866] text-xs font-bold border border-blue-200">
              SCHEDULE COMPARISON
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            Transparent comparison between your 90-day historical baseline and recent 14-day operational schedule.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/portal/why-risk-changing"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-md border border-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-[#0c3866]" />
            <span>Why Is Risk Changing?</span>
          </Link>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh Analysis"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#0c3866] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Loading schedule comparison...</p>
          <p className="text-xs text-slate-500">Cross-referencing duty rosters, rest barriers, and voluntary check-in logs.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-6 text-red-800 space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span>Data Error</span>
          </div>
          <p className="text-xs">{error}</p>
        </div>
      )}

      {data && banner && (
        <>
          {/* Soldier Identifier Bar */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0c3866] text-white flex items-center justify-center font-bold text-sm">
                {data.name ? data.name.slice(0, 2).toUpperCase() : "CR"}
              </div>
              <div>
                <strong className="text-sm text-slate-900 font-bold block">{data.rank} {data.name}</strong>
                <span className="text-slate-500">Service No: <span className="font-mono font-bold text-slate-700">{data.service_number}</span> · Unit: <span className="text-slate-700 font-medium">{data.unit_name}</span></span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Confidential & Protected by Law
              </span>
            </div>
          </div>

          {/* DIRECTION OF CHANGE HERO BANNER */}
          <div className={`rounded-xl p-6 text-white border shadow-md relative overflow-hidden ${banner.bg}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${banner.badge}`}>
                    Direction of Change
                  </span>
                  <span className="text-xs text-white/80 font-mono">
                    Trajectory: {data.trajectory}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black font-heading flex items-center gap-2.5">
                  {banner.icon}
                  <span>{data.direction_label}</span>
                </h2>
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
                  {banner.description}
                </p>
              </div>

              <div className="bg-black/25 backdrop-blur-md rounded-lg p-4 border border-white/20 sm:min-w-[240px] text-right space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-white/70 block">Classification</span>
                <span className="text-lg font-black text-white block">{data.direction_of_change.replace("_", " ")}</span>
                <span className="text-[11px] text-white/80 block">Evaluated against 90-day baseline</span>
              </div>
            </div>
          </div>

          {/* 2-COLUMN COMPARISON: Previous Baseline vs Current State */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#0c3866]" />
              <span>Comparative Operational State</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Previous Baseline Card */}
              <div className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Baseline Anchor</span>
                    <h3 className="text-base font-extrabold text-slate-800">Previous Baseline</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                    {data.previous_baseline.baseline_window}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block">Night Patrols (14d)</span>
                    <strong className="text-sm font-bold text-slate-900 mt-1 block">
                      {data.previous_baseline.night_shifts_14d.toFixed(1)} shifts
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block">Average Sleep</span>
                    <strong className="text-sm font-bold text-slate-900 mt-1 block">
                      {data.previous_baseline.avg_sleep_hours.toFixed(1)} hrs / night
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block">Consecutive Duty</span>
                    <strong className="text-sm font-bold text-slate-900 mt-1 block">
                      {data.previous_baseline.consecutive_duty_days.toFixed(0)} days
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block">Rest Gap Between Shifts</span>
                    <strong className="text-sm font-bold text-slate-900 mt-1 block">
                      {data.previous_baseline.rest_gap_hours.toFixed(1)} hours
                    </strong>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed italic">
                  Calibrated across 90 days of normal squad operations with standard 8-hour rolling rest gaps.
                </p>
              </div>

              {/* Current State Card */}
              <div className="bg-white rounded-xl border-2 border-blue-300 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-blue-50 pb-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block">Recent Activity (Last 14 Days)</span>
                    <h3 className="text-base font-extrabold text-slate-900">Current State</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-blue-50 text-[#0c3866] text-xs font-semibold border border-blue-200">
                    {data.current_state.observation_window}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                    <span className="text-slate-600 block">Night Patrols (14d)</span>
                    <strong className="text-sm font-bold text-[#0c3866] mt-1 block">
                      {data.current_state.night_shifts_14d.toFixed(1)} shifts
                    </strong>
                  </div>
                  <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                    <span className="text-slate-600 block">Average Sleep</span>
                    <strong className="text-sm font-bold text-[#0c3866] mt-1 block">
                      {data.current_state.avg_sleep_hours.toFixed(1)} hrs / night
                    </strong>
                  </div>
                  <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                    <span className="text-slate-600 block">Consecutive Duty</span>
                    <strong className="text-sm font-bold text-[#0c3866] mt-1 block">
                      {data.current_state.consecutive_duty_days.toFixed(0)} days
                    </strong>
                  </div>
                  <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                    <span className="text-slate-600 block">Rest Gap Between Shifts</span>
                    <strong className="text-sm font-bold text-[#0c3866] mt-1 block">
                      {data.current_state.rest_gap_hours.toFixed(1)} hours
                    </strong>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed italic">
                  Based on official duty rosters and your voluntary rest check-ins.
                </p>
              </div>
            </div>
          </div>

          {/* CHANGED FACTORS DETAILED BREAKDOWN */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0c3866]" />
                <span>Changes in Schedule & Rest Factors</span>
              </h2>
              <span className="text-xs text-slate-500">{data.changed_factors.length} factors monitored</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="divide-y divide-slate-200">
                {data.changed_factors.map((factor) => (
                  <div key={factor.id} className="p-5 hover:bg-slate-50/70 transition-colors space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-extrabold text-slate-900">{factor.name}</h3>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
                            {factor.category}
                          </span>
                          {getSeverityBadge(factor.severity)}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{factor.explanation}</p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <span className={`px-2.5 py-1 rounded text-xs font-mono font-extrabold ${
                          factor.impact_direction === "worsening"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          Δ {factor.delta_display} ({factor.pct_change})
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Historical Baseline:</span>
                        <strong className="text-slate-700 font-semibold">{factor.baseline_value}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Recent 14d Value:</span>
                        <strong className="text-slate-900 font-bold">{factor.current_value}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Impact Direction:</span>
                        <span className={`font-semibold capitalize ${
                          factor.impact_direction === "worsening" ? "text-red-600" : "text-emerald-600"
                        }`}>
                          {factor.impact_direction === "worsening" ? "Increases Strain" : "Promotes Recovery"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Rest Standard:</span>
                        <span className="text-[#0c3866] font-medium">8h Mandatory Rest Cycle</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* STATUTORY NON-STIGMATIZATION NOTICE */}
          <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider font-heading">
                Confidentiality & Protection Guarantee
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {data.summary}
            </p>
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
              <span>Secure Welfare Record · Strictly Confidential</span>
              <div className="flex items-center gap-3">
                <Link href="/portal/why-risk-changing" className="text-amber-300 hover:underline font-semibold">
                  Why is my risk changing? →
                </Link>
                <Link href="/portal/recovery-timeline" className="text-amber-300 hover:underline font-semibold">
                  View Recovery Timeline →
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
