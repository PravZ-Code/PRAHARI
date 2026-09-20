"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { formatHumanReadable, formatStatus } from "@/lib/formatters";
import {
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  Shield,
  FileText,
  Info,
  Scale,
  Users,
  Award,
  Zap,
  Lock
} from "lucide-react";

interface ContributingFactor {
  id: string;
  name: string;
  category: string;
  source_tag: string;
  observed_value: string;
  baseline_value: string;
  contribution_score: number;
  impact_direction: "increases_risk" | "reduces_risk";
  description: string;
}

interface ShapItem {
  feature: string;
  impact: number;
  type: "base" | "strain_driver" | "protective_factor";
  direction: "neutral" | "positive" | "negative";
  source: string;
}

interface BaselineCompItem {
  metric: string;
  personal_baseline: string;
  current_observation: string;
  battalion_average: string;
  status: string;
  status_color: string;
}

interface WhatNotMeanItem {
  title: string;
  body: string;
  statutory_reference: string;
}

interface WhyRiskChangingData {
  personnel_id: string;
  name: string;
  rank: string;
  service_number: string;
  unit_name: string;
  risk_score: number;
  risk_level: string;
  trajectory: string;
  base_strain_benchmark: number;
  top_contributing_factors: ContributingFactor[];
  shap_contributions: ShapItem[];
  personal_baseline_comparison: BaselineCompItem[];
  what_this_does_not_mean: WhatNotMeanItem[];
}

export default function WhyRiskChangingPage() {
  const router = useRouter();
  const { lang } = useTranslation();
  const [data, setData] = useState<WhyRiskChangingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login?redirect=/portal/why-risk-changing");
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/personnel/why-risk-changing");
      setData(res.data);
    } catch (err: any) {
      console.error("Failed to load Why Risk Changing data:", err);
      setError(err?.response?.data?.detail || "Unable to retrieve strain causality data.");
    } finally {
      setLoading(false);
    }
  };

  const getSourceTagBadge = (tag: string) => {
    switch (tag) {
      case "[Roster]":
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-100 text-[#0c3866] border border-blue-200">ROSTER</span>;
      case "[Wellness]":
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200">WELLNESS</span>;
      case "[Peer Signal]":
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">PEER BUDDY</span>;
      case "[HR]":
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">ADMIN HR</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">{formatHumanReadable(tag.replace(/[\[\]]/g, ""))}</span>;
    }
  };

  const getStatusColorClass = (color: string) => {
    switch (color) {
      case "amber":
        return "bg-amber-100 text-amber-900 border-amber-300";
      case "orange":
        return "bg-orange-100 text-orange-900 border-orange-300";
      case "red":
        return "bg-red-100 text-red-900 border-red-300";
      case "blue":
        return "bg-blue-100 text-blue-900 border-blue-300";
      default:
        return "bg-emerald-100 text-emerald-900 border-emerald-300";
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Top Breadcrumbs & Header */}
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
              Why is My Risk Changing?
            </h1>
            <span className="px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200">
              FACTOR BREAKDOWN
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            Clear explanation of schedule factors, rest balance, and soldier welfare protections.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/portal/what-changed"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-md border border-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <Activity className="w-4 h-4 text-[#0c3866]" />
            <span>What Changed? (Baseline)</span>
          </Link>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh Causality Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#0c3866] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Analyzing duty and rest factors...</p>
          <p className="text-xs text-slate-500">Checking recent schedules, duty hours, and recovery buffers.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-6 text-red-800 space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span>Unable to Load Factors</span>
          </div>
          <p className="text-xs">{error}</p>
        </div>
      )}

      {data && (
        <>
          {/* Soldier Identification Card */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0c3866] text-white flex items-center justify-center font-bold text-sm">
                {data.name ? data.name.slice(0, 2).toUpperCase() : "CR"}
              </div>
              <div>
                <strong className="text-sm text-slate-900 font-bold block">{data.rank} {data.name}</strong>
                <span className="text-slate-500">
                  Service No: <span className="font-mono font-bold text-slate-700">{data.service_number}</span> · Formation: <span className="text-slate-700 font-medium">{data.unit_name}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded bg-blue-100 text-[#0c3866] border border-blue-300 font-semibold flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-[#0c3866]" />
                Fatigue & Rest Score: {(data.risk_score * 100).toFixed(0)}% ({data.trajectory})
              </span>
            </div>
          </div>

          {/* SECTION 1: TOP CONTRIBUTING FACTORS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>Key Factors Affecting Your Rest Score</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Factors elevating operational strain vs protective factors buffering fatigue.
                </p>
              </div>
              <span className="text-xs text-slate-500 font-medium">5 Key Factors</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.top_contributing_factors.map((factor) => {
                const isWorsening = factor.impact_direction === "increases_risk";
                return (
                  <div
                    key={factor.id}
                    className={`bg-white rounded-xl border-2 p-5 shadow-xs transition-all space-y-3 ${
                      isWorsening ? "border-amber-200 hover:border-amber-400" : "border-emerald-200 hover:border-emerald-400"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getSourceTagBadge(factor.source_tag)}
                          <span className="text-xs font-semibold text-slate-500">{factor.category}</span>
                        </div>
                        <h3 className="text-sm font-extrabold text-slate-900">{factor.name}</h3>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-mono font-bold shrink-0 ${
                          isWorsening
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {factor.contribution_score > 0 ? `+${factor.contribution_score.toFixed(2)}` : factor.contribution_score.toFixed(2)} Impact
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{factor.description}</p>

                    <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Observed Value:</span>
                        <strong className="text-slate-900 font-bold">{factor.observed_value}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Personal Baseline:</span>
                        <span className="text-slate-600 font-medium">{factor.baseline_value}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: SHAP DIRECTIONAL WATERFALL BREAKDOWN */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#0c3866]" />
                  <span>How Each Factor Affects Your Rest Score</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clear breakdown showing what increases fatigue versus what helps you recover.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                Factor Impact
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {data.shap_contributions.map((shap, index) => {
                const isPositive = shap.impact > 0;
                const isBase = shap.type === "base";
                const barWidth = Math.min(100, Math.max(12, Math.abs(shap.impact) * 350));

                return (
                  <div key={index} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{shap.feature}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{shap.source}</span>
                      </div>
                      <span className={`font-mono font-extrabold ${
                        isBase ? "text-slate-700" : isPositive ? "text-red-600" : "text-emerald-600"
                      }`}>
                        {isBase ? `Base: ${(shap.impact * 100).toFixed(0)}%` : `${shap.impact > 0 ? "+" : ""}${(shap.impact * 100).toFixed(0)}%`}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          isBase
                            ? "bg-slate-500"
                            : isPositive
                            ? "bg-gradient-to-r from-amber-500 to-red-500"
                            : "bg-gradient-to-r from-teal-500 to-emerald-500"
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Factors Increasing Fatigue (Consecutive Shifts, Travel)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Protective Factors (Rest Days, Buddy Support, Fitness)
              </span>
            </div>
          </div>

          {/* SECTION 3: PERSONAL BASELINE COMPARISON */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-3 p-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0c3866]" />
                <span>Personal Baseline vs Battalion Average Comparison</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated against your individual historical norm and peer battalion formations.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase text-[11px] font-bold bg-slate-50">
                    <th className="py-2.5 px-3">Operational Metric</th>
                    <th className="py-2.5 px-3">Your Personal Baseline</th>
                    <th className="py-2.5 px-3">Current Observation</th>
                    <th className="py-2.5 px-3">Battalion Average</th>
                    <th className="py-2.5 px-3 text-right">Status Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.personal_baseline_comparison.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">{row.metric}</td>
                      <td className="py-3 px-3 text-slate-600 font-medium">{row.personal_baseline}</td>
                      <td className="py-3 px-3 font-extrabold text-[#0c3866]">{row.current_observation}</td>
                      <td className="py-3 px-3 text-slate-500">{row.battalion_average}</td>
                      <td className="py-3 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getStatusColorClass(row.status_color)}`}>
                          {formatHumanReadable(row.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: STATUTORY CHARTER: "WHAT THIS DOES NOT MEAN" */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900 font-heading">
                  Soldier Protection Guarantee: What This Does NOT Mean
                </h2>
                <p className="text-xs text-slate-600">
                  Your official welfare protections under paramilitary service regulations.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.what_this_does_not_mean.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-br from-slate-900 to-[#072648] text-white rounded-xl p-5 border border-slate-700 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center text-xs font-bold font-mono">
                        0{idx + 1}
                      </span>
                      <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{item.body}</p>

                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-amber-300 font-medium">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" />
                      Official Protection:
                    </span>
                    <span className="font-mono text-slate-300">{item.statutory_reference}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Footer Navigation */}
          <div className="bg-slate-100 rounded-xl p-5 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <span className="text-slate-600">
              Need trade-matched duty relief or confidential counselor support?
            </span>
            <div className="flex items-center gap-3">
              <Link
                href="/portal/recovery-timeline"
                className="px-3.5 py-2 bg-[#0c3866] hover:bg-[#072648] text-white font-bold rounded-md shadow-xs transition-colors flex items-center gap-1.5"
              >
                <span>View Recovery Timeline</span>
                <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
