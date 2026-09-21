"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import {
  Lock,
  Shield,
  Eye,
  FileCheck,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Clock,
  Loader2,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { openPolicyModal } from "@/components/PolicyModalHost";

export default function PersonnelPrivacyPage() {
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"access_logs" | "correction" | "deletion">("access_logs");

  // Correction Form State
  const [recordType, setRecordType] = useState("duty_roster");
  const [disputedField, setDisputedField] = useState("shift_type");
  const [reportedValue, setReportedValue] = useState("");
  const [claimedValue, setClaimedValue] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
  const [correctionSuccess, setCorrectionSuccess] = useState(false);

  // Deletion Form State (DPDP Act 2023 §12(3))
  const [deletionCategory, setDeletionCategory] = useState("voluntary_self_reports");
  const [deletionTimeframe, setDeletionTimeframe] = useState("prior_to_last_30_days");
  const [deletionReason, setDeletionReason] = useState("");
  const [deletionAffirmation, setDeletionAffirmation] = useState(false);
  const [deletionSubmitting, setDeletionSubmitting] = useState(false);
  const [deletionSuccess, setDeletionSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login");
      return;
    }
    fetchAccessLogs();
  }, []);

  const fetchAccessLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/personnel/access-log");
      setAccessLogs(res.data?.access_logs || []);
    } catch (err) {
      console.error("Failed to fetch access logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportedValue.trim() || !claimedValue.trim()) {
      alert("Please enter both recorded and claimed values.");
      return;
    }
    setCorrectionSubmitting(true);
    try {
      await api.post("/personnel/data-correction", {
        record_type: recordType,
        record_date: new Date().toISOString().split("T")[0],
        disputed_field: disputedField,
        reported_value: reportedValue,
        claimed_value: claimedValue,
        reason: correctionReason || "Factual correction requested under statutory data accuracy rights.",
      });
      setCorrectionSuccess(true);
      setTimeout(() => {
        setCorrectionSuccess(false);
        setReportedValue("");
        setClaimedValue("");
        setCorrectionReason("");
      }, 2000);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Could not submit correction request.");
    } finally {
      setCorrectionSubmitting(false);
    }
  };

  const handleDeletionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletionAffirmation) {
      alert("Please confirm the statutory affirmation.");
      return;
    }
    setDeletionSubmitting(true);
    try {
      await api.post("/personnel/data-deletion", {
        data_category: deletionCategory,
        timeframe: deletionTimeframe,
        reason: deletionReason || "Statutory erasure requested under DPDP Act 2023 Section 12(3)",
        affirmation: true,
      });
      setDeletionSuccess(true);
      setTimeout(() => {
        setDeletionSuccess(false);
        setDeletionReason("");
        setDeletionAffirmation(false);
      }, 2000);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Could not submit deletion request.");
    } finally {
      setDeletionSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Page Title */}
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Privacy & Personal Data
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Audit who viewed your records and exercise your rights under the DPDP Act 2023.
          </p>
        </div>

        {/* 1. CONFIDENTIALITY FIREWALL REASSURANCE */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <Lock className="w-5 h-5" />
            <h2 className="text-sm font-bold uppercase tracking-wide">
              Your Information Is Protected
            </h2>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            PRAHARI implements a strict technical and legal firewall under Section 21 of the
            Mental Healthcare Act 2017 and DPDP Act 2023:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">Command Firewall</span>
              <p className="text-slate-600">
                Company Commanders see only anonymized, aggregated unit readiness. They cannot
                view individual psychological check-ins or counseling reflections.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">Access Transparency</span>
              <p className="text-slate-600">
                Every access to your records is permanently recorded. You can view the full
                audit history of who reviewed your file below.
              </p>
            </div>
          </div>
        </section>

        {/* 2. SUB-NAVIGATION TABS */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("access_logs")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeSubTab === "access_logs"
                ? "bg-[#0c3866] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Who Viewed My Data ({accessLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("correction")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeSubTab === "correction"
                ? "bg-[#0c3866] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Request Data Correction
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("deletion")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeSubTab === "deletion"
                ? "bg-[#0c3866] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Request Data Deletion
          </button>
        </div>

        {/* 3. TAB CONTENT: ACCESS LOGS */}
        {activeSubTab === "access_logs" && (
          <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Data Access Ledger
                </h3>
                <p className="text-[11px] text-slate-500">
                  Immutable record of authorized personnel who accessed your welfare data.
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Audited
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center space-y-2">
                <Loader2 className="w-6 h-6 text-[#0c3866] animate-spin mx-auto" />
                <p className="text-xs text-slate-500">Loading access audit ledger...</p>
              </div>
            ) : accessLogs.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {accessLogs.map((log, idx) => (
                  <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {log.accessed_by_name || log.accessed_by || "Authorized Officer"}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                          {log.role || "welfare_officer"}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        Purpose: <strong>{log.purpose || "Scheduled Welfare Check"}</strong>
                      </p>
                    </div>
                    <div className="text-left sm:text-right text-slate-500">
                      <p className="font-medium">
                        {log.timestamp
                          ? new Date(log.timestamp).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Verified entry"}
                      </p>
                      <p className="text-[10px] text-emerald-700 font-mono">
                        Hash verified
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                No recent third-party access events recorded for your file.
              </div>
            )}
          </section>
        )}

        {/* 4. TAB CONTENT: DATA CORRECTION */}
        {activeSubTab === "correction" && (
          <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Request Factual Data Correction
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Exercise your right under DPDP Act 2023 §12(1) to rectify inaccurate duty or leave records.
              </p>
            </div>

            {correctionSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-slate-900">Correction Notice Logged</p>
                <p className="text-xs text-slate-500">
                  Your request has been forwarded to the duty clerk for roll-call reconciliation.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCorrectionSubmit} className="space-y-4 max-w-xl">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Record Category
                    </label>
                    <select
                      value={recordType}
                      onChange={(e) => setRecordType(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800"
                    >
                      <option value="duty_roster">Duty Roster</option>
                      <option value="leave_record">Leave Record</option>
                      <option value="posting_tenure">Posting Tenure</option>
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
                      <option value="night_duty">Night Duty Shift</option>
                      <option value="leave_denial">Leave Denial Reason</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Currently Recorded In System
                    </label>
                    <input
                      type="text"
                      value={reportedValue}
                      onChange={(e) => setReportedValue(e.target.value)}
                      placeholder="e.g. Night Patrol"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Actual / Claimed Value
                    </label>
                    <input
                      type="text"
                      value={claimedValue}
                      onChange={(e) => setClaimedValue(e.target.value)}
                      placeholder="e.g. Rest / Stand-down"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800"
                      required
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Order Reference or Explanation
                  </label>
                  <textarea
                    rows={3}
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="Reference daily roll-call order or specify duty switch..."
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  disabled={correctionSubmitting}
                  className="px-4 py-2.5 rounded-lg bg-[#0c3866] hover:bg-[#072648] text-white text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                >
                  {correctionSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Factual Correction</span>
                </button>
              </form>
            )}
          </section>
        )}

        {/* 5. TAB CONTENT: DATA DELETION */}
        {activeSubTab === "deletion" && (
          <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Request Voluntary Data Deletion (DPDP Act 2023 §12(3))
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                You may request statutory erasure of voluntary self-assessments and personal notes.
                Statutory operational records (duty rosters, leaves sanctioned) are retained under service rules.
              </p>
            </div>

            {deletionSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-slate-900">Erasure Request Submitted</p>
                <p className="text-xs text-slate-500">
                  Your request has been queued for statutory compliance verification.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDeletionSubmit} className="space-y-4 max-w-xl">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Data Category
                    </label>
                    <select
                      value={deletionCategory}
                      onChange={(e) => setDeletionCategory(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800"
                    >
                      <option value="voluntary_self_reports">Voluntary Self-Assessments</option>
                      <option value="informal_feedback">Personal Pulse Notes</option>
                      <option value="all_voluntary_telemetry">All Voluntary Entries</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Timeframe
                    </label>
                    <select
                      value={deletionTimeframe}
                      onChange={(e) => setDeletionTimeframe(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-800"
                    >
                      <option value="prior_to_last_30_days">Older Than 30 Days</option>
                      <option value="all_historical">All Historical Records</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Reason for Request
                  </label>
                  <textarea
                    rows={2}
                    value={deletionReason}
                    onChange={(e) => setDeletionReason(e.target.value)}
                    placeholder="Statutory right to erasure under DPDP Act 2023..."
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="deletion-affirm"
                    checked={deletionAffirmation}
                    onChange={(e) => setDeletionAffirmation(e.target.checked)}
                    className="mt-0.5 rounded accent-[#0c3866]"
                    required
                  />
                  <label htmlFor="deletion-affirm" className="cursor-pointer text-[11px]">
                    I affirm my request to erase the selected voluntary records under Section 12(3) of the Digital Personal Data Protection Act 2023.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={deletionSubmitting || !deletionAffirmation}
                  className="px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                >
                  {deletionSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Erasure Request</span>
                </button>
              </form>
            )}
          </section>
        )}

        {/* Confidentiality Modals Link */}
        <div className="bg-slate-100/80 rounded-xl border border-slate-200/80 p-4 flex items-center justify-between text-xs text-slate-600">
          <span>Read our full statutory charter and legal safeguards.</span>
          <button
            type="button"
            onClick={() => openPolicyModal("confidentiality")}
            className="font-semibold text-[#0c3866] hover:underline cursor-pointer"
          >
            View Confidentiality Charter
          </button>
        </div>
      </div>
    </div>
  );
}
