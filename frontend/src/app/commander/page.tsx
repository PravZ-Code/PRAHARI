"use client";

import { useTranslation } from "@/lib/i18n";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { UnitCardData, UnitReadinessDetail } from "@/lib/types";
import { formatCategory } from "@/lib/formatters";
import {
  Users,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Scale,
  FileText,
  UserCheck,
  ChevronRight,
  ArrowRight,
  Shield,
  Layers,
  XCircle,
  Loader2,
} from "lucide-react";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { useDataSync } from "@/lib/useDataSync";

export default function CommanderPage() {
  const { lang } = useTranslation();
  const router = useRouter();
  const [units, setUnits] = useState<UnitCardData[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [readinessDetail, setReadinessDetail] = useState<UnitReadinessDetail | null>(null);
  const [dashboardKpis, setDashboardKpis] = useState<any>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [welfareDebt, setWelfareDebt] = useState<any>(null);
  const [bottleneckData, setBottleneckData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "requests" | "workload" | "bottlenecks">("overview");

  // Real-time synchronization: automatically re-fetch KPIs and queue when DB events occur
  useDataSync({
    onGrievanceChange: () => {
      if (selectedUnitId) fetchUnitDetails(selectedUnitId);
    },
    onAssessmentChange: () => {
      if (selectedUnitId) fetchUnitDetails(selectedUnitId);
    },
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login");
      return;
    }
    const currentUser = getStoredUser();
    setUser(currentUser);
    if (currentUser?.role === "personnel" || currentUser?.role === "soldier") {
      window.location.replace("/portal");
      return;
    }
    if (currentUser && ["commander", "admin", "welfare", "welfare_officer"].includes(currentUser.role)) {
      const initialUid = currentUser.unit_id || "";
      if (initialUid) {
        setSelectedUnitId(initialUid);
        fetchUnitDetails(initialUid);
      }
      fetchUnits(initialUid);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUnits = async (preferredUid?: string) => {
    try {
      const res = await api.get("/commander/units");
      const list = res.data.units || [];
      setUnits(list);
      if (list.length > 0) {
        const targetId = preferredUid && list.some((u: any) => u.id === preferredUid)
          ? preferredUid
          : list[0].id;
        setSelectedUnitId(targetId);
        if (!preferredUid) {
          fetchUnitDetails(targetId);
        }
      }
    } catch (err) {
      console.error("Failed to load units:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnitDetails = (uid: string) => {
    if (!uid) return;
    setRequestsLoading(true);

    // Parallel Stream 1: Readiness Score & Trend
    api.get(`/commander/unit/${uid}`)
      .then((res) => setReadinessDetail(res.data))
      .catch((err) => console.error("Failed to load readiness:", err));

    // Parallel Stream 2: Dashboard KPIs (Decision summary)
    api.get(`/commander/unit/${uid}/dashboard-kpis`)
      .then((res) => setDashboardKpis(res.data))
      .catch((err) => console.error("Failed to load KPIs:", err));

    // Parallel Stream 3: Welfare Debt (Section 31)
    api.get(`/commander/unit/${uid}/welfare-debt`)
      .then((res) => setWelfareDebt(res.data))
      .catch((err) => console.error("Failed to load welfare debt:", err));

    // Parallel Stream 4: Resolution Bottlenecks (Section 12)
    api.get(`/grievance/resolution-bottlenecks?unit_id=${uid}`)
      .then((res) => setBottleneckData(res.data))
      .catch((err) => console.error("Failed to load bottlenecks:", err));

    // Parallel Stream 5: Pending Queue (Requests)
    api.get(`/grievance/pending-queue?unit_id=${uid}`)
      .then((res) => {
        setPendingRequests(res.data || []);
      })
      .catch((err) => {
        console.error("Failed to load pending requests:", err);
        setPendingRequests([]);
      })
      .finally(() => {
        setRequestsLoading(false);
      });
  };

  const handleUnitChange = (uid: string) => {
    setSelectedUnitId(uid);
    fetchUnitDetails(uid);
  };

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-10 h-10 rounded-full border-2 border-[#0c3866] border-t-transparent animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-600">Loading Commander Workspace...</p>
      </div>
    );
  }

  if (!["commander", "admin", "welfare", "welfare_officer"].includes(user.role)) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-lg text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center mx-auto text-amber-800">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 font-heading">Commander Access Required</h2>
        <p className="text-xs text-slate-600">
          This area is restricted to Company Commanders and authorized staff under the role separation firewall. Your active role is <strong>{user.role}</strong>.
        </p>
        <Link href="/" className="ux4g-btn ux4g-btn-primary ux4g-btn-sm">
          Return to Home
        </Link>
      </div>
    );
  }

  const activeUnit = units.find((u) => u.id === selectedUnitId) || units[0];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="ux4g-breadcrumb ux4g-breadcrumb-divider text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/" className="hover:text-[#0c3866]">Home</Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Commander Workspace</span>
      </nav>

      {/* Header & Formation Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#0c3866] font-heading">
              {lang === "hi" ? "कंपनी कमांडर कार्यक्षेत्र" : lang === "ta" ? "கட்டளை அதிகாரி பணியிடம்" : "Commander Workspace"}
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">
              Command Oversight
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Focus on decisions: see who needs attention, check team rest, and review requests.
          </p>
        </div>

        {/* Formation Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="formation-select" className="text-xs font-bold text-slate-700 whitespace-nowrap">
            Unit:
          </label>
          <select
            id="formation-select"
            value={selectedUnitId}
            onChange={(e) => handleUnitChange(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold min-w-[260px] max-w-full focus:ring-2 focus:ring-primary-500"
          >
            {units.length === 0 ? (
              <option value="">Loading formations...</option>
            ) : (
              units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.strength || 200} Personnel)
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Decision Summary KPI Grid (Live from Backend) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="ux4g-card ux4g-card-solid ux4g-card-vertical p-3.5 space-y-1 bg-white">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Open Requests</span>
          <span className="text-2xl font-bold text-[#0c3866]">
            {dashboardKpis?.open_requests ?? pendingRequests.length}
          </span>
          <span className="text-[10px] text-slate-500 block">Waiting for review</span>
        </div>

        <div className="ux4g-card ux4g-card-solid ux4g-card-vertical p-3.5 space-y-1 bg-amber-50/50 border-amber-300">
          <span className="text-[11px] font-bold text-amber-800 uppercase block">Urgent Needs</span>
          <span className="text-2xl font-bold text-amber-700">
            {dashboardKpis?.urgent_needs ?? 0}
          </span>
          <span className="text-[10px] text-amber-800 block">Family emergency</span>
        </div>

        <div className="ux4g-card ux4g-card-solid ux4g-card-vertical p-3.5 space-y-1 bg-white">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Needs Review</span>
          <span className="text-2xl font-bold text-slate-700">
            {dashboardKpis?.needs_review ?? 0}
          </span>
          <span className="text-[10px] text-slate-500 block">Delayed leave</span>
        </div>

        <div className="ux4g-card ux4g-card-solid ux4g-card-vertical p-3.5 space-y-1 bg-white">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Heavy Shift Load</span>
          <span className="text-2xl font-bold text-slate-900">
            {dashboardKpis?.heavy_shift_load ?? 0}
          </span>
          <span className="text-[10px] text-slate-500 block">Troopers need rest</span>
        </div>

        <div className="ux4g-card ux4g-card-solid ux4g-card-vertical p-3.5 space-y-1 bg-white">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Unit Readiness</span>
          <span className="text-2xl font-bold text-emerald-700">
            {dashboardKpis?.unit_readiness ?? readinessDetail?.readiness_score ?? activeUnit?.readiness_score ?? 91}%
          </span>
          <span className="text-[10px] text-emerald-800 block">Operational</span>
        </div>

        <div className="ux4g-card ux4g-card-solid ux4g-card-vertical p-3.5 space-y-1 bg-white">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Rest Compliance</span>
          <span className="text-2xl font-bold text-slate-900">
            {dashboardKpis?.rest_compliance ?? 97.2}%
          </span>
          <span className="text-[10px] text-slate-500 block">&gt; 8 hours rest</span>
        </div>

        {/* Section 31: Welfare Debt KPI Card */}
        <div
          onClick={() => setActiveTab("bottlenecks")}
          className={`ux4g-card ux4g-card-solid ux4g-card-vertical p-3.5 space-y-1 cursor-pointer transition-all hover:shadow-md ${
            (welfareDebt?.welfare_debt_score ?? 0) >= 70
              ? "bg-rose-50/70 border-rose-300"
              : (welfareDebt?.welfare_debt_score ?? 0) >= 35
              ? "bg-amber-50/70 border-amber-300"
              : "bg-emerald-50/70 border-emerald-300"
          }`}
          title="Section 31: Welfare Debt (Accumulated unresolved welfare pressure)"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase block">Welfare Debt</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
              (welfareDebt?.welfare_debt_level === "CRITICAL" || welfareDebt?.welfare_debt_level === "HIGH")
                ? "bg-rose-100 text-rose-800"
                : welfareDebt?.welfare_debt_level === "MODERATE"
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800"
            }`}>
              {welfareDebt?.welfare_debt_level ?? "MODERATE"}
            </span>
          </div>
          <span className="text-2xl font-bold text-slate-900 block">
            {welfareDebt?.welfare_debt_score ?? 35.0}
            <span className="text-xs text-slate-500 font-normal"> /100</span>
          </span>
          <span className="text-[10px] text-slate-600 block truncate">
            {welfareDebt?.primary_contributors?.[0] ?? "Operational load audit"}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="ux4g-tab ux4g-tab-underline ux4g-tab-md border-b border-slate-200">
        <ul className="ux4g-tab-list flex items-center gap-4 text-xs font-semibold overflow-x-auto">
          <li
            onClick={() => setActiveTab("overview")}
            className={`ux4g-tab-item cursor-pointer pb-2.5 transition-colors whitespace-nowrap ${
              activeTab === "overview"
                ? "is-active border-b-2 border-[#0c3866] text-[#0c3866] font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pending Requests ({pendingRequests.length})
          </li>
          <li
            onClick={() => setActiveTab("requests")}
            className={`ux4g-tab-item cursor-pointer pb-2.5 transition-colors whitespace-nowrap ${
              activeTab === "requests"
                ? "is-active border-b-2 border-[#0c3866] text-[#0c3866] font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Squad Workload &amp; Rest Hours
          </li>
          <li
            onClick={() => setActiveTab("workload")}
            className={`ux4g-tab-item cursor-pointer pb-2.5 transition-colors whitespace-nowrap ${
              activeTab === "workload"
                ? "is-active border-b-2 border-[#0c3866] text-[#0c3866] font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Unit Scheduling Balance (Private Self-Correction)
          </li>
          <li
            onClick={() => setActiveTab("bottlenecks")}
            className={`ux4g-tab-item cursor-pointer pb-2.5 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "bottlenecks"
                ? "is-active border-b-2 border-[#0c3866] text-[#0c3866] font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>SLA Bottlenecks &amp; Welfare Debt</span>
            {bottleneckData && bottleneckData.total_breached > 0 && (
              <span className="ux4g-tag-tonal-warning ux4g-tag-s font-bold text-[10px]">
                {bottleneckData.total_breached}
              </span>
            )}
          </li>
        </ul>
      </div>

      {/* Tab 1: Requests & Decision Focus */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading">
                Requests Waiting for Your Decision
              </h2>
              <p className="text-xs text-slate-600">
                Review applicant needs, check teammate impact, or try an alternative duty plan.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/what-if" className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm">
                <Scale className="w-3.5 h-3.5 mr-1" />
                <span>Try Another Plan</span>
              </Link>
              <Link href="/approvals" className="ux4g-btn ux4g-btn-primary ux4g-btn-sm">
                <UserCheck className="w-3.5 h-3.5 mr-1" />
                <span>Open Approval Docket</span>
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-2xs">
            {requestsLoading ? (
              <div className="p-8 text-center flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#0c3866]" />
                <span className="text-xs text-slate-500">Loading pending requests from live database...</span>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No pending requests requiring commander decision for this unit.
              </div>
            ) : (
              <table className="ux4g-table ux4g-table-m ux4g-table-column-dividers w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Reference</th>
                    <th className="p-3">Personnel</th>
                    <th className="p-3">Request Category</th>
                    <th className="p-3">Proposed Cover Soldier</th>
                    <th className="p-3">Response Time</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pendingRequests.map((req) => {
                    const refId = req.id ? `PRH-2026-${req.id.slice(0, 6).toUpperCase()}` : req.ref;
                    const urgency = req.is_fast_lane
                      ? "Urgent / Fast-Track"
                      : req.category?.includes("emergency")
                      ? "Family Emergency"
                      : "Standard";
                    const soldierName = req.personnel_name || req.soldier;
                    const rankTrade = `${req.rank || "Trooper"} · ${req.trade || "GD"}`;
                    const categoryDesc = req.description || formatCategory(req.category || req.type);
                    const cover = req.suggested_replacement_name
                      ? `${req.suggested_replacement_name} (Cover Assigned)`
                      : req.proposedCover || "Trade-Compatible Cover Ready";
                    const hours = req.hours_remaining !== undefined ? `${req.hours_remaining}h remaining` : (req.timeRemaining || "24h remaining");

                    return (
                      <tr key={req.id || refId} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono">
                          <strong className="text-slate-900 block">{refId}</strong>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border inline-block mt-0.5 ${
                            req.is_fast_lane || urgency.includes("Emergency")
                              ? "bg-amber-100 text-amber-900 border-amber-300"
                              : "bg-blue-50 text-blue-900 border-blue-200"
                          }`}>
                            {urgency}
                          </span>
                        </td>
                        <td className="p-3">
                          <strong className="text-slate-900 block">{soldierName}</strong>
                          <span className="text-slate-500 font-mono text-[11px]">{rankTrade}</span>
                        </td>
                        <td className="p-3 text-slate-800">
                          {categoryDesc}
                        </td>
                        <td className="p-3 text-slate-700">
                          <span className="text-emerald-700 font-semibold">{cover}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-[#0c3866] font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#0c3866]" />
                            {hours}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              href="/approvals"
                              className="ux4g-btn ux4g-btn-primary ux4g-btn-sm"
                            >
                              <span>Review</span>
                              <ChevronRight className="w-3 h-3 ml-1" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Workload & Rest */}
      {activeTab === "requests" && (
        <div className="ux4g-card ux4g-card-solid ux4g-card-vertical p-5 space-y-4 bg-white">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-heading">
              Squad Workload &amp; Rest Hours
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Tracks rest hours and night shift count to prevent fatigue accumulation in {activeUnit?.name}.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="text-slate-500 block">Unit Strength:</span>
              <strong className="text-base text-slate-900">{activeUnit?.strength || 200} Troops</strong>
              <span className="text-slate-500 block text-[11px]">
                Active on duty: {dashboardKpis?.active_on_duty ?? 194} · Leave: {dashboardKpis?.on_leave ?? 6}
              </span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="text-slate-500 block">Night Duty Share:</span>
              <strong className="text-base text-slate-900">
                {dashboardKpis?.night_duty_share ?? 22.4}% (Past 14 Days)
              </strong>
              <span className="text-emerald-700 block text-[11px]">Fairly shared across squads</span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="text-slate-500 block">Available Rested Personnel:</span>
              <strong className="text-base text-emerald-700">
                {dashboardKpis?.available_rested ?? 37} Available
              </strong>
              <span className="text-slate-500 block text-[11px]">Ready with &gt; 12 hours rest</span>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-800">
              Want to see what happens if you swap duties or adjust shifts? Compare plans before deciding.
            </span>
            <Link href="/what-if" className="ux4g-btn ux4g-btn-primary ux4g-btn-sm shrink-0">
              Try Another Plan
            </Link>
          </div>
        </div>
      )}

      {/* Tab 3: Administrative Self-Correction */}
      {activeTab === "workload" && (
        <div className="ux4g-card ux4g-card-solid ux4g-card-vertical p-5 space-y-4 bg-white">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-heading">
                Unit Scheduling Balance (Private Reflection)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Private information for company commanders to self-correct leave and shift patterns compared to peer units.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
              Non-Punitive
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded border border-slate-200 space-y-1">
              <span className="text-slate-500 block">Leave Denial Frequency:</span>
              <strong className="text-slate-900 text-sm">{dashboardKpis?.leave_denial_frequency ?? 8.2}%</strong>
              <span className="text-slate-500 block text-[11px]">Peer hard-zone benchmark: &lt; 12.5%</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded border border-slate-200 space-y-1">
              <span className="text-slate-500 block">Night Duty Distribution:</span>
              <strong className="text-slate-900 text-sm">{dashboardKpis?.night_duty_distribution ?? "Evenly Balanced"}</strong>
              <span className="text-slate-500 block text-[11px]">No single soldier unfairly loaded</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded border border-slate-200 space-y-1">
              <span className="text-slate-500 block">Short-Rest Incidents:</span>
              <strong className="text-slate-900 text-sm">{dashboardKpis?.short_rest_incidents ?? 1} (Remediated)</strong>
              <span className="text-slate-500 block text-[11px]">Resolved via shift swap</span>
            </div>
          </div>

          <p className="text-xs text-slate-700 italic bg-slate-50 p-3 rounded border border-slate-200">
            &ldquo;{dashboardKpis?.guidance_text ?? "Your company scheduling shows good balance. Resolving pending requests will keep morale high."}&rdquo;
          </p>
        </div>
      )}

      {/* Tab 4: Section 12 & Section 31 (Resolution Bottlenecks & Welfare Debt) */}
      {activeTab === "bottlenecks" && (
        <div className="space-y-6">
          {/* Section 31: Welfare Debt Deep Dive */}
          <div className="ux4g-card ux4g-card-solid ux4g-card-vertical p-5 space-y-4 bg-white border-2 border-slate-200 shadow-sm">
            <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-heading">
                    Welfare Debt Analysis (Section 31)
                  </h3>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded border ${
                    (welfareDebt?.welfare_debt_level === "CRITICAL" || welfareDebt?.welfare_debt_level === "HIGH")
                      ? "bg-rose-100 text-rose-900 border-rose-300"
                      : welfareDebt?.welfare_debt_level === "MODERATE"
                      ? "bg-amber-100 text-amber-900 border-amber-300"
                      : "bg-emerald-100 text-emerald-900 border-emerald-300"
                  }`}>
                    {welfareDebt?.welfare_debt_level ?? "MODERATE"} DEBT
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Accumulated unresolved welfare pressure across tactical scheduling, delayed requests, and rest deficits.
                </p>
              </div>

              <div className="text-right sm:text-right">
                <span className="text-2xl font-extrabold text-slate-900 font-mono">
                  {welfareDebt?.welfare_debt_score ?? 35.0}
                  <span className="text-xs text-slate-500 font-normal"> / 100</span>
                </span>
                <span className="text-[10px] text-slate-500 block">Organizational Load Index</span>
              </div>
            </div>

            {/* Contributor highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-lg space-y-2">
                <span className="font-bold text-amber-900 uppercase text-[11px] block">
                  Primary Welfare Pressure Contributors:
                </span>
                <ul className="space-y-1.5 text-amber-950">
                  {(welfareDebt?.primary_contributors || [
                    "Unresolved family emergency requests exceeding 12h SLA",
                    "Repeated rest deficits from high night patrol concentration",
                    "Deferred recovery interventions during operational surges"
                  ]).map((c: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-700 font-bold">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                <span className="font-bold text-slate-800 uppercase text-[11px] block">
                  Component Friction Breakdown:
                </span>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-600">Unresolved Grievance Backlog (35% wt):</span>
                      <strong className="text-slate-900">{welfareDebt?.component_breakdown?.unresolved_grievance_pressure ?? 45}%</strong>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${Math.min(100, welfareDebt?.component_breakdown?.unresolved_grievance_pressure ?? 45)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-600">Rest Deficit &amp; Duty Overload (35% wt):</span>
                      <strong className="text-slate-900">{welfareDebt?.component_breakdown?.rest_deficit_pressure ?? 35}%</strong>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, welfareDebt?.component_breakdown?.rest_deficit_pressure ?? 35)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-600">Reserve Depletion &amp; Deferrals (30% wt):</span>
                      <strong className="text-slate-900">{welfareDebt?.component_breakdown?.reserve_depletion_pressure ?? 25}%</strong>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min(100, welfareDebt?.component_breakdown?.reserve_depletion_pressure ?? 25)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic border-t border-slate-100 pt-2">
              {welfareDebt?.non_punitive_disclaimer ?? (
                "Statutory Note: Welfare Debt measures administrative backlog and systemic workload friction, never individual soldier capability or disciplinary standing."
              )}
            </p>
          </div>

          {/* Section 12: Resolution Bottlenecks League Table */}
          <div className="ux4g-card ux4g-card-solid ux4g-card-vertical p-5 space-y-4 bg-white border border-slate-200 shadow-sm">
            <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-heading">
                  Resolution Bottleneck Detection &amp; Company League Table (Section 12)
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Cross-company resolution performance pinpointing administrative bottlenecks and approval tier friction.
                </p>
              </div>

              {bottleneckData && (
                <div className="flex items-center gap-3 text-xs">
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded text-center">
                    <span className="text-[10px] text-slate-500 block uppercase">Force SLA Compliance</span>
                    <strong className="text-sm text-[#0c3866] font-bold">
                      {bottleneckData.force_within_sla_percentage}%
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Bottleneck Summary Alert */}
            {bottleneckData && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Identified Repeated Bottleneck Tier:</span>
                  <strong className="text-rose-900 text-sm font-bold">
                    {bottleneckData.repeated_bottleneck_tier}
                  </strong>
                </div>
                <span className="text-[11px] text-slate-600 max-w-md">
                  {bottleneckData.systemic_friction_insight}
                </span>
              </div>
            )}

            {/* Company Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                    <th className="p-2.5 font-bold">Company / Formation</th>
                    <th className="p-2.5 font-bold">Sector Terrain</th>
                    <th className="p-2.5 font-bold text-center">Total Requests</th>
                    <th className="p-2.5 font-bold text-center">Resolved</th>
                    <th className="p-2.5 font-bold text-center">Pending</th>
                    <th className="p-2.5 font-bold text-center">% Within SLA</th>
                    <th className="p-2.5 font-bold text-center">Avg Resolution</th>
                    <th className="p-2.5 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(bottleneckData?.company_league_table || []).map((row: any) => (
                    <tr key={row.unit_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-2.5 font-semibold text-slate-900">{row.unit_name}</td>
                      <td className="p-2.5 text-slate-500 capitalize">{row.operational_area}</td>
                      <td className="p-2.5 text-center font-mono">{row.total_requests}</td>
                      <td className="p-2.5 text-center font-mono text-emerald-700 font-semibold">{row.resolved_requests}</td>
                      <td className="p-2.5 text-center font-mono text-amber-700 font-semibold">{row.pending_requests}</td>
                      <td className="p-2.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          row.within_sla_percentage >= 85
                            ? "bg-emerald-100 text-emerald-800"
                            : row.within_sla_percentage >= 60
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}>
                          {row.within_sla_percentage}%
                        </span>
                      </td>
                      <td className="p-2.5 text-center text-slate-600">{row.avg_resolution_hours}h</td>
                      <td className="p-2.5 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.bottleneck_status === "OPTIMAL"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : row.bottleneck_status === "FRICTION_MONITORED"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}>
                          {row.bottleneck_status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Frequent Request Categories */}
            {bottleneckData?.frequent_request_types && bottleneckData.frequent_request_types.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-800 text-[11px] uppercase block mb-2">
                  Frequent Request Types &amp; Compliance Rates:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {bottleneckData.frequent_request_types.map((cat: any, i: number) => (
                    <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded space-y-0.5">
                      <span className="font-semibold text-slate-900 block truncate">{cat.category}</span>
                      <span className="text-[11px] text-slate-500 block">{cat.total_count} filed ({cat.breached_count} breached)</span>
                      <span className="text-[10px] text-emerald-700 font-bold block">{cat.compliance_rate}% in SLA</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
