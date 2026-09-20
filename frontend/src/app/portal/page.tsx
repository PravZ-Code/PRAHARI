"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { useDataSync } from "@/lib/useDataSync";
import { formatCategory, formatStatus, formatTrajectory, formatHumanReadable } from "@/lib/formatters";
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
  Edit3,
  AlertCircle,
  Trash2,
  FileX,
  Search,
  Filter,
  LayoutGrid,
  List,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  X,
  Download,
  FileSpreadsheet,
  Archive
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

  // Requests Filtering, Search, View Mode & Pagination State
  const [requestSearchQuery, setRequestSearchQuery] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState<"all" | "pending" | "fast_lane" | "approved" | "rejected">("all");
  const [requestViewMode, setRequestViewMode] = useState<"cards" | "table">("cards");
  const [requestPage, setRequestPage] = useState(1);
  const [requestPageSize, setRequestPageSize] = useState(6);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingLogs, setDownloadingLogs] = useState(false);

  // Operational Insights Dropdown State (De-cluttered Parity Menu)
  const [showInsightsDropdown, setShowInsightsDropdown] = useState(false);
  const insightsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (insightsDropdownRef.current && !insightsDropdownRef.current.contains(event.target as Node)) {
        setShowInsightsDropdown(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowInsightsDropdown(false);
      }
    };

    if (showInsightsDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showInsightsDropdown]);

  // Access Logs Filtering & Pagination State
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(10);

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
  const [voluntaryConsent, setVoluntaryConsent] = useState(false);

  // Data Correction Modal State
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
  const [recordType, setRecordType] = useState("duty_roster");
  const [disputedField, setDisputedField] = useState("shift_type");
  const [reportedValue, setReportedValue] = useState("Night Patrol");
  const [claimedValue, setClaimedValue] = useState("Rest / Stand-down");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionResult, setCorrectionResult] = useState<any>(null);

  // Data Deletion Modal State (DPDP Act 2023 §12(3))
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [deletionSubmitting, setDeletionSubmitting] = useState(false);
  const [deletionCategory, setDeletionCategory] = useState("voluntary_self_reports");
  const [deletionTimeframe, setDeletionTimeframe] = useState("prior_to_last_30_days");
  const [deletionReason, setDeletionReason] = useState("");
  const [deletionAffirmation, setDeletionAffirmation] = useState(false);
  const [deletionResult, setDeletionResult] = useState<any>(null);

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
        setVoluntaryConsent(false);
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

  const handleDeletionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletionAffirmation) return;
    setDeletionSubmitting(true);
    try {
      const res = await api.post("/personnel/data-deletion", {
        data_category: deletionCategory,
        timeframe: deletionTimeframe,
        reason: deletionReason || "Statutory erasure requested under DPDP Act 2023 §12(3)",
        affirmation: true
      });
      setDeletionResult(res.data);
      await loadPortalData();
    } catch (err: any) {
      console.error("Deletion request error:", err);
      alert(err.response?.data?.detail || "Could not submit deletion request.");
    } finally {
      setDeletionSubmitting(false);
    }
  };

  const getTrajectoryBadge = (traj: string) => {
    const label = formatTrajectory(traj);
    switch (traj?.toUpperCase()) {
      case "IMPROVING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
            <TrendingDown className="w-3.5 h-3.5" /> {label}
          </span>
        );
      case "RECOVERING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold border border-teal-300">
            <Sparkles className="w-3.5 h-3.5" /> {label}
          </span>
        );
      case "RISING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300">
            <TrendingUp className="w-3.5 h-3.5" /> {label}
          </span>
        );
      case "RISING_RAPIDLY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-900 text-xs font-bold border border-red-300 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" /> {label}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-300">
            <Activity className="w-3.5 h-3.5" /> {label}
          </span>
        );
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Recent";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const copyToClipboard = (text: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error("Clipboard copy failed:", e);
    }
  };

  const getCategoryIcon = (category: string, isFastLane?: boolean) => {
    const cat = (category || "").toLowerCase();
    if (isFastLane || cat.includes("emergency")) {
      return <AlertTriangle className="w-4 h-4 text-red-600" />;
    }
    if (cat.includes("medical") || cat.includes("health") || cat.includes("hospital")) {
      return <Activity className="w-4 h-4 text-emerald-600" />;
    }
    if (cat.includes("welfare") || cat.includes("family") || cat.includes("compassionate")) {
      return <HeartHandshake className="w-4 h-4 text-purple-600" />;
    }
    if (cat.includes("grievance") || cat.includes("dispute") || cat.includes("correction")) {
      return <PhoneCall className="w-4 h-4 text-amber-600" />;
    }
    return <Calendar className="w-4 h-4 text-[#0c3866]" />;
  };

  const getStatusBadge = (status: string, isFastLane?: boolean) => {
    const s = status?.toLowerCase();
    if (s === "approved") {
      return (
        <span className="ux4g-tag-filled-success ux4g-tag-s inline-flex items-center gap-1 font-bold text-[10px]">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          APPROVED
        </span>
      );
    }
    if (s === "rejected") {
      return (
        <span className="ux4g-tag-outline-error ux4g-tag-s inline-flex items-center gap-1 font-bold text-[10px]">
          <XCircle className="w-3 h-3 text-rose-600" />
          REJECTED
        </span>
      );
    }
    if (isFastLane || s === "fast_tracked") {
      return (
        <span className="ux4g-tag-tonal-warning ux4g-tag-s inline-flex items-center gap-1 font-bold text-[10px] animate-pulse">
          <Clock className="w-3 h-3 text-amber-700" />
          FAST-TRACK (12H)
        </span>
      );
    }
    return (
      <span className="ux4g-tag-tonal-brand ux4g-tag-s inline-flex items-center gap-1 font-bold text-[10px]">
        <Clock className="w-3 h-3 text-blue-600" />
        UNDER REVIEW
      </span>
    );
  };

  if (loading && !profile) {
    return (
      <div className="py-24 px-4 max-w-7xl mx-auto flex flex-col items-center justify-center space-y-4 min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-[#0c3866] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Verifying authorization and loading trooper portal...</p>
      </div>
    );
  }

  const isWithinLast30Days = (dateStr: string | null | undefined) => {
    if (!dateStr) return true;
    try {
      const filed = new Date(dateStr);
      if (isNaN(filed.getTime())) return true;
      const diffDays = (Date.now() - filed.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 30;
    } catch {
      return true;
    }
  };

  const downloadArchiveLogs = (scope: "archive" | "all" = "archive") => {
    setDownloadingLogs(true);
    try {
      const targetList = scope === "archive" ? archivedRequests : myRequests;
      if (targetList.length === 0) {
        alert(scope === "archive" ? "No historical records older than 30 days to archive." : "No records found.");
        return;
      }

      const headers = [
        "Request ID",
        "Request Type",
        "Category",
        "Filing Date",
        "Requested Period",
        "Status",
        "Fast-Lane 12H",
        "Target Response",
        "Reason / Description"
      ];

      const rows = targetList.map((r) => [
        r.id,
        formatCategory(r.request_type || "leave"),
        formatCategory(r.category || r.request_type || "General Leave"),
        r.filed_at ? new Date(r.filed_at).toISOString().split("T")[0] : "",
        `"${(r.start_date || "Immediate") + (r.end_date ? " to " + r.end_date : "")}"`,
        formatStatus(r.status || "filed"),
        r.is_fast_lane ? "YES" : "NO",
        r.is_fast_lane ? "12 Hours Fast-Lane" : "48 Hours Standard",
        `"${(r.description || "").replace(/"/g, '""').replace(/\n/g, ' ')}"`
      ]);

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + 
        [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      const filename = scope === "archive"
        ? `PRAHARI_Historical_Archive_Logs_Older_Than_30_Days_${new Date().toISOString().split("T")[0]}.csv`
        : `PRAHARI_Complete_Service_Request_Ledger_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to generate archive download:", err);
      window.open(`/api/grievance/my-requests/export?scope=${scope}`, "_blank");
    } finally {
      setTimeout(() => setDownloadingLogs(false), 800);
    }
  };

  // 30-Day Active Service Window Rule:
  // In accordance with data minimization and clarity standards, only requests from the last 30 days
  // are displayed on the active portal. Older records are preserved in audit logs and downloadable on demand.
  const recentRequests = myRequests.filter((req) => isWithinLast30Days(req.filed_at));
  const archivedRequests = myRequests.filter((req) => !isWithinLast30Days(req.filed_at));

  // Filter calculations for Requests (operating strictly on the active 30-day window)
  const pendingCount = recentRequests.filter(
    (r) =>
      !r.status ||
      r.status.toLowerCase() === "under_review" ||
      r.status.toLowerCase() === "pending"
  ).length;
  const fastLaneCount = recentRequests.filter(
    (r) => r.is_fast_lane || r.status?.toLowerCase() === "fast_tracked"
  ).length;
  const approvedCount = recentRequests.filter(
    (r) => r.status?.toLowerCase() === "approved"
  ).length;
  const rejectedCount = recentRequests.filter(
    (r) => r.status?.toLowerCase() === "rejected"
  ).length;

  const filteredRequests = recentRequests.filter((req) => {
    if (requestStatusFilter === "pending") {
      const s = req.status?.toLowerCase();
      if (s && s !== "under_review" && s !== "pending") return false;
    } else if (requestStatusFilter === "fast_lane") {
      if (!req.is_fast_lane && req.status?.toLowerCase() !== "fast_tracked") return false;
    } else if (requestStatusFilter === "approved") {
      if (req.status?.toLowerCase() !== "approved") return false;
    } else if (requestStatusFilter === "rejected") {
      if (req.status?.toLowerCase() !== "rejected") return false;
    }

    if (requestSearchQuery.trim()) {
      const q = requestSearchQuery.toLowerCase().trim();
      const idMatch = req.id?.toLowerCase().includes(q);
      const catMatch = req.category?.toLowerCase().includes(q);
      const typeMatch = req.request_type?.toLowerCase().includes(q);
      const descMatch = req.description?.toLowerCase().includes(q);
      const startMatch = req.start_date?.toLowerCase().includes(q);
      const endMatch = req.end_date?.toLowerCase().includes(q);
      if (!idMatch && !catMatch && !typeMatch && !descMatch && !startMatch && !endMatch) {
        return false;
      }
    }
    return true;
  });

  const totalRequestPages = Math.max(1, Math.ceil(filteredRequests.length / requestPageSize));
  const currentRequestPage = Math.min(requestPage, totalRequestPages);
  const paginatedRequests = filteredRequests.slice(
    (currentRequestPage - 1) * requestPageSize,
    currentRequestPage * requestPageSize
  );


  // Filter calculations for Access Logs
  const filteredLogs = accessLogs.filter((log) => {
    if (!logSearchQuery.trim()) return true;
    const q = logSearchQuery.toLowerCase().trim();
    return (
      log.accessor_name?.toLowerCase().includes(q) ||
      log.accessor_role?.toLowerCase().includes(q) ||
      log.accessor_rank?.toLowerCase().includes(q) ||
      log.purpose_description?.toLowerCase().includes(q) ||
      log.statutory_compliance?.toLowerCase().includes(q)
    );
  });
  const totalLogPages = Math.max(1, Math.ceil(filteredLogs.length / logPageSize));
  const currentLogPage = Math.min(logPage, totalLogPages);
  const paginatedLogs = filteredLogs.slice(
    (currentLogPage - 1) * logPageSize,
    currentLogPage * logPageSize
  );

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Jawan Profile Header Card */}
      <div className="ux4g-card ux4g-card-solid ux4g-card-vertical bg-white rounded-lg border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
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
                <span className="ux4g-tag-tonal-neutral font-mono font-bold text-xs">
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
            className="ux4g-btn ux4g-btn-primary ux4g-btn-sm flex items-center gap-1.5"
          >
            <Activity className="w-4 h-4" />
            <span>Daily Wellbeing Pulse</span>
          </button>
          <button
            onClick={loadPortalData}
            className="ux4g-icon-btn ux4g-icon-btn-outline-primary ux4g-icon-btn-sm"
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
                Wellbeing & Duty Balance
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
              <span className="text-xs font-semibold text-slate-200">14-Day Fatigue & Rest Index</span>
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
                <span className="text-slate-300 block">7-Day Duty Load:</span>
                <strong className="text-white">
                  {wellbeing?.multi_horizon_forecast?.prob_7d ? `${(wellbeing.multi_horizon_forecast.prob_7d * 100).toFixed(0)}%` : "16%"}
                </strong>
              </div>
              <div>
                <span className="text-slate-300 block">30-Day Rest Balance:</span>
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
            <span className="text-slate-300 block text-[11px]">Confidentiality</span>
            <span className="font-bold text-base text-emerald-400 mt-0.5 block flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Confidential & Protected
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1.5: Operational Insights Dropdown Bar (De-cluttered Parity Menu) */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 sm:px-5 py-3 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0c3866]/10 text-[#0c3866] flex items-center justify-center shrink-0">
            <Sliders className="w-5 h-5 text-[#0c3866]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900 font-heading">
                Operational & Recovery Insights
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0c3866] text-[10px] font-bold border border-blue-200">
                Self-Service Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review your 90-day duty shifts, risk factors, or track active welfare recovery.
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-auto" ref={insightsDropdownRef}>
          <button
            type="button"
            onClick={() => setShowInsightsDropdown((prev) => !prev)}
            className="w-full sm:w-auto ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm flex items-center justify-between sm:justify-center gap-2 font-semibold text-xs py-2 px-3.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            aria-expanded={showInsightsDropdown}
            aria-haspopup="true"
            aria-label="Select Operational Insight Module"
          >
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#0c3866]" />
              <span>Select Insight Module</span>
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${showInsightsDropdown ? "rotate-180" : ""}`} />
          </button>

          {showInsightsDropdown && (
            <div
              role="menu"
              aria-orientation="vertical"
              className="absolute right-0 mt-2 w-full sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in divide-y divide-slate-100"
            >
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Telemetry & Recovery Modules
                </span>
                <span className="text-[10px] font-semibold text-[#0c3866] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  3 Modules
                </span>
              </div>

              <div className="p-1.5 space-y-1">
                {/* Parity Feature 1: Dedicated "What Changed?" screen */}
                <Link
                  href="/portal/what-changed"
                  onClick={() => setShowInsightsDropdown(false)}
                  role="menuitem"
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-blue-50/60 transition-colors group text-left cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0c3866] border border-blue-200 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    <Activity className="w-4 h-4 text-[#0c3866]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 justify-between">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-[#0c3866] transition-colors">
                        What Changed? (Schedule & Rest)
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[#0c3866] text-[10px] font-bold border border-blue-200 shrink-0">
                        Baseline vs Recent
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                      Compare your 90-day baseline with recent duty schedules, night shifts, and rest gaps.
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0c3866] group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </Link>

                {/* Parity Feature 2: Dedicated "Why is my risk changing?" screen */}
                <Link
                  href="/portal/why-risk-changing"
                  onClick={() => setShowInsightsDropdown(false)}
                  role="menuitem"
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-amber-50/60 transition-colors group text-left cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 justify-between">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                        Why is My Risk Changing?
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 text-[10px] font-bold border border-amber-200 shrink-0">
                        Factor Insights
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                      Key factors, personal baseline comparison, and clear explanations of what affects your rest score.
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </Link>

                {/* Parity Feature 3: Dedicated recovery timeline */}
                <Link
                  href="/portal/recovery-timeline"
                  onClick={() => setShowInsightsDropdown(false)}
                  role="menuitem"
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-emerald-50/60 transition-colors group text-left cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    <Award className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 justify-between">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                        Dedicated Recovery Timeline
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-900 text-[10px] font-bold border border-emerald-200 shrink-0">
                        Recovery Steps
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                      Track the full journey from initial rest support request through officer review and recovery.
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Primary Trooper Action Deck */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Apply for Leave / Support */}
        <div className="ux4g-card ux4g-card-solid ux4g-card-vertical hover:border-[#0c3866] shadow-xs hover:shadow-md p-5 transition-all flex flex-col justify-between group animate-fade-in-up stagger-1">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[#0c3866]/10 text-[#0c3866] flex items-center justify-center font-bold">
                <FileText className="w-5 h-5 text-[#0c3866]" />
              </div>
              <span className="ux4g-tag-tonal-brand font-semibold text-[11px]">
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
              className="ux4g-btn ux4g-btn-primary ux4g-btn-sm w-full flex items-center justify-center gap-1.5"
            >
              <span>Open Application</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 2: Track Active Requests */}
        <div className="ux4g-card ux4g-card-solid ux4g-card-vertical hover:border-amber-500 shadow-xs hover:shadow-md p-5 transition-all flex flex-col justify-between group animate-fade-in-up stagger-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <span className="ux4g-tag-tonal-warning font-semibold text-[11px]">
                {myRequests.length} Total Request{myRequests.length === 1 ? "" : "s"}
              </span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-heading group-hover:text-amber-700 transition-colors">
                Track Application Status
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Check live review stages, assigned reviewing officers, and expected timelines in real time.
              </p>
            </div>
          </div>
          <div className="pt-4 mt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => scrollToRequests("requests")}
              className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm w-full flex items-center justify-center gap-1.5"
            >
              <span>Check Status</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 3: Family Emergency (12h SOS) */}
        <div className="ux4g-card ux4g-card-solid ux4g-card-vertical border-red-200 hover:border-red-600 shadow-xs hover:shadow-md p-5 transition-all flex flex-col justify-between group animate-fade-in-up stagger-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
              </div>
              <span className="ux4g-tag-filled-error ux4g-tag-s font-bold text-[10px] uppercase tracking-wider">
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
              className="ux4g-btn ux4g-btn-danger ux4g-btn-sm w-full flex items-center justify-center gap-1.5"
            >
              <span>File Emergency SOS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 4: Report Discrepancy / Redressal */}
        <div className="ux4g-card ux4g-card-solid ux4g-card-vertical hover:border-indigo-600 shadow-xs hover:shadow-md p-5 transition-all flex flex-col justify-between group animate-fade-in-up stagger-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <Edit3 className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="ux4g-tag-tonal-neutral font-semibold text-[11px]">
                48h Priority Review
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
          <div className="pt-4 mt-2 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => setShowCorrectionModal(true)}
              className="ux4g-btn ux4g-btn-tonal-primary ux4g-btn-sm w-full flex items-center justify-center gap-1.5"
            >
              <span>Submit Dispute (48h Review)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setDeletionResult(null);
                setDeletionAffirmation(false);
                setShowDeletionModal(true);
              }}
              className="ux4g-btn ux4g-btn-outline-neutral ux4g-btn-xs w-full flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3 h-3 text-rose-600" />
              <span>Clear Voluntary Check-in Notes</span>
            </button>
          </div>

        </div>
      </div>

      {/* SECTION 3: Tabbed View (My Requests vs Personal Access Log) */}
      <div id="portal-records" className="ux4g-card ux4g-card-solid ux4g-card-vertical bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all">
        {/* Tab Headers */}
        <div className="ux4g-tab ux4g-tab-underline ux4g-tab-md border-b border-slate-200 px-6 pt-4 bg-slate-50/70">
          <ul className="ux4g-tab-list flex gap-6">
            <li
              onClick={() => setActiveTab("requests")}
              className={`ux4g-tab-item cursor-pointer pb-3 text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "requests" ? "is-active text-[#0c3866] border-b-2 border-[#0c3866]" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>My Submitted Requests</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "requests"
                  ? "bg-[#0c3866]/10 text-[#0c3866]"
                  : "bg-slate-200 text-slate-600"
              }`}>
                {recentRequests.length}
              </span>
              <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] font-bold">
                Last 30 Days
              </span>
            </li>
            <li
              onClick={() => setActiveTab("access_logs")}
              className={`ux4g-tab-item cursor-pointer pb-3 text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "access_logs" ? "is-active text-[#0c3866] border-b-2 border-[#0c3866]" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Who Viewed My Data?</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
                {accessLogs.length}
              </span>
              <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                Confidential & Protected
              </span>
            </li>
          </ul>
        </div>

        {/* Tab 1: Requests View (Decluttered: Search + Filter Chips + Cards/Table Toggle + Pagination) */}
        {activeTab === "requests" && (
          <div>
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-7 h-7 border-2 border-[#0c3866] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-500 font-medium">Loading your live requests from secure database...</p>
              </div>
            ) : myRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-4">
                <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">No leave or welfare requests found</h4>
                  <p className="text-xs text-slate-500 mt-1">Submit your first application to initiate standard or fast-track approval.</p>
                </div>
                <Link
                  href="/request"
                  className="ux4g-btn ux4g-btn-primary ux4g-btn-sm inline-flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Submit First Application</span>
                </Link>
              </div>
            ) : (
              <div>
                {/* 30-Day Active Service Window & Historical Archive Banner */}
                <div className="bg-linear-to-r from-blue-50/90 to-indigo-50/70 border-b border-slate-200 px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#0c3866]/10 text-[#0c3866] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                      <Clock className="w-4 h-4 text-[#0c3866]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">Active Service Window (Last 30 Days)</span>
                        <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                          {recentRequests.length} Active in Portal
                        </span>
                        {archivedRequests.length > 0 && (
                          <span className="px-2 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                            {archivedRequests.length} Archived in Logs
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        Only requests from the last 30 days are displayed in active views. Older requests are preserved in historical logs and can be downloaded below.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => downloadArchiveLogs("archive")}
                      disabled={archivedRequests.length === 0 || downloadingLogs}
                      className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm inline-flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
                      title="Download historical logs older than 30 days as CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{downloadingLogs ? "Preparing..." : `Download Archive Logs (${archivedRequests.length})`}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadArchiveLogs("all")}
                      disabled={downloadingLogs}
                      className="ux4g-btn ux4g-btn-outline-neutral ux4g-btn-sm inline-flex items-center gap-1"
                      title="Download complete request ledger as CSV"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline">Full Ledger ({myRequests.length})</span>
                    </button>
                  </div>
                </div>

                {/* View Controls & Filter Header */}
                <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 space-y-3.5">
                  {/* Row 1: Search + View Mode Switcher + Per Page + Action */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* Search bar */}
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={requestSearchQuery}
                        onChange={(e) => {
                          setRequestSearchQuery(e.target.value);
                          setRequestPage(1);
                        }}
                        placeholder="Search Request ID, Category, or Reason..."
                        className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0c3866]/30 focus:border-[#0c3866] placeholder:text-slate-400 text-slate-800 shadow-2xs transition-all"
                      />
                      {requestSearchQuery && (
                        <button
                          onClick={() => {
                            setRequestSearchQuery("");
                            setRequestPage(1);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* View Switcher, Page Size, New Request CTA */}
                    <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                      {/* View Mode Switcher */}
                      <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300/60">
                        <button
                          type="button"
                          onClick={() => setRequestViewMode("cards")}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all ${
                            requestViewMode === "cards"
                              ? "bg-white text-[#0c3866] shadow-2xs font-bold"
                              : "text-slate-600 hover:text-slate-900 font-semibold"
                          }`}
                          title="Cards View (Clean, readable & visual)"
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Cards</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRequestViewMode("table")}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all ${
                            requestViewMode === "table"
                              ? "bg-white text-[#0c3866] shadow-2xs font-bold"
                              : "text-slate-600 hover:text-slate-900 font-semibold"
                          }`}
                          title="Table View (Compact & structured)"
                        >
                          <List className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Table</span>
                        </button>
                      </div>

                      {/* Items per page selector */}
                      <select
                        value={requestPageSize}
                        onChange={(e) => {
                          setRequestPageSize(Number(e.target.value));
                          setRequestPage(1);
                        }}
                        className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-[#0c3866]"
                        title="Items per page"
                      >
                        <option value={6}>6 per page</option>
                        <option value={12}>12 per page</option>
                        <option value={24}>24 per page</option>
                      </select>

                      {/* New Application CTA */}
                      <Link
                        href="/request"
                        className="ux4g-btn ux4g-btn-primary ux4g-btn-sm inline-flex items-center gap-1"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">New Request</span>
                      </Link>
                    </div>
                  </div>

                  {/* Row 2: Status Filter Chips */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                    <span className="text-slate-400 font-semibold text-[11px] flex items-center gap-1 mr-1 shrink-0">
                      <Filter className="w-3 h-3" /> Status:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setRequestStatusFilter("all");
                        setRequestPage(1);
                      }}
                      className={`ux4g-filter-chip-md shrink-0 cursor-pointer ${
                        requestStatusFilter === "all" ? "active" : ""
                      }`}
                    >
                      All Active ({recentRequests.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRequestStatusFilter("pending");
                        setRequestPage(1);
                      }}
                      className={`ux4g-filter-chip-md shrink-0 cursor-pointer ${
                        requestStatusFilter === "pending" ? "active" : ""
                      }`}
                    >
                      Under Review ({pendingCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRequestStatusFilter("fast_lane");
                        setRequestPage(1);
                      }}
                      className={`ux4g-filter-chip-md shrink-0 cursor-pointer flex items-center gap-1.5 ${
                        requestStatusFilter === "fast_lane" ? "active" : ""
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      Fast-Track 12H ({fastLaneCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRequestStatusFilter("approved");
                        setRequestPage(1);
                      }}
                      className={`ux4g-filter-chip-md shrink-0 cursor-pointer ${
                        requestStatusFilter === "approved" ? "active" : ""
                      }`}
                    >
                      Approved ({approvedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRequestStatusFilter("rejected");
                        setRequestPage(1);
                      }}
                      className={`ux4g-filter-chip-md shrink-0 cursor-pointer ${
                        requestStatusFilter === "rejected" ? "active" : ""
                      }`}
                    >
                      Rejected ({rejectedCount})
                    </button>
                  </div>
                </div>

                {/* Filter / Archival Empty State */}
                {recentRequests.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 space-y-4">
                    <Clock className="w-12 h-12 text-slate-300 mx-auto" />
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">No Active Requests in the Last 30 Days</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                        You have {archivedRequests.length} older historical requests safely preserved in offline audit logs.
                      </p>
                    </div>
                    {archivedRequests.length > 0 && (
                      <button
                        type="button"
                        onClick={() => downloadArchiveLogs("archive")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0c3866] hover:bg-[#072648] text-white text-xs font-bold rounded-lg transition-all shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Archived Historical Logs ({archivedRequests.length})</span>
                      </button>
                    )}
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 space-y-3">
                    <FileX className="w-10 h-10 text-slate-300 mx-auto" />
                    <h4 className="font-bold text-slate-700 text-sm">No matching active requests found</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      No active requests matched your filters
                      {requestSearchQuery ? ` or search term "${requestSearchQuery}"` : ""}.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setRequestSearchQuery("");
                        setRequestStatusFilter("all");
                        setRequestPage(1);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset Filters</span>
                    </button>
                  </div>
                ) : requestViewMode === "cards" ? (
                  /* Card Grid View (Clean, Spacious, Informative) */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 p-5 bg-slate-50/30">
                    {paginatedRequests.map((req) => (
                      <div
                        key={req.id}
                        className={`rounded-xl border transition-all p-4.5 flex flex-col justify-between bg-white hover:shadow-md ${
                          req.is_fast_lane
                            ? "border-amber-200/90 hover:border-amber-400 bg-linear-to-b from-amber-50/20 to-white"
                            : "border-slate-200 hover:border-[#0c3866]/40"
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Top Row: Category Icon & Title + Status Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                  req.is_fast_lane ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {getCategoryIcon(req.category || req.request_type, req.is_fast_lane)}
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-slate-900 leading-tight">
                                  {formatCategory(req.category || req.request_type)}
                                </h4>
                                <span className="text-[11px] text-slate-400 block mt-0.5">
                                  Filed on {formatDate(req.filed_at)}
                                </span>
                              </div>
                            </div>
                            <div className="shrink-0">{getStatusBadge(req.status, req.is_fast_lane)}</div>
                          </div>

                          {/* Request ID with 1-Click Copy */}
                          <div className="bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">REQUEST ID</span>
                              <span className="font-bold text-slate-800">#{req.id.slice(0, 8)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(req.id)}
                              title="Copy full Request ID"
                              className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded hover:bg-slate-200/60"
                            >
                              {copiedId === req.id ? (
                                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                                  <Check className="w-3 h-3" /> Copied
                                </span>
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Period & Target Response */}
                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                            <div>
                              <span className="text-slate-400 block text-[10px] font-medium uppercase tracking-wider">
                                Requested Period
                              </span>
                              <span className="font-medium text-slate-700 block truncate">
                                {req.start_date ? formatDate(req.start_date) : "Immediate"}
                                {req.end_date ? ` to ${formatDate(req.end_date)}` : ""}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px] font-medium uppercase tracking-wider">
                                Target Response
                              </span>
                              <span
                                className={`font-semibold block ${
                                  req.is_fast_lane ? "text-amber-800 font-bold" : "text-slate-700"
                                }`}
                              >
                                {req.is_fast_lane ? "12 Hours (Urgent Priority)" : "48 Hours (Standard Review)"}
                              </span>
                            </div>
                          </div>

                          {/* Description snippet if available */}
                          {req.description && (
                            <p className="text-[11px] text-slate-600 line-clamp-2 italic bg-slate-50/70 p-2 rounded border border-slate-100">
                              "{req.description}"
                            </p>
                          )}
                        </div>

                        {/* Card Action Footer */}
                        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-medium">
                            {req.status === "approved"
                              ? "Order Dispatched"
                              : req.status === "rejected"
                              ? "Decision Finalized"
                              : "Under Officer Review"}
                          </span>
                          <Link
                            href={`/track?id=${req.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0c3866] hover:bg-[#072648] text-white text-xs font-bold rounded-lg transition-all shadow-xs active-press"
                          >
                            <span>Track Live</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Compact Modern Table View (Streamlined, Formatted Dates & Copyable Request IDs) */
                  <div className="overflow-x-auto">
                    <table className="ux4g-table ux4g-table-m ux4g-table-column-dividers w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-3 px-4">Request ID</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Filing Date</th>
                          <th className="py-3 px-4">Requested Period</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {paginatedRequests.map((req, idx) => (
                          <tr
                            key={req.id}
                            className={`transition-colors hover:bg-slate-50/80 ${
                              idx % 2 === 1 ? "bg-slate-50/30" : "bg-white"
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="font-bold text-slate-900">#{req.id.slice(0, 8)}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(req.id)}
                                  className="text-slate-400 hover:text-slate-700 p-0.5"
                                  title="Copy Request ID"
                                >
                                  {copiedId === req.id ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                                    req.is_fast_lane ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {getCategoryIcon(req.category || req.request_type, req.is_fast_lane)}
                                </div>
                                <span className="font-semibold text-slate-900">
                                  {formatCategory(req.category || req.request_type)}
                                </span>
                                {req.is_fast_lane && (
                                  <span className="ux4g-tag-tonal-warning ux4g-tag-s font-bold text-[10px]">
                                    FAST-LANE
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                              {formatDate(req.filed_at)}
                            </td>
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              {req.start_date ? formatDate(req.start_date) : "Immediate"}
                              {req.end_date ? ` → ${formatDate(req.end_date)}` : ""}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">{getStatusBadge(req.status, req.is_fast_lane)}</td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <Link
                                href={`/track?id=${req.id}`}
                                className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-xs inline-flex items-center gap-1"
                              >
                                <span>Track</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination Controls Footer */}
                {totalRequestPages > 1 && (
                  <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                    <div>
                      Showing <span className="font-bold text-slate-900">{(currentRequestPage - 1) * requestPageSize + 1}</span> to{" "}
                      <span className="font-bold text-slate-900">
                        {Math.min(currentRequestPage * requestPageSize, filteredRequests.length)}
                      </span>{" "}
                      of <span className="font-bold text-slate-900">{filteredRequests.length}</span> active requests
                      {filteredRequests.length !== recentRequests.length && (
                        <span className="text-slate-400 ml-1">
                          (filtered from {recentRequests.length} active)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRequestPage(1)}
                        disabled={currentRequestPage === 1}
                        className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        title="First page"
                      >
                        <ChevronsLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRequestPage((p) => Math.max(1, p - 1))}
                        disabled={currentRequestPage === 1}
                        className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Prev</span>
                      </button>

                      {/* Page Numbers */}
                      <div className="flex items-center gap-1 px-1">
                        {Array.from({ length: Math.min(5, totalRequestPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalRequestPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentRequestPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentRequestPage >= totalRequestPages - 2) {
                            pageNum = totalRequestPages - 4 + i;
                          } else {
                            pageNum = currentRequestPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setRequestPage(pageNum)}
                              className={`w-7 h-7 rounded-md text-xs font-bold transition-all ${
                                currentRequestPage === pageNum
                                  ? "bg-[#0c3866] text-white shadow-2xs"
                                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => setRequestPage((p) => Math.min(totalRequestPages, p + 1))}
                        disabled={currentRequestPage === totalRequestPages}
                        className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 transition-colors"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRequestPage(totalRequestPages)}
                        disabled={currentRequestPage === totalRequestPages}
                        className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        title="Last page"
                      >
                        <ChevronsRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Who Viewed My Data? Access Transparency Log (Also paginated & searchable) */}
        {activeTab === "access_logs" && (
          <div className="space-y-4 p-5 sm:p-6">
            {/* Reassuring Statutory Guarantee Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <h4 className="font-bold text-emerald-900 font-heading">
                  Your Privacy is Protected (Strict Welfare Confidentiality)
                </h4>
                <p className="text-emerald-800 leading-relaxed">
                  Your voluntary self-assessment logs and private wellbeing check-ins are strictly confidential.
                  Commanders cannot view your personal check-in answers or emotional scores.
                  Below is the clear record of authorized officers who accessed your file for official welfare purposes.
                </p>
              </div>
            </div>

            {/* Access Log Search & Filter Controls */}
            {accessLogs.length > 0 && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={logSearchQuery}
                    onChange={(e) => {
                      setLogSearchQuery(e.target.value);
                      setLogPage(1);
                    }}
                    placeholder="Search accessor officer, role, or purpose..."
                    className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0c3866]/30 text-slate-800"
                  />
                  {logSearchQuery && (
                    <button
                      onClick={() => {
                        setLogSearchQuery("");
                        setLogPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-xs text-slate-500">
                  Total logged accesses: <strong className="text-slate-800">{accessLogs.length}</strong>
                </div>
              </div>
            )}

            {accessLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs">No outside access events recorded for your personnel record.</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <FileX className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs">No access logs matched "{logSearchQuery}".</p>
                <button
                  type="button"
                  onClick={() => setLogSearchQuery("")}
                  className="text-xs text-[#0c3866] underline font-semibold"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="ux4g-table ux4g-table-m ux4g-table-column-dividers w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">Timestamp</th>
                        <th className="py-2.5 px-4">Officer / Accessor</th>
                        <th className="py-2.5 px-4">Role</th>
                        <th className="py-2.5 px-4">Official Purpose</th>
                        <th className="py-2.5 px-4 text-right">Record Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {paginatedLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                            {log.timestamp ? formatDate(log.timestamp) + " " + new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recent"}
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
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Verified Secure
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Log Pagination */}
                {totalLogPages > 1 && (
                  <div className="px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-between text-xs text-slate-600">
                    <span>
                      Showing {(currentLogPage - 1) * logPageSize + 1}–
                      {Math.min(currentLogPage * logPageSize, filteredLogs.length)} of{" "}
                      {filteredLogs.length} logs
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                        disabled={currentLogPage === 1}
                        className="px-2 py-1 rounded bg-white border border-slate-300 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span className="px-2 font-bold text-slate-800">
                        {currentLogPage} / {totalLogPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setLogPage((p) => Math.min(totalLogPages, p + 1))}
                        disabled={currentLogPage === totalLogPages}
                        className="px-2 py-1 rounded bg-white border border-slate-300 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: Daily Wellbeing Check-in Modal */}
      {showCheckinModal && (
        <div className="ux4g-modal-backdrop ux4g-modal-backdrop-50 fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="ux4g-modal-box ux4g-modal-m bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200 animate-scale-in">
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

                {/* Voluntary Check-in Guarantee */}
                <div className="p-3 rounded-lg bg-blue-50/90 border border-blue-200/90 space-y-2 text-[11px] text-blue-950">
                  <div className="flex items-center gap-1.5 font-bold text-[#0c3866]">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Voluntary Check-in Guarantee</span>
                  </div>
                  <p className="text-slate-600 leading-normal">
                    This daily check-in is 100% voluntary and confidential. Your answers are strictly protected by welfare law and cannot be used for any disciplinary action, performance review, or leave penalty.
                  </p>
                  <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={voluntaryConsent}
                      onChange={(e) => setVoluntaryConsent(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-[#0c3866] focus:ring-[#0c3866] w-4 h-4 accent-[#0c3866]"
                    />
                    <span className="font-semibold text-slate-800 leading-tight">
                      I confirm that I am submitting this daily wellbeing pulse voluntarily for supportive welfare monitoring.
                    </span>
                  </label>
                </div>

                {/* Non-Clinical Decision Support Disclaimer Badge */}
                <div className="text-[10px] text-slate-500 flex items-center gap-1.5 bg-slate-50 p-2 rounded border border-slate-200">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    <strong>Supportive Decision Aid:</strong> This check-in measures operational fatigue patterns to help ensure proper rest rotation. It does not provide psychiatric diagnoses.
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCheckinModal(false);
                      setVoluntaryConsent(false);
                    }}
                    className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    Skip Today (No Penalty)
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCheckinModal(false);
                        setVoluntaryConsent(false);
                      }}
                      className="px-4 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={checkinSubmitting || !voluntaryConsent}
                      className={`px-5 py-2 font-bold rounded-md shadow-xs flex items-center gap-1.5 transition-all ${
                        !voluntaryConsent
                          ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                          : "bg-[#0c3866] hover:bg-[#072648] text-white cursor-pointer active-press"
                      }`}
                      title={!voluntaryConsent ? "Please check the voluntary consent box to proceed" : "Submit your daily pulse"}
                    >
                      {checkinSubmitting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Submit Daily Pulse</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}


      {/* MODAL 2: Data Correction / Discrepancy Dispute Modal */}
      {showCorrectionModal && (
        <div className="ux4g-modal-backdrop ux4g-modal-backdrop-50 fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="ux4g-modal-box ux4g-modal-m bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200 animate-scale-in">
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
                    <span>Dispute Registered (48-Hour Review)</span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    Tracking ID: <strong className="font-mono">{correctionResult.tracking_id}</strong>
                  </p>
                  <p className="text-xs text-emerald-700">
                    Expected Review: <strong>{new Date(correctionResult.sla_deadline).toLocaleString()}</strong>
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
                    <span>Submit Dispute (48h Review)</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: Data Deletion / Redaction Request Modal */}
      {showDeletionModal && (
        <div className="ux4g-modal-backdrop ux4g-modal-backdrop-50 fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="ux4g-modal-box ux4g-modal-m bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-base text-slate-900 font-heading">
                  Clear Voluntary Check-in Notes
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowDeletionModal(false);
                  setDeletionResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {deletionResult ? (
              <div className="py-6 space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Request Registered (72h Resolution)</span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    Tracking ID: <strong className="font-mono">{deletionResult.tracking_id}</strong>
                  </p>
                  <p className="text-xs text-emerald-700">
                    Expected Completion: <strong>{new Date(deletionResult.sla_deadline).toLocaleString()}</strong>
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    {deletionResult.message}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDeletionModal(false);
                    setDeletionResult(null);
                  }}
                  className="w-full py-2 bg-[#0c3866] text-white text-xs font-bold rounded-md cursor-pointer"
                >
                  Close Receipt
                </button>
              </div>
            ) : (
              <form onSubmit={handleDeletionSubmit} className="space-y-3.5 text-xs">
                <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-950 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>What Can Be Cleared</span>
                  </div>
                  <p className="text-amber-900/90 leading-normal">
                    You have the full right to remove your voluntary check-ins, sleep notes, and personal feedback. Official duty rosters and parade attendance records are preserved for unit duty.
                  </p>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Data Category to Clear</label>
                  <select
                    value={deletionCategory}
                    onChange={(e) => setDeletionCategory(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-rose-600 outline-hidden"
                  >
                    <option value="voluntary_self_reports">Daily Pulse Notes & Voluntary Check-ins</option>
                    <option value="daily_wellness_pulse">Past Daily Sleep & Rest Quality Scores</option>
                    <option value="informal_feedback">Personal Notes & Follow-up Reflections</option>
                    <option value="all_voluntary_telemetry">All Voluntary Notes & Feedback Records</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Timeframe</label>
                  <select
                    value={deletionTimeframe}
                    onChange={(e) => setDeletionTimeframe(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-rose-600 outline-hidden"
                  >
                    <option value="prior_to_last_30_days">Records Older Than 30 Days</option>
                    <option value="all_historical">All Historical Voluntary Records</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Reason for Request</label>
                  <textarea
                    rows={2}
                    value={deletionReason}
                    onChange={(e) => setDeletionReason(e.target.value)}
                    placeholder="E.g. Clearing old personal notes and feedback."
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-rose-600 outline-hidden"
                    required
                  />
                </div>

                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={deletionAffirmation}
                      onChange={(e) => setDeletionAffirmation(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-600 w-4 h-4 accent-rose-600"
                    />
                    <span className="text-[11px] text-slate-700 leading-tight">
                      I understand that official unit duty rosters and muster rolls are preserved for operational records and cannot be cleared.
                    </span>
                  </label>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowDeletionModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deletionSubmitting || !deletionAffirmation}
                    className={`px-5 py-2 font-bold rounded-md shadow-xs flex items-center gap-1.5 transition-all ${
                      !deletionAffirmation
                        ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                        : "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer active-press"
                    }`}
                  >
                    {deletionSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Submit Request (72h Review)</span>
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

