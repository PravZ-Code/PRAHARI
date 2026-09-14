"use client";

import { useTranslation } from "@/lib/i18n";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  ArrowRight,
  Shield,
  Layers,
  ArrowLeft,
  Users,
  Info,
  Loader2,
} from "lucide-react";
import { getStoredUser, isAuthenticated } from "@/lib/auth";

interface PlanOption {
  id: string;
  name: string;
  replacementPerson: string;
  serviceNo: string;
  trade: string;
  rest: string;
  workload: string;
  coverage: string;
  teamImpact: string;
  welfareEffect: string;
  safe: boolean;
}

function TryAnotherPlanContent() {
  const { lang } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const personnelId = searchParams.get("personnel_id") || "default";

  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [alternativePlans, setAlternativePlans] = useState<PlanOption[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("plan-b");
  const [committedSuccess, setCommittedSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [equityData, setEquityData] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login?redirect=/what-if");
      return;
    }
    fetchPlans();
  }, [personnelId]);

  const fetchPlans = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get(`/resilience/what-if-plans/${personnelId}`);
      if (res.data) {
        setCurrentPlan(res.data.current_plan);
        setAlternativePlans(res.data.alternative_plans || []);
        if (res.data.alternative_plans && res.data.alternative_plans.length > 0) {
          setSelectedPlanId(res.data.alternative_plans[0].id);
        }
      }

      // Fetch Section 29 Intervention Equity Audit
      const storedUser = getStoredUser();
      const unitId = storedUser?.unit_id || "034b9143-4724-499b-8233-1b1f33c8e77e";
      api.get(`/resilience/intervention-equity/${unitId}`)
        .then((r) => setEquityData(r.data))
        .catch((err) => console.error("Failed to load equity audit:", err));
    } catch (e) {
      console.error("Failed to load what-if plans:", e);
      const detail = (e as any)?.response?.data?.detail;
      setLoadError(detail || "The roster alternatives service is unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const activePlan = alternativePlans.find((p) => p.id === selectedPlanId) || alternativePlans[0];

  const handleChoosePlan = async () => {
    if (!selectedPlanId) return;
    setSubmitting(true);
    setCommitError(null);
    try {
      await api.post("/resilience/commit-plan", { plan_id: selectedPlanId, personnel_id: personnelId });
      setCommittedSuccess(true);
      setTimeout(() => {
        router.push("/approvals");
      }, 1500);
    } catch (e: any) {
      console.error("Failed to commit plan:", e);
      const detail = e?.response?.data?.detail || "Failed to commit roster plan. Please verify replacement constraints.";
      setCommitError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="ux4g-breadcrumb ux4g-breadcrumb-divider text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/" className="hover:text-[#0c3866]">Home</Link>
        <span>/</span>
        <Link href="/commander" className="hover:text-[#0c3866]">Commander</Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Try Another Plan</span>
      </nav>

      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#0c3866] text-white">
            <Scale className="w-6 h-6 text-[#ff9933]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0c3866] font-heading">
              {lang === "hi" ? "वैकल्पिक ड्यूटी योजना" : lang === "ta" ? "மாற்று பணித் திட்டம்" : "Try Another Plan"}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Compare shift and duty alternatives before deciding. Make sure the solution is fair to teammates.
            </p>
          </div>
        </div>
      </div>

      {committedSuccess && (
        <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          <span>Plan committed successfully! Transferring to Officer Approval Docket...</span>
        </div>
      )}

      {commitError && (
        <div role="alert" className="p-4 bg-red-50 border border-red-300 text-red-900 rounded-lg text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{commitError}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0c3866]" />
          <p className="text-xs font-semibold text-slate-600">Calculating mathematically validated duty alternatives...</p>
        </div>
      ) : !currentPlan ? (
        <div className="gov-card p-8 text-center text-slate-500 text-xs">
          <p>{loadError || "No roster options are available for this account."}</p>
          <button
            type="button"
            onClick={() => void fetchPlans()}
            className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm mt-4"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* Section 29: Intervention Equity Alert */}
          {equityData && (
            <div className={`p-4 rounded-lg border text-xs space-y-2.5 transition-all shadow-sm ${
              equityData.is_equity_alert
                ? "bg-amber-50/80 border-amber-300 text-amber-950"
                : "bg-slate-50 border-slate-200 text-slate-800"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    equityData.is_equity_alert
                      ? "bg-amber-200 text-amber-900 border border-amber-400"
                      : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {equityData.is_equity_alert ? "INTERVENTION EQUITY ALERT (SECTION 29)" : "EQUITY AUDIT: BALANCED"}
                  </span>
                  <span className="font-bold text-slate-900 font-heading">
                    Helper Duty Distribution Check
                  </span>
                </div>
                <span className="text-[11px] text-slate-600">
                  Unit: <strong>{equityData.unit_name}</strong> • Disparity Ratio: <strong>{equityData.equity_disparity_ratio ?? 1.0}x</strong>
                </span>
              </div>

              <p className="text-[11px] font-medium leading-relaxed">
                {equityData.recommendation}
              </p>

              {equityData.top_overburdened_troopers && equityData.top_overburdened_troopers.length > 0 && (
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Heaviest Replacement Burden:</span>
                  {equityData.top_overburdened_troopers.map((t: any, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 bg-white rounded border border-amber-300 text-[10px] font-mono text-amber-900">
                      {t.name}: <strong>{t.replacement_duties_count} replacement duties</strong> ({t.recent_night_shifts} night shifts)
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Top Comparison: Current vs Alternative */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Strained Plan */}
            <div className="gov-card p-5 space-y-3 bg-white border-2 border-slate-300">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Plan</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300">
                  Needs Attention
                </span>
              </div>

              <div className="text-xs space-y-2">
                <div>
                  <strong className="text-slate-900 text-sm block">{currentPlan.soldier}</strong>
                  <span className="text-slate-500 text-[11px]">{currentPlan.trade}</span>
                </div>

                <div className="p-2.5 bg-rose-50/60 rounded border border-rose-200 space-y-1">
                  <span className="text-rose-900 font-bold block">{currentPlan.assignedDuty}</span>
                  <span className="text-rose-800 text-[11px] block">{currentPlan.rest}</span>
                </div>

                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <p><strong>Past 14 Days:</strong> {currentPlan.workload}</p>
                  <p><strong>Guard Coverage:</strong> {currentPlan.coverage}</p>
                </div>

                <p className="text-[11px] text-rose-900 italic pt-1">
                  {currentPlan.welfareEffect}
                </p>
              </div>
            </div>

            {/* Proposed Alternative */}
            {activePlan && (
              <div className="gov-card p-5 space-y-3 bg-white border-2 border-emerald-500 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider font-heading">
                    Proposed Alternative
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded border ${
                      activePlan.safe
                        ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                        : "bg-amber-100 text-amber-900 border-amber-300"
                    }`}
                  >
                    {activePlan.safe ? "Safe & Balanced" : "Caution Needed"}
                  </span>
                </div>

                <div className="text-xs space-y-2">
                  <div>
                    <strong className="text-slate-900 text-sm block">{activePlan.name}</strong>
                    <span className="text-slate-500 text-[11px]">
                      Replacement: <strong>{activePlan.replacementPerson}</strong> ({activePlan.trade})
                    </span>
                  </div>

                  <div
                    className={`p-2.5 rounded border space-y-1 ${
                      activePlan.safe
                        ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                        : "bg-amber-50/60 border-amber-200 text-amber-900"
                    }`}
                  >
                    <span className="font-bold block">Rest Status: {activePlan.rest}</span>
                    <span className="text-[11px] block">{activePlan.workload}</span>
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <p><strong>Teammate Impact:</strong> {activePlan.teamImpact}</p>
                    <p><strong>Guard Coverage:</strong> {activePlan.coverage}</p>
                  </div>

                  <p className="text-[11px] text-emerald-900 font-semibold pt-1">
                    {activePlan.welfareEffect}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Alternative Plan Selector */}
          <div className="gov-card p-6 space-y-4 bg-white">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-heading">
              Select an Alternative to Compare
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {alternativePlans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`p-3.5 rounded-lg border text-left transition-all text-xs space-y-2 ${
                    selectedPlanId === plan.id
                      ? "border-[#0c3866] bg-blue-50/50 ring-2 ring-[#0c3866]"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 font-bold block">{plan.name.split(":")[0]}</strong>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        plan.safe
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {plan.safe ? "Safe" : "Caution"}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 line-clamp-2">
                    {plan.welfareEffect}
                  </p>

                  <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200 flex items-center justify-between">
                    <span>Cover: {plan.replacementPerson.split(" ").slice(-1)[0]}</span>
                    <span>{plan.safe ? "Rest OK" : "Short Rest"}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Decision Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <Link
                href="/commander"
                className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Commander</span>
              </Link>

              <button
                type="button"
                disabled={submitting}
                onClick={handleChoosePlan}
                className="ux4g-btn ux4g-btn-primary ux4g-btn-md flex items-center gap-1.5 bg-[#0c3866] hover:bg-[#072648] text-white font-bold"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Choose This Plan &amp; Review</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


export default function TryAnotherPlanPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading plan options...</div>}>
      <TryAnotherPlanContent />
    </React.Suspense>
  );
}
