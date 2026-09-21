"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { useDataSync } from "@/lib/useDataSync";
import {
  formatCategory,
  formatStatus,
  formatRequestId,
  formatDescription,
  formatWellbeingStatus,
} from "@/lib/formatters";
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  FileText,
  HeartHandshake,
  AlertTriangle,
  FileSpreadsheet,
  ChevronRight,
  Sparkles,
  PhoneCall,
  X,
  Send,
  Loader2,
  Lock,
} from "lucide-react";

export default function PersonnelHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [wellbeing, setWellbeing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Quick Action Modal states
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // Discrepancy form state
  const [recordType, setRecordType] = useState("duty_roster");
  const [disputedField, setDisputedField] = useState("shift_type");
  const [reportedValue, setReportedValue] = useState("Night Patrol");
  const [claimedValue, setClaimedValue] = useState("Rest / Stand-down");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
  const [correctionSuccess, setCorrectionSuccess] = useState(false);

  // Emergency form state
  const [emergencyReason, setEmergencyReason] = useState("");
  const [emergencyDestination, setEmergencyDestination] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencySubmitting, setEmergencySubmitting] = useState(false);
  const [emergencySuccess, setEmergencySuccess] = useState<string | null>(null);

  // Real-time synchronization: silently refresh data on backend mutations
  useDataSync({
    onGrievanceChange: () => {
      loadPortalData(false);
    },
    onAssessmentChange: () => {
      loadPortalData(false);
    },
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login");
      return;
    }
    const currentUser = getStoredUser();
    setUser(currentUser);

    // Redirect officers/commanders to their specialized interfaces
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

    loadPortalData(true);
  }, []);

  const loadPortalData = async (showSpinner: boolean = true) => {
    if (showSpinner) setLoading(true);
    try {
      const [profileRes, requestsRes, wellbeingRes] = await Promise.allSettled([
        api.get("/auth/me"),
        api.get("/grievance/my-requests"),
        api.get("/personnel/my-wellbeing"),
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
    } catch (err) {
      console.error("Failed to load personnel portal data:", err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  // Submit Discrepancy / Correction
  const handleDiscrepancySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCorrectionSubmitting(true);
    try {
      await api.post("/personnel/data-correction", {
        record_type: recordType,
        record_date: new Date().toISOString().split("T")[0],
        disputed_field: disputedField,
        reported_value: reportedValue,
        claimed_value: claimedValue,
        reason: correctionReason || "Factual correction requested per company rest orders.",
      });
      setCorrectionSuccess(true);
      setTimeout(() => {
        setCorrectionSuccess(false);
        setShowDiscrepancyModal(false);
        setCorrectionReason("");
      }, 1500);
      await loadPortalData(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Could not submit discrepancy report.");
    } finally {
      setCorrectionSubmitting(false);
    }
  };

  // Submit Family Emergency Request
  const handleEmergencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyReason.trim()) {
      alert("Please describe the nature of the emergency.");
      return;
    }
    setEmergencySubmitting(true);
    try {
      const res = await api.post("/grievance/file", {
        request_type: "leave",
        category: "family_emergency",
        description: `Family Emergency: ${emergencyReason} (Destination: ${emergencyDestination || "Home"}, Contact: ${emergencyContact || "On file"})`,
        filing_channel: "pwa",
        is_fast_lane: true,
      });
      const generatedId = formatRequestId(res.data?.id || res.data?.reference_number);
      setEmergencySuccess(generatedId);
      setTimeout(() => {
        setEmergencySuccess(null);
        setShowEmergencyModal(false);
        setEmergencyReason("");
        setEmergencyDestination("");
        setEmergencyContact("");
      }, 2000);
      await loadPortalData(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Could not submit emergency request.");
    } finally {
      setEmergencySubmitting(false);
    }
  };

  // Time-of-day greeting helper
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Personnel details
  const firstName =
    profile?.name?.split(" ")[0] ||
    user?.name?.split(" ")[0] ||
    user?.username ||
    "Rajesh";
  const unitName = profile?.unit_name || user?.unit_name || "Alpha Company";
  const tradeOrRank = profile?.trade || profile?.rank || user?.trade || "General Duty";

  // Active / in-progress request (first pending or fast-tracked request)
  const activeRequest = myRequests.find(
    (r) =>
      r.status === "filed" ||
      r.status === "pending" ||
      r.status === "in_progress" ||
      r.status === "fast_tracked" ||
      r.is_fast_lane
  );

  // Recent completed or closed requests (up to 2)
  const recentActivities = myRequests
    .filter((r) => r.id !== activeRequest?.id)
    .slice(0, 2);

  // Formatted wellbeing status
  const wellbeingStatus = formatWellbeingStatus(
    wellbeing?.wellbeing_status,
    wellbeing?.risk_level
  );

  if (loading && !profile) {
    return (
      <div className="py-24 px-4 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="w-8 h-8 text-[#0c3866] animate-spin" />
        <p className="text-xs text-slate-500 font-medium">
          Loading your personnel portal...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* =======================================================
            SECTION A: WELCOME
            ======================================================= */}
        <section className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-sm font-medium text-slate-600">
            {unitName} &bull; {tradeOrRank}
          </p>
        </section>

        {/* =======================================================
            SECTION B: YOUR WELLBEING
            ======================================================= */}
        <section
          aria-labelledby="wellbeing-heading"
          className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-colors"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Your Wellbeing
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${wellbeingStatus.colorClass}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${wellbeingStatus.dotColor}`}
                    aria-hidden="true"
                  />
                  {wellbeingStatus.label}
                </span>
              </div>
              <p className="text-sm text-slate-700 max-w-xl leading-relaxed">
                {wellbeingStatus.description}
              </p>
            </div>

            <Link
              href="/portal/wellbeing"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors shrink-0"
            >
              <span>View wellbeing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* =======================================================
            SECTION C: QUICK ACTIONS (WHAT DO YOU NEED?)
            ======================================================= */}
        <section aria-labelledby="quick-actions-heading" className="space-y-3">
          <h2
            id="quick-actions-heading"
            className="text-xs font-bold uppercase tracking-wider text-slate-500"
          >
            What do you need?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Apply Leave */}
            <Link
              href="/request?type=leave"
              className="flex flex-col justify-between p-4 rounded-xl bg-white border border-slate-200 hover:border-[#0c3866]/40 hover:shadow-xs transition-all group cursor-pointer text-left"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#0c3866] flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0c3866] transition-colors">
                    Apply Leave
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Annual, casual, or compensatory
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-[#0c3866] gap-1">
                <span>Start</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            {/* 2. Welfare Support */}
            <Link
              href="/request?type=welfare"
              className="flex flex-col justify-between p-4 rounded-xl bg-white border border-slate-200 hover:border-[#0c3866]/40 hover:shadow-xs transition-all group cursor-pointer text-left"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                    Welfare Support
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Confidential assistance & advice
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-purple-700 gap-1">
                <span>Request</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            {/* 3. Family Emergency */}
            <button
              type="button"
              onClick={() => setShowEmergencyModal(true)}
              className="flex flex-col justify-between p-4 rounded-xl bg-white border border-rose-200 hover:border-rose-400 hover:shadow-xs transition-all group cursor-pointer text-left"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-900 group-hover:text-rose-700 transition-colors">
                    Family Emergency
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    12-hour response target
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-rose-700 gap-1">
                <span>Fast-track</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            {/* 4. Report a Discrepancy */}
            <button
              type="button"
              onClick={() => setShowDiscrepancyModal(true)}
              className="flex flex-col justify-between p-4 rounded-xl bg-white border border-slate-200 hover:border-[#0c3866]/40 hover:shadow-xs transition-all group cursor-pointer text-left"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                    Report Discrepancy
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Correct duty roster or rest hours
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-amber-800 gap-1">
                <span>Report</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        </section>

        {/* =======================================================
            SECTION D: ACTIVE REQUEST
            ======================================================= */}
        <section aria-labelledby="active-request-heading" className="space-y-3">
          <h2
            id="active-request-heading"
            className="text-xs font-bold uppercase tracking-wider text-slate-500"
          >
            Active Request
          </h2>

          {activeRequest ? (
            <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">
                      {formatCategory(
                        activeRequest.category || activeRequest.request_type
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      Under review
                    </span>
                    {activeRequest.is_fast_lane && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        12H Fast-track
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500">
                    Submitted {activeRequest.filed_at ? "recently" : "today"} &bull;{" "}
                    {activeRequest.is_fast_lane
                      ? "Expected response within 12 hours"
                      : "Expected response within 48 hours"}
                  </p>

                  <p className="text-xs text-slate-600 pt-1 line-clamp-1">
                    {formatDescription(activeRequest.description)}
                  </p>
                </div>

                <Link
                  href={`/portal/requests?id=${activeRequest.id}`}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#0c3866] hover:bg-[#072648] text-white text-xs font-semibold transition-colors shrink-0"
                >
                  <span>Track request</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-slate-600 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-slate-800">
                  No active requests
                </p>
                <p className="text-xs text-slate-500">
                  Your duty schedule and leave records are up to date.
                </p>
              </div>
              <Link
                href="/portal/requests"
                className="text-xs font-semibold text-[#0c3866] hover:underline"
              >
                View request history
              </Link>
            </div>
          )}
        </section>

        {/* =======================================================
            SECTION E: RECENT ACTIVITY
            ======================================================= */}
        <section aria-labelledby="recent-activity-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              id="recent-activity-heading"
              className="text-xs font-bold uppercase tracking-wider text-slate-500"
            >
              Recent Activity
            </h2>
            <Link
              href="/portal/requests"
              className="text-xs font-semibold text-[#0c3866] hover:underline inline-flex items-center gap-1"
            >
              <span>View all requests</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {recentActivities.length > 0 ? (
              recentActivities.map((item) => {
                const isApproved = item.status === "approved";
                const isRejected = item.status === "rejected";

                return (
                  <Link
                    key={item.id}
                    href={`/portal/requests?id=${item.id}`}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors group cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-[#0c3866] transition-colors">
                          {formatCategory(item.category || item.request_type)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isApproved
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : isRejected
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {formatStatus(item.status)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {item.start_date
                          ? `${item.start_date} – ${item.end_date || "Open"}`
                          : `Submitted ${formatRequestId(item.id, item.filed_at)}`}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </Link>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-500">
                No previous requests recorded.
              </div>
            )}
          </div>
        </section>

        {/* =======================================================
            SECTION F: PRIVACY REASSURANCE
            ======================================================= */}
        <section
          aria-label="Privacy guarantee"
          className="bg-slate-100/80 rounded-xl border border-slate-200/80 p-4 flex items-start gap-3 text-slate-600 text-xs"
        >
          <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-800">
              Protected by Section 21 MHCA 2017 & DPDP Act 2023
            </p>
            <p className="text-slate-500 leading-relaxed">
              Your individual wellbeing assessments and personal notes are confidential.
              Commanding officers see only aggregate unit-level rest readiness.
            </p>
          </div>
        </section>
      </div>

      {/* =======================================================
          MODAL 1: REPORT A DISCREPANCY
          ======================================================= */}
      {showDiscrepancyModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Report a Discrepancy
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDiscrepancyModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {correctionSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-slate-900">
                  Discrepancy Report Submitted
                </p>
                <p className="text-xs text-slate-500">
                  Your correction notice has been forwarded to the company duty officer.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDiscrepancySubmit} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Notice an error in your recorded shifts or leave balance? Submit a
                  factual correction request.
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Record Type
                    </label>
                    <select
                      value={recordType}
                      onChange={(e) => setRecordType(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800"
                    >
                      <option value="duty_roster">Duty Roster</option>
                      <option value="leave_record">Leave Record</option>
                      <option value="shift_hours">Shift Hours</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Disputed Item
                    </label>
                    <select
                      value={disputedField}
                      onChange={(e) => setDisputedField(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800"
                    >
                      <option value="shift_type">Shift Type</option>
                      <option value="hours_worked">Hours Worked</option>
                      <option value="night_duty">Night Shift Log</option>
                      <option value="leave_balance">Leave Balance</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Currently Recorded
                    </label>
                    <input
                      type="text"
                      value={reportedValue}
                      onChange={(e) => setReportedValue(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800"
                      placeholder="e.g. Night Patrol"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Actual / Claimed
                    </label>
                    <input
                      type="text"
                      value={claimedValue}
                      onChange={(e) => setClaimedValue(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800"
                      placeholder="e.g. Rest / Stand-down"
                      required
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Details / Order Reference (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="Briefly state the daily order or officer remark regarding this shift..."
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowDiscrepancyModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={correctionSubmitting}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0c3866] hover:bg-[#072648] text-white disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {correctionSubmitting && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    <span>Submit Correction</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =======================================================
          MODAL 2: FAMILY EMERGENCY FAST-TRACK (12H)
          ======================================================= */}
      {showEmergencyModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white rounded-2xl border border-rose-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Family Emergency Assistance
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEmergencyModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {emergencySuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-slate-900">
                  Emergency Request Logged
                </p>
                <p className="text-xs font-mono font-bold text-[#0c3866]">
                  ID: {emergencySuccess}
                </p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Routed to Welfare Officer & Company Commander with a 12-hour response target.
                </p>
              </div>
            ) : (
              <form onSubmit={handleEmergencySubmit} className="space-y-4">
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
                  <p className="font-bold">Urgent Welfare Assistance</p>
                  <p className="text-rose-800 leading-relaxed">
                    For sudden medical or home crises. Response target:{" "}
                    <strong>Within 12 hours</strong>. Your request is routed directly
                    through the authorized welfare chain.
                  </p>
                </div>

                <div className="text-xs space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Nature of Emergency
                  </label>
                  <textarea
                    rows={3}
                    value={emergencyReason}
                    onChange={(e) => setEmergencyReason(e.target.value)}
                    placeholder="Briefly describe the emergency requiring urgent leave or support..."
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Home / Travel Destination
                    </label>
                    <input
                      type="text"
                      value={emergencyDestination}
                      onChange={(e) => setEmergencyDestination(e.target.value)}
                      placeholder="e.g. Rohtak, Haryana"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowEmergencyModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={emergencySubmitting}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {emergencySubmitting && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    <span>Submit Fast-Track Request</span>
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
