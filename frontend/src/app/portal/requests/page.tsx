"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { useDataSync } from "@/lib/useDataSync";
import {
  formatCategory,
  formatStatus,
  formatRequestId,
  formatDescription,
} from "@/lib/formatters";
import {
  Search,
  Plus,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  PhoneCall,
  Download,
  Calendar,
  Shield,
  Loader2,
  Archive,
  Filter,
} from "lucide-react";

function PersonnelRequestsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");

  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(initialId);
  const [filterTab, setFilterTab] = useState<"all" | "active" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Real-time synchronization
  useDataSync({
    onGrievanceChange: () => {
      fetchRequests(false);
    },
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login");
      return;
    }
    fetchRequests(true);
  }, []);

  useEffect(() => {
    if (initialId) {
      setSelectedRequestId(initialId);
    }
  }, [initialId]);

  const fetchRequests = async (showSpinner: boolean = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await api.get("/grievance/my-requests");
      setRequests(res.data || []);
    } catch (err) {
      console.error("Failed to load requests:", err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

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

  // Active vs Archived split
  const currentRequests = requests.filter((r) => isWithinLast30Days(r.filed_at));
  const archivedRequests = requests.filter((r) => !isWithinLast30Days(r.filed_at));

  // Filter list by tab & search query
  const targetPool = showArchive ? archivedRequests : currentRequests;
  const filteredRequests = targetPool.filter((r) => {
    const isCompleted = r.status === "approved" || r.status === "rejected" || r.status === "closed";
    if (filterTab === "active" && isCompleted) return false;
    if (filterTab === "completed" && !isCompleted) return false;

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const title = formatCategory(r.category || r.request_type).toLowerCase();
    const reqId = formatRequestId(r.id, r.filed_at).toLowerCase();
    const desc = (r.description || "").toLowerCase();
    return title.includes(query) || reqId.includes(query) || desc.includes(query);
  });

  // Selected request details
  const selectedRequest = requests.find((r) => r.id === selectedRequestId);

  const downloadHistoryCSV = () => {
    setDownloading(true);
    try {
      if (requests.length === 0) {
        alert("No requests to export.");
        return;
      }
      const headers = ["Request ID", "Type", "Status", "Date Filed", "Expected Response", "Description"];
      const rows = requests.map((r) => [
        formatRequestId(r.id, r.filed_at),
        `"${formatCategory(r.category || r.request_type)}"`,
        formatStatus(r.status),
        r.filed_at ? new Date(r.filed_at).toLocaleDateString("en-IN") : "Recent",
        r.is_fast_lane ? "12 Hours" : "48 Hours",
        `"${(r.description || "").replace(/"/g, '""')}"`,
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8,\uFEFF" +
        [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `PRAHARI_Requests_History_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Export error:", e);
    } finally {
      setDownloading(false);
    }
  };

  // Helper for status badge
  const renderStatusBadge = (status: string, isFastLane?: boolean) => {
    const s = (status || "").toLowerCase();
    if (s === "approved") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Approved
        </span>
      );
    }
    if (s === "rejected") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3 h-3 text-rose-600" />
          Rejected
        </span>
      );
    }
    if (s === "closed" || s === "resolved") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <CheckCircle2 className="w-3 h-3 text-slate-500" />
          Resolved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <Clock className="w-3 h-3 text-blue-600" />
        Under review
      </span>
    );
  };

  if (loading && requests.length === 0) {
    return (
      <div className="py-24 px-4 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="w-8 h-8 text-[#0c3866] animate-spin" />
        <p className="text-xs text-slate-500 font-medium">
          Loading your requests...
        </p>
      </div>
    );
  }

  // =========================================================
  // VIEW 2: REQUEST DETAIL VIEW (PROGRESSIVE DISCLOSURE)
  // =========================================================
  if (selectedRequest) {
    const isApproved = selectedRequest.status === "approved";
    const isRejected = selectedRequest.status === "rejected";
    const isClosed = selectedRequest.status === "closed" || selectedRequest.status === "resolved";
    const isOfficerReview = !isApproved && !isRejected && !isClosed;

    const formattedId = formatRequestId(selectedRequest.id, selectedRequest.filed_at);
    const filedDate = selectedRequest.filed_at
      ? new Date(selectedRequest.filed_at).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Recently filed";

    const isOfflineSynced =
      selectedRequest.id?.startsWith("offline") ||
      selectedRequest.filing_channel === "pwa_offline" ||
      selectedRequest.description?.includes("offline");

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => setSelectedRequestId(null)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0c3866] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>My Requests</span>
          </button>

          {/* Request Detail Header Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-slate-900">
                  {formatCategory(selectedRequest.category || selectedRequest.request_type)}
                </h1>
                <p className="text-xs font-mono text-slate-500">
                  Request ID: {formattedId}
                </p>
              </div>
              <div>{renderStatusBadge(selectedRequest.status, selectedRequest.is_fast_lane)}</div>
            </div>

            {/* Submitted Date & Description */}
            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-500 block uppercase tracking-wider text-[10px]">
                  Submitted
                </span>
                <p className="text-sm font-medium text-slate-800 mt-0.5">{filedDate}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-500 block uppercase tracking-wider text-[10px]">
                  Request Details
                </span>
                <p className="text-sm text-slate-800 mt-1 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {formatDescription(selectedRequest.description)}
                </p>
              </div>

              {selectedRequest.start_date && (
                <div>
                  <span className="font-semibold text-slate-500 block uppercase tracking-wider text-[10px]">
                    Period Requested
                  </span>
                  <p className="text-sm text-slate-800 mt-0.5">
                    {selectedRequest.start_date} &bull; {selectedRequest.end_date || "Single day"}
                  </p>
                </div>
              )}
            </div>

            {/* PROGRESS TRACKER */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Progress
              </h2>

              <div className="space-y-2 text-xs">
                {/* Stage 1: Submitted */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Request submitted</p>
                    <p className="text-slate-500 text-[11px]">{filedDate}</p>
                  </div>
                </div>

                {/* Stage 2: Received */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Request received</p>
                    <p className="text-slate-500 text-[11px]">Logged in company roster system</p>
                  </div>
                </div>

                {/* Stage 3: Officer Review */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isApproved || isRejected || isClosed
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {isApproved || isRejected || isClosed ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Officer review</p>
                    <p className="text-slate-500 text-[11px]">
                      {isApproved || isRejected || isClosed
                        ? "Reviewed by Company Commander & Welfare Officer"
                        : "Under review by authorized welfare chain"}
                    </p>
                  </div>
                </div>

                {/* Stage 4: Decision */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isApproved
                        ? "bg-emerald-100 text-emerald-700"
                        : isRejected
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isApproved ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : isRejected ? (
                      <XCircle className="w-3.5 h-3.5" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Decision</p>
                    <p className="text-slate-500 text-[11px]">
                      {isApproved
                        ? "Sanctioned by Command"
                        : isRejected
                        ? "Declined due to operational coverage"
                        : "Awaiting final decision"}
                    </p>
                  </div>
                </div>

                {/* Stage 5: Completed */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isApproved || isClosed
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isApproved || isClosed ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Completed</p>
                    <p className="text-slate-500 text-[11px]">
                      {isApproved
                        ? "Roster updated & relief granted"
                        : "Pending final resolution"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Expected Response & Offline status */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Expected response</span>
                <p className="font-bold text-slate-800 mt-0.5">
                  {selectedRequest.is_fast_lane ? "Within 12 hours" : "Within 48 hours"}
                </p>
              </div>

              {isOfflineSynced && (
                <div className="text-right sm:text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Submitted while offline &bull; Synced automatically
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <Link
                href="/portal/help#contact"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-slate-600" />
                <span>Contact Welfare Officer</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // VIEW 1: COMPACT REQUESTS LIST
  // =========================================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header & New Request Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              My Requests
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Track and manage your leave, welfare, and emergency requests.
            </p>
          </div>

          <Link
            href="/request"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#0c3866] hover:bg-[#072648] text-white text-xs font-semibold transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Request</span>
          </Link>
        </div>

        {/* Filters & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tab Filter: All / Active / Completed */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                filterTab === "all"
                  ? "bg-[#0c3866] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              All ({targetPool.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("active")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                filterTab === "active"
                  ? "bg-[#0c3866] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("completed")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                filterTab === "completed"
                  ? "bg-[#0c3866] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Completed
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search requests..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0c3866]"
            />
          </div>
        </div>

        {/* Compact Request Rows/Cards */}
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
          {filteredRequests.length > 0 ? (
            filteredRequests.map((req) => {
              const formattedId = formatRequestId(req.id, req.filed_at);
              const isOffline =
                req.id?.startsWith("offline") ||
                req.filing_channel === "pwa_offline" ||
                req.description?.includes("offline");

              return (
                <button
                  key={req.id}
                  type="button"
                  onClick={() => setSelectedRequestId(req.id)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors group cursor-pointer"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 group-hover:text-[#0c3866] transition-colors">
                        {formatCategory(req.category || req.request_type)}
                      </span>
                      {renderStatusBadge(req.status, req.is_fast_lane)}
                      {req.is_fast_lane && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          12H
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500">
                      {req.start_date
                        ? `${req.start_date} – ${req.end_date || "Immediate"}`
                        : `Submitted ${formattedId}`}
                      {" &bull; "}
                      {req.is_fast_lane
                        ? "Expected response within 12 hours"
                        : "Expected response within 48 hours"}
                    </p>

                    {isOffline && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Submitted while offline &bull; Synced automatically</span>
                      </p>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-medium text-slate-700">No requests found</p>
              <p className="text-xs text-slate-500">
                {searchQuery
                  ? "Try searching with a different term or clear the filter."
                  : "You have no active or previous requests in this view."}
              </p>
            </div>
          )}
        </div>

        {/* History / Archive Section */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-slate-400" />
            <span>
              {showArchive ? "Viewing archived requests (>30 days)" : "Viewing current service window (last 30 days)"}
            </span>
            <button
              type="button"
              onClick={() => setShowArchive(!showArchive)}
              className="text-[#0c3866] font-semibold hover:underline cursor-pointer ml-1"
            >
              {showArchive ? "Show current requests" : `View archive (${archivedRequests.length})`}
            </button>
          </div>

          <button
            type="button"
            onClick={downloadHistoryCSV}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
          >
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Download History (CSV)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PersonnelRequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 px-4 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[50vh] space-y-3">
          <Loader2 className="w-8 h-8 text-[#0c3866] animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading requests...</p>
        </div>
      }
    >
      <PersonnelRequestsContent />
    </Suspense>
  );
}

