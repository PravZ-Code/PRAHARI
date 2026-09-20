"use client";

import { useTranslation } from "@/lib/i18n";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Info,
  Layers,
  Search,
  Scale,
  ShieldCheck,
  UserCheck,
  Loader2,
} from "lucide-react";

interface SafetyPattern {
  id: string;
  trooperName: string;
  serviceNo: string;
  rank: string;
  unit: string;
  concernTitle: string;
  noticedDate: string;
  reasons: {
    factor: string;
    whatHappened: string;
    whyItMatters: string;
  }[];
  suggestedSupport: {
    title: string;
    description: string;
    officer: string;
  }[];
}

export default function AISafetyNetPage() {
  const { lang } = useTranslation();
  const router = useRouter();
  const [patterns, setPatterns] = useState<SafetyPattern[]>([]);
  const [selectedPatternId, setSelectedPatternId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login?redirect=/safety-net");
      return;
    }
    fetchSafetyPatterns();
  }, []);

  const fetchSafetyPatterns = async () => {
    setLoading(true);
    try {
      const res = await api.get("/welfare/safety-patterns");
      const list = res.data || [];
      setPatterns(list);
      if (list.length > 0) {
        setSelectedPatternId(list[0].id);
      }
    } catch (e) {
      console.error("Failed to load safety patterns:", e);
    } finally {
      setLoading(false);
    }
  };

  const activePattern = patterns.find((p) => p.id === selectedPatternId) || patterns[0];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="ux4g-breadcrumb ux4g-breadcrumb-divider text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/" className="hover:text-[#0c3866]">Home</Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">AI Safety Net</span>
      </nav>

      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#0c3866] text-white">
            <Activity className="w-6 h-6 text-[#ff9933]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0c3866] font-heading">
              {lang === "hi" ? "स्वचालित सुरक्षा तंत्र" : lang === "ta" ? "AI பாதுகாப்பு கட்டமைப்பு" : "AI Safety Net"}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Notices fatigue and workload patterns for personnel who have not asked for help themselves.
            </p>
          </div>
        </div>
      </div>

      {/* Non-Negotiable Human Decision Banner */}
      <div className="ux4g-alert ux4g-alert-warning p-4 rounded-lg bg-amber-50 border-2 border-amber-400 flex items-start gap-3.5 text-xs text-amber-950">
        <ShieldCheck className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-sm font-bold text-amber-900 block">
            Human Approval is Non-Negotiable
          </strong>
          <p className="leading-relaxed">
            The AI Safety Net only helps notice patterns. <strong>It never changes duties, approves leave, rejects leave, or punishes personnel.</strong> Both soldier requests and safety-net suggestions go to the SAME human officer for review and decision.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0c3866]" />
          <p className="text-xs font-semibold text-slate-600">Analyzing live squad duty loads and recovery indicators...</p>
        </div>
      ) : patterns.length === 0 ? (
        <div className="ux4g-card ux4g-card-solid ux4g-card-vertical p-8 text-center text-slate-500 text-xs">
          No early-warning stress patterns detected. Squad rest compliance is fully within safe limits.
        </div>
      ) : (
        <>
          {/* Sample troopers selector */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 text-xs">
            <span className="font-bold text-slate-700 mr-2">Live Monitored Patterns:</span>
            {patterns.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPatternId(p.id)}
                className={`ux4g-filter-chip-md ${selectedPatternId === p.id ? "active" : ""}`}
              >
                {p.trooperName} ({p.unit?.split(" ")[0] || "Squad"})
              </button>
            ))}
          </div>

          {/* Main Pattern Detail Card */}
          {activePattern && (
            <div className="ux4g-card ux4g-card-solid ux4g-card-vertical p-6 space-y-6 bg-white">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 font-mono">{activePattern.id}</span>
                    <span className="ux4g-tag-tonal-warning ux4g-tag-s font-bold">
                      Pattern Noticed
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1 font-heading">
                    {activePattern.concernTitle}
                  </h2>
                  <p className="text-xs text-slate-600">
                    {activePattern.rank} {activePattern.trooperName} · Service ID: <span className="font-mono font-bold">{activePattern.serviceNo}</span> · {activePattern.unit}
                  </p>
                </div>

                <div className="text-right text-xs bg-slate-50 p-2.5 rounded border border-slate-200 w-full sm:w-auto">
                  <span className="text-slate-500 block">Date Noticed:</span>
                  <strong className="text-slate-900">{activePattern.noticedDate}</strong>
                </div>
              </div>

              {/* Explain the Concern */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-heading">
                  Why was this noticed? (Explained in Simple English)
                </h3>
                <div className="overflow-x-auto">
                  <table className="ux4g-table ux4g-table-m ux4g-table-column-dividers w-full text-xs text-left border border-slate-200 rounded">
                    <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Area</th>
                        <th className="p-3">What Happened</th>
                        <th className="p-3">Why It Matters</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {activePattern.reasons.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{r.factor}</td>
                          <td className="p-3 text-slate-700">{r.whatHappened}</td>
                          <td className="p-3 font-medium text-amber-900">{r.whyItMatters}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Suggested Support */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-heading">
                    Suggested Support
                  </h3>
                  <span className="text-[11px] text-[#0c3866] font-bold">
                    Only for Human Officer Decision
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {activePattern.suggestedSupport.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 text-xs">{s.title}</h4>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-300">
                            {s.officer}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {s.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-[11px] font-semibold text-[#0c3866] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Review Recommended
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Operational checks link */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                <div>
                  <h4 className="font-bold text-[#0c3866]">
                    Check Team Impact &amp; Try Another Plan
                  </h4>
                  <p className="text-slate-600 mt-0.5">
                    Before changing any duty, officers check that replacement soldiers have enough rest and no one is overloaded.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/what-if"
                    className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm"
                  >
                    <span>Try Another Plan</span>
                  </Link>
                  <Link
                    href="/approvals"
                    className="ux4g-btn ux4g-btn-primary ux4g-btn-sm"
                  >
                    <span>Review in Approvals</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
