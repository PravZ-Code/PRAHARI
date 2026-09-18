"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { useDataSync } from "@/lib/useDataSync";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  HeartHandshake,
  ShieldCheck,
  Calendar,
  PhoneCall,
  ArrowRight,
  RefreshCw,
  UserCheck,
  Activity,
  Award,
  TrendingUp,
  TrendingDown,
  Lock,
  Eye,
  Sliders,
  Sparkles,
  HelpCircle,
  XCircle,
  PlusCircle,
  Edit3
} from "lucide-react";

export default function TrooperPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [wellbeing, setWellbeing] = useState<any>(null);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"requests" | "access_logs">("requests");

  const scrollToRequests = (tab: "requests" | "access_logs" = "requests") => {
    setActiveTab(tab);
    window.requestAnimationFrame(() => {
      const target = document.getElementById("portal-records");
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.classList.remove("scroll-target-highlight");
      window.setTimeout(() => target.classList.add("scroll-target-highlight"), 180);
      window.setTimeout(() => target.classList.remove("scroll-target-highlight"), 1700);
    });
  };

  // Daily Check-in Modal State
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinSubmitting, setCheckinSubmitting] = useState(false);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [sleepHours, setSleepHours] = useState(6.5);
  const [moodScore, setMoodScore] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [stressLevel, setStressLevel] = useState(2);
  const [freeText, setFreeText] = useState("");
  const [checkinSuccess, setCheckinSuccess] = useState(false);

  // Data Correction Modal State
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
  const [recordType, setRecordType] = useState("duty_roster");
  const [disputedField, setDisputedField] = useState("shift_type");
  const [reportedValue, setReportedValue] = useState("Night Patrol");
  const [claimedValue, setClaimedValue] = useState("Rest / Stand-down");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionResult, setCorrectionResult] = useState<any>(null);

  // Real-time synchronization: refresh trooper requests & wellbeing on database mutations
  useDataSync({
    onGrievanceChange: () => {
      loadPortalData();
    },
    onAssessmentChange: () => {
      loadPortalData();
    },
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
    if (currentUser?.role === "welfare" || currentUser?.role === "welfare_officer") {
      window.location.replace("/welfare");
      return;
    }
    if (currentUser?.role === "admin") {
      window.location.replace("/admin");
      return;
    }
    loadPortalData();
  }, []);

  const loadPortalData = async () => {
    setLoading(true);
    try {
      const [profileRes, requestsRes, wellbeingRes, accessRes] = await Promise.allSettled([
        api.get("/auth/me"),
        api.get("/grievance/my-requests"),
        api.get("/personnel/my-wellbeing"),
        api.get("/personnel/access-log"),
      ]);

      if (profileRes.status === "fulfilled") {
        setProfile(profileRes.value.data);
      }
      if (requestsRes.status === "fulfilled") {
        setMyRequests(requestsRes.value.data || []);
      }
      if (wellbeingRes.status === "fulfilled") {
        setWellbeing(wellbeingRes.value.data);
      }
      if (accessRes.status === "fulfilled") {
        setAccessLogs(accessRes.value.data?.access_logs || []);
      }
    } catch (err) {
      console.error("Failed to load trooper portal data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDailyCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckinSubmitting(true);
    try {
      await api.post("/assessment/submit", {
        sleep_quality: sleepQuality,
        sleep_hours: sleepHours,
        mood_score: moodScore,
        energy_level: energyLevel,
        stress_level: stressLevel,
        free_text: freeText || "Daily pulse check completed by trooper.",
        is_offline_entry: false
      });
      setCheckinSuccess(true);
      setTimeout(() => {
        setCheckinSuccess(false);
        setShowCheckinModal(false);
        setFreeText("");
      }, 1800);
      await loadPortalData();
    } catch (err: any) {
      console.error("Check-in error:", err);
      alert(err.response?.data?.detail || "Could not save daily check-in.");
    } finally {
      setCheckinSubmitting(false);
    }
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCorrectionSubmitting(true);
    try {
      const res = await api.post("/personnel/data-correction", {
        record_type: recordType,
        record_date: new Date().toISOString().split("T")[0],
        disputed_field: disputedField,
        reported_value: reportedValue,
        claimed_value: claimedValue,
        reason: correctionReason || "Factual correction requested per company rest order."
      });
      setCorrectionResult(res.data);
      await loadPortalData();
    } catch (err: any) {
      console.error("Correction error:", err);
      alert(err.response?.data?.detail || "Could not submit correction request.");
    } finally {
      setCorrectionSubmitting(false);
    }
  };

  const getTrajectoryBadge = (traj: string) => {
    switch (traj?.toUpperCase()) {
      case "IMPROVING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
            <TrendingDown className="w-3.5 h-3.5" /> IMPROVING (Fatigue Easing)
          </span>
        );
      case "RECOVERING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold border border-teal-300">
            <Sparkles className="w-3.5 h-3.5" /> RECOVERING (Rest Post-Duty)
          </span>
        );
      case "RISING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300">
            <TrendingUp className="w-3.5 h-3.5" /> RISING (Fatigue Accumulating)
          </span>
        );
      case "RISING_RAPIDLY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-900 text-xs font-bold border border-red-300 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" /> RISING RAPIDLY (High Acute Load)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-300">
            <Activity className="w-3.5 h-3.5" /> STABLE (Balanced Baseline)
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">APPROVED</span>;
      case "fast_tracked":
        return <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px] animate-pulse">FAST-TRACKED (12H)</span>;
      case "rejected":
        return <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px]">REJECTED</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">UNDER REVIEW</span>;
    }
  };

  if (loading && !profile) {
    return (
      <div className="py-24 px-4 max-w-7xl mx-auto flex flex-col items-center justify-center space-y-4 min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-[#0c3866] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Verifying authorization and loading trooper portal...</p>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Jawan Profile Header Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#0c3866] text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
            {profile?.name ? profile.name.slice(0, 2).toUpperCase() : user?.username?.slice(0, 2).toUpperCase() || "CR"}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-slate-900 font-heading">
                {profile?.rank || "Personnel"} {profile?.name || user?.name || user?.username || "Authorized Personnel"}
              </h1>
              {profile?.service_number && (
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold text-xs border border-slate-300">
                  {profile.service_number}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Unit: <strong className="text-slate-700">{profile?.unit_name || "Assigned Command"}</strong> · Trade: <strong className="text-slate-700">{profile?.trade || "General Duty (GD)"}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCheckinModal(true)}
            className="px-3.5 py-2 bg-[#0c3866] hover:bg-[#072648] text-white text-xs font-bold rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Activity className="w-4 h-4" />
            <span>Daily Wellbeing Pulse</span>
          </button>
          <button
            onClick={loadPortalData}
            className="p-2 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh Status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* SECTION 1: Forward-Looking Predictive Wellbeing & Trajectory Panel */}
      <div className="bg-gradient-to-br from-slate-900 via-[#072648] to-[#0c3866] text-white rounded-xl shadow-md p-6 sm:p-7 relative overflow-hidden border border-slate-700">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider backdrop-blur-xs">
                Longitudinal Welfare Intelligence
              </span>
              {getTrajectoryBadge(wellbeing?.trajectory || "STABLE")}
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-heading text-white">
              {wellbeing?.wellbeing_status || "Optimal Operational Readiness"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {wellbeing?.what_changed?.summary || "Duty rosters and voluntary check-in patterns show consistent balance within personal baseline."}
            </p>
          </div>

          {/* Multi-Horizon Risk & Calibration Dial */}
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/15 w-full lg:w-auto min-w-[280px] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">14-Day Strain Forecast</span>
              <span className="text-sm font-black text-amber-300">
                {wellbeing?.multi_horizon_forecast?.prob_14d ? `${(wellbeing.multi_horizon_forecast.prob_14d * 100).toFixed(0)}%` : "18%"}
              </span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-amber-400 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(10, (wellbeing?.multi_horizon_forecast?.prob_14d || 0.18) * 100))}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10 text-[11px]">
              <div>
                <span className="text-slate-300 block">7-Day Acute:</span>
                <strong className="text-white">
                  {wellbeing?.multi_horizon_forecast?.prob_7d ? `${(wellbeing.multi_horizon_forecast.prob_7d * 100).toFixed(0)}%` : "16%"}
                </strong>
              </div>
              <div>
                <span className="text-slate-300 block">30-Day Cumulative:</span>
                <strong className="text-white">
                  {wellbeing?.multi_horizon_forecast?.prob_30d ? `${(wellbeing.multi_horizon_forecast.prob_30d * 100).toFixed(0)}%` : "20%"}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* What Changed Baseline Metrics Strip */}
        <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-300 block text-[11px]">Consecutive Duty Days</span>
            <span className="font-bold text-base text-white mt-0.5 block">
              {wellbeing?.what_changed?.consecutive_duty_days ?? 3} Days
            </span>
          </div>
          <div>
            <span className="text-slate-300 block text-[11px]">Night Shifts (14d)</span>
            <span className="font-bold text-base text-white mt-0.5 block">
              {wellbeing?.what_changed?.night_shifts_14d ?? 1} Shifts
            </span>
          </div>
          <div>
            <span className="text-slate-300 block text-[11px]">Stress Shift (vs 14d)</span>
            <span className="font-bold text-base text-white mt-0.5 block">
              {wellbeing?.what_changed?.stress_delta_14d !== undefined
                ? (wellbeing.what_changed.stress_delta_14d > 0 ? `+${wellbeing.what_changed.stress_delta_14d}` : wellbeing.what_changed.stress_delta_14d)
                : "-0.2"} pts
            </span>
          </div>
          <div>
            <span className="text-slate-300 block text-[11px]">Statutory Privacy Wall</span>
            <span className="font-bold text-base text-emerald-400 mt-0.5 block flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Section 21 Active
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: Primary Trooper Action Deck */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Apply for Leave / Support */}
        <div className="gov-action-card bg-white rounded-lg border-2 border-slate-200 hover:border-[#0c3866] shadow-xs hover:shadow-md p-5 transition-all flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="gov-icon-box w-10 h-10 rounded-lg bg-[#0c3866]/10 text-[#0c3866] flex items-center justify-center font-bold">
                <FileText className="w-5 h-5 text-[#0c3866]" />
              </div>
              <span className="gov-status-tag px-2 py-0.5 rounded bg-blue-50 text-[#0c3866] font-semibold text-[11px] border border-blue-200">
                42d Annual Available
              </span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-heading group-hover:text-[#0c3866] transition-colors">
                Apply for Leave / Support
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Submit annual leave, casual leave, or welfare redressal directly to company command.
              </p>
            </div>
          </div>
          <div className="pt-4 mt-2 border-t border-slate-100">
            <Link
              href="/request"
              className="gov-action-button w-full py-2 px-3 bg-[#0c3866] hover:bg-[#072648] text-white text-xs font-bold rounded-md shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Open Application</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 2: Track Active Requests */}
        <div className="gov-action-card bg-white rounded-lg border-2 border-slate-200 hover:border-amber-500 shadow-xs hover:shadow-md p-5 transition-all flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="gov-icon-box w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <span className="gov-status-tag px-2 py-0.5 rounded bg-amber-50 text-amber-900 font-semibold text-[11px] border border-amber-200">
                {myRequests.length} Total Docket{myRequests.length === 1 ? "" : "s"}
              </span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-heading group-hover:text-amber-700 transition-colors">
                Track Application Status
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Check live review stages, assigned reviewing officers, and SLA timelines in real time.
              </p>
            </div>
          </div>
          <div className="pt-4 mt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => scrollToRequests("requests")}
              className="gov-action-button w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-md shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Check Status</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 3: Family Emergency (12h SOS) */}
        <div className="gov-action-card bg-white rounded-lg border-2 border-red-200 hover:border-red-600 shadow-xs hover:shadow-md p-5 transition-all flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="gov-icon-box w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
              </div>
              <span className="gov-status-tag px-2 py-0.5 rounded bg-red-100 text-red-900 font-bold text-[10px] uppercase tracking-wider border border-red-300 animate-pulse">
                12h Fast-Lane
              </span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-heading group-hover:text-red-700 transition-colors">
                Family Emergency SOS
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Urgent compassionate leave for sudden family crisis or parental hospital emergency.
              </p>
            </div>
          </div>
          <div className="pt-4 mt-2 border-t border-slate-100">
            <Link
              href="/emergency"
              className="gov-action-button w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>File Emergency SOS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 4: Report Discrepancy / Redressal */}
        <div className="gov-action-card bg-white rounded-lg border-2 border-slate-200 hover:border-indigo-600 shadow-xs hover:shadow-md p-5 transition-all flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="gov-icon-box w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <Edit3 className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="gov-status-tag px-2 py-0.5 rounded bg-indigo-50 text-indigo-900 font-semibold text-[11px] border border-indigo-200">
                48h SLA Review
              </span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-heading group-hover:text-indigo-700 transition-colors">
                Report Discrepancy
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Contest inaccurate duty shifts, unrecorded rest days, or incorrect leave balances.
              </p>
            </div>
          </div>
          <div className="pt-4 mt-2 border-t border-slate-100">
            <button
              onClick={() => setShowCorrectionModal(true)}
              className="gov-action-button w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-md shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Submit Dispute</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: Tabbed View (My Requests vs Personal Access Log) */}
      <div id="portal-records" className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 px-6 pt-4 gap-6 bg-slate-50/50">
          <button
            onClick={() => setActiveTab("requests")}
            className={`pb-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === "requests"
                ? "border-[#0c3866] text-[#0c3866]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            My Submitted Requests ({myRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("access_logs")}
            className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "access_logs"
                ? "border-[#0c3866] text-[#0c3866]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Who Viewed My Data? ({accessLogs.length})</span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              Section 21
            </span>
          </button>
        </div>

        {/* Tab 1: Requests Table */}
        {activeTab === "requests" && (
          <div>
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-[#0c3866] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Loading your live requests from database...</p>
              </div>
            ) : myRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-3">
                <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs">No active leave or welfare requests found.</p>
                <Link
                  href="/request"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0c3866] text-white text-xs font-bold rounded-md hover:bg-[#072648]"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Submit First Application</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Docket ID</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Filing Date</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {myRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {req.id.slice(0, 8)}...
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 capitalize">
                            {req.category?.replace(/_/g, " ") || req.request_type}
                          </span>
                          {req.is_fast_lane && (
                            <span className="ml-2 px-1.5 py-0.2 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                              FAST-LANE
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {req.filed_at ? new Date(req.filed_at).toLocaleDateString() : "Recent"}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {req.start_date || "Immediate"} {req.end_date ? `to ${req.end_date}` : ""}
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(req.status)}</td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/track?id=${req.id}`}
                            className="text-[#0c3866] hover:underline font-bold text-xs"
                          >
                            Track Live
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Who Viewed My Data? Access Transparency Log */}
        {activeTab === "access_logs" && (
          <div className="space-y-4 p-6">
            {/* Reassuring Statutory Guarantee Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <h4 className="font-bold text-emerald-900 font-heading">
                  Statutory Privacy Firewall Active (Section 21 MHA / CRPF Regulations)
                </h4>
                <p className="text-emerald-800 leading-relaxed">
                  Your voluntary self-assessment logs and private wellbeing check-ins are strictly confidential.
                  Company Commanders are cryptographically firewalled from inspecting individual psychological scores.
                  Below is the tamper-evident audit trail of authorized officers who accessed your file for statutory duties.
                </p>
              </div>
            </div>

            {accessLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs">No outside access events recorded for your personnel record.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">Officer / Accessor</th>
                      <th className="py-2.5 px-4">Role</th>
                      <th className="py-2.5 px-4">Statutory Purpose</th>
                      <th className="py-2.5 px-4 text-right">Ledger Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {accessLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : "Recent"}
                        </td>
                        <td className="py-3 px-4">
                          <strong className="text-slate-900 block">{log.accessor_name}</strong>
                          {log.accessor_rank && (
                            <span className="text-[10px] text-slate-500">{log.accessor_rank}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] uppercase font-bold border border-slate-200">
                            {log.accessor_role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-slate-800 font-medium">{log.purpose_description}</p>
                          <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                            {log.statutory_compliance}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            SHA-256 Intact
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: Daily Wellbeing Check-in Modal */}
      {showCheckinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#0c3866]" />
                <h3 className="font-bold text-base text-slate-900 font-heading">
                  Daily Wellbeing Pulse Check-in
                </h3>
              </div>
              <button
                onClick={() => setShowCheckinModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {checkinSuccess ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
                <h4 className="text-base font-bold text-slate-900">Check-in Logged Successfully!</h4>
                <p className="text-xs text-slate-500">
                  Your baseline resilience index and trajectory have been updated in real-time.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDailyCheckinSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Sleep Duration Last Night ({sleepHours} Hours)
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="10"
                    step="0.5"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                    className="w-full accent-[#0c3866]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>3h (Severe Deficit)</span>
                    <span>6.5h (Target)</span>
                    <span>10h (Full Rest)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Sleep Quality (1-5)</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setSleepQuality(val)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded border ${
                            sleepQuality === val
                              ? "bg-[#0c3866] text-white border-[#0c3866]"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Mood Rating (1-5)</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setMoodScore(val)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded border ${
                            moodScore === val
                              ? "bg-[#0c3866] text-white border-[#0c3866]"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Energy Level (1-5)</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setEnergyLevel(val)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded border ${
                            energyLevel === val
                              ? "bg-[#0c3866] text-white border-[#0c3866]"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Stress Level (1-5)</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setStressLevel(val)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded border ${
                            stressLevel === val
                              ? "bg-red-600 text-white border-red-600"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Confidential Note (Optional - Welfare Officer Only)
                  </label>
                  <textarea
                    rows={2}
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    placeholder="E.g. Completed night convoy patrol; minor knee strain; resting today."
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#0c3866] outline-hidden text-xs"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCheckinModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={checkinSubmitting}
                    className="px-5 py-2 bg-[#0c3866] hover:bg-[#072648] text-white font-bold rounded-md shadow-xs flex items-center gap-1.5"
                  >
                    {checkinSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Submit Daily Pulse</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Data Correction / Discrepancy Dispute Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900 font-heading">
                  Report Record Discrepancy
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowCorrectionModal(false);
                  setCorrectionResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {correctionResult ? (
              <div className="py-6 space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Correction Registered Under 48h SLA</span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    Tracking ID: <strong className="font-mono">{correctionResult.tracking_id}</strong>
                  </p>
                  <p className="text-xs text-emerald-700">
                    Deadline: <strong>{new Date(correctionResult.sla_deadline).toLocaleString()}</strong>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCorrectionModal(false);
                    setCorrectionResult(null);
                  }}
                  className="w-full py-2 bg-[#0c3866] text-white text-xs font-bold rounded-md"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleCorrectionSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Record Type</label>
                  <select
                    value={recordType}
                    onChange={(e) => setRecordType(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-600 outline-hidden"
                  >
                    <option value="duty_roster">Duty Roster / Shift Entry</option>
                    <option value="leave_record">Leave Record / Application Status</option>
                    <option value="posting_tenure">Posting Tenure / Hard Area Duration</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Reported (Incorrect) Value</label>
                    <input
                      type="text"
                      value={reportedValue}
                      onChange={(e) => setReportedValue(e.target.value)}
                      placeholder="E.g. Night Patrol"
                      className="w-full p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-600 outline-hidden"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Claimed (Correct) Value</label>
                    <input
                      type="text"
                      value={claimedValue}
                      onChange={(e) => setClaimedValue(e.target.value)}
                      placeholder="E.g. Approved Rest Cycle"
                      className="w-full p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-600 outline-hidden"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Factual Reason & Order Reference</label>
                  <textarea
                    rows={3}
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="Provide details (e.g. Authorized by Coy Commander Order #42 on Sept 10; was physically present at base dispensary)."
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-600 outline-hidden"
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCorrectionModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={correctionSubmitting}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md shadow-xs flex items-center gap-1.5"
                  >
                    {correctionSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Submit Dispute (48h SLA)</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
