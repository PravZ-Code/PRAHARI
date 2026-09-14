"use client";

import { useTranslation } from "@/lib/i18n";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Shield,
  ArrowLeft,
  FileText,
  Calendar,
  Layers,
  ChevronRight,
  Info,
  Loader2,
} from "lucide-react";

export type RequestStatus =
  | "Waiting for Review"
  | "Under Review"
  | "Approved"
  | "Rejected"
  | "Support Given"
  | "Completed"
  | "Needs Review";

interface TrackRecord {
  ref: string;
  id?: string;
  request: string;
  applicant: string;
  serviceNo: string;
  unit: string;
  submittedDate: string;
  urgency: string;
  status: RequestStatus;
  nextStep: string;
  currentStage: string;
  stages: {
    name: string;
    description: string;
    completed: boolean;
    current: boolean;
    timestamp?: string;
  }[];
  officerRemarks?: string;
}

function buildTrackRecord(g: any): TrackRecord {
  const refCode = `PRH-2026-${g.id.slice(0, 6).toUpperCase()}`;
  const submitted = g.filed_at
    ? new Date(g.filed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "10 Sep 2026";
  const isApproved = g.status === "approved";
  const isRejected = g.status === "rejected";
  const isEscalated = g.status === "escalated" || g.escalation_level > 0;

  let statusText: RequestStatus = "Under Review";
  if (isApproved) statusText = "Support Given";
  else if (isRejected) statusText = "Rejected";
  else if (isEscalated) statusText = "Needs Review";
  else if (g.status === "filed") statusText = "Waiting for Review";

  const stages = [
    {
      name: "Request Sent",
      description: "Request logged into unit records",
      completed: true,
      current: false,
      timestamp: submitted,
    },
    {
      name: "Operational Check",
      description: "Checked rest for team and guard duty coverage",
      completed: g.status !== "filed",
      current: g.status === "filed",
      timestamp: g.collision_status ? `Check: ${g.collision_status}` : undefined,
    },
    {
      name: "Officer Review",
      description: "Being reviewed by Company Commander and Welfare Officer",
      completed: isApproved || isRejected || isEscalated,
      current: !isApproved && !isRejected && !isEscalated && g.status !== "filed",
      timestamp: g.hours_remaining !== undefined ? `${g.hours_remaining}h SLA remaining` : undefined,
    },
    {
      name: "Decision",
      description: isApproved ? "Approved by Command" : isRejected ? "Declined due to mission duty" : "Awaiting final sign-off",
      completed: isApproved || isRejected,
      current: false,
    },
    {
      name: "Support Given",
      description: isApproved ? "Leave sanctioned or shift swapped in live duty roster" : "Awaiting approval",
      completed: isApproved,
      current: isApproved,
    },
    {
      name: "Follow Up",
      description: "7-day wellbeing and rest check-in",
      completed: false,
      current: false,
    },
  ];

  return {
    ref: refCode,
    id: g.id,
    request: g.category?.replace(/_/g, " ") || g.request_type || "Leave / Grievance Application",
    applicant: g.personnel_name || "Constable",
    serviceNo: g.rank ? `${g.rank} · ${g.trade || "GD"}` : "CRPF-GD",
    unit: g.unit_name || "Battalion Command",
    submittedDate: submitted,
    urgency: g.is_fast_lane ? "Family Emergency" : (g.category?.includes("emergency") ? "Urgent" : "Standard"),
    status: statusText,
    nextStep: isApproved
      ? "Your support is active. Report back if you need any adjustments."
      : isRejected
      ? (g.rejection_reason || "Duty requirements conflict. You can discuss alternatives with Welfare.")
      : "Awaiting review and signature by Company Commander.",
    currentStage: isApproved ? "Support Given" : isRejected ? "Decision Complete" : isEscalated ? "Escalated Review" : "Officer Review",
    stages: stages,
    officerRemarks: g.resolution_notes || g.rejection_reason || (isApproved ? "Approved by Commander. Live roster updated." : "Under active officer evaluation.")
  };
}

function TrackContent() {
  const { lang } = useTranslation();
  const searchParams = useSearchParams();
  const initialRef = searchParams.get("ref") || "";

  const [records, setRecords] = useState<Record<string, TrackRecord>>({});
  const [activeRef, setActiveRef] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get("/grievance/my-requests");
      const list = res.data || [];
      const map: Record<string, TrackRecord> = {};
      list.forEach((g: any) => {
        const rec = buildTrackRecord(g);
        map[rec.ref] = rec;
        map[g.id] = rec;
      });
      setRecords(map);

      if (initialRef && map[initialRef]) {
        setActiveRef(initialRef);
      } else if (list.length > 0) {
        setActiveRef(`PRH-2026-${list[0].id.slice(0, 6).toUpperCase()}`);
      }
    } catch (e) {
      console.error("Failed to load requests:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchInput.trim().toUpperCase();
    if (!clean) return;

    if (records[clean]) {
      setActiveRef(clean);
      setSearchError(null);
      return;
    }

    try {
      const res = await api.get(`/grievance/${clean.replace("PRH-2026-", "").toLowerCase()}`);
      if (res.data) {
        const rec = buildTrackRecord(res.data);
        setRecords((prev) => ({ ...prev, [rec.ref]: rec }));
        setActiveRef(rec.ref);
        setSearchError(null);
        return;
      }
    } catch (err) {
      setSearchError(`No active record found for reference "${clean}". Please check the number.`);
    }
  };

  const activeRecord = records[activeRef] || Object.values(records)[0];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="ux4g-breadcrumb ux4g-breadcrumb-divider text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/portal" className="hover:text-[#0c3866] font-semibold inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Trooper Portal</span>
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Track Application</span>
      </nav>

      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-[#0c3866] font-heading">
          {lang === "hi" ? "अनुरोध स्थिति ट्रैकिंग" : lang === "ta" ? "கோரிக்கை நிலை கண்காணிப்பு" : "Track Your Request"}
        </h1>
        <p className="text-xs text-slate-600 mt-0.5">
          See exactly where your request stands in real time — no guessing, complete transparency.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="gov-card p-4 bg-white flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Enter reference number (e.g. PRH-2026-000184)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="gov-input pl-9 text-xs w-full py-2 font-mono uppercase"
          />
        </div>
        <button type="submit" className="ux4g-btn ux4g-btn-primary ux4g-btn-sm whitespace-nowrap">
          Track Now
        </button>
      </form>

      {searchError && (
        <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded text-xs">
          {searchError}
        </div>
      )}

      {/* Available Requests Tabs */}
      {Object.keys(records).length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Your Requests:</span>
          {Array.from(new Set(Object.values(records).map((r) => r.ref))).map((refCode) => {
            const rec = records[refCode];
            return (
              <button
                key={refCode}
                onClick={() => setActiveRef(refCode)}
                className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                  activeRef === refCode
                    ? "bg-[#0c3866] text-white border-[#0c3866]"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span>{refCode}</span>
                <span className="text-[10px] opacity-80">({rec.status})</span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#0c3866]" />
          <span className="text-xs text-slate-500">Checking live status with database...</span>
        </div>
      ) : !activeRecord ? (
        <div className="gov-card p-8 text-center text-slate-500 text-xs space-y-3">
          <p>No grievance or leave requests filed yet for this account.</p>
          <Link href="/request" className="ux4g-btn ux4g-btn-primary ux4g-btn-sm inline-block">
            Submit a Request
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Status Card */}
          <div className="gov-card p-6 space-y-4 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Reference: <strong className="font-mono text-[#0c3866]">{activeRecord.ref}</strong>
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">{activeRecord.request}</h2>
                <p className="text-xs text-slate-600">
                  {activeRecord.applicant} · {activeRecord.serviceNo} · {activeRecord.unit}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-1 rounded font-bold ${
                    activeRecord.status === "Support Given" || activeRecord.status === "Approved"
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      : activeRecord.status === "Rejected"
                      ? "bg-rose-100 text-rose-900 border border-rose-300"
                      : activeRecord.status === "Needs Review"
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "bg-blue-100 text-blue-900 border border-blue-300"
                  }`}
                >
                  {activeRecord.status}
                </span>
              </div>
            </div>

            {/* Next Step Box */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">What happens next:</span>
              <p className="text-xs text-slate-800 font-semibold">{activeRecord.nextStep}</p>
            </div>

            {/* Officer Remarks */}
            {activeRecord.officerRemarks && (
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-lg space-y-1 text-xs">
                <span className="font-bold text-[#0c3866] block">Officer Notes:</span>
                <p className="text-slate-700">{activeRecord.officerRemarks}</p>
              </div>
            )}
          </div>

          {/* Stepper Timeline */}
          <div className="gov-card p-6 space-y-4 bg-white">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Request Journey (Real-Time Progress)
            </h3>

            <div className="space-y-4">
              {activeRecord.stages.map((stage, idx) => (
                <div key={stage.name} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        stage.completed
                          ? "bg-emerald-600 text-white"
                          : stage.current
                          ? "bg-[#0c3866] text-white ring-4 ring-blue-100"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {stage.completed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    {idx < activeRecord.stages.length - 1 && (
                      <div
                        className={`w-0.5 h-10 ${
                          stage.completed ? "bg-emerald-600" : "bg-slate-200"
                        }`}
                      />
                    )}
                  </div>

                  <div className="flex-1 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <strong
                        className={`text-xs block ${
                          stage.current ? "text-[#0c3866] font-bold" : "text-slate-800"
                        }`}
                      >
                        {stage.name}
                      </strong>
                      {stage.timestamp && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {stage.timestamp}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{stage.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function TrackRequestPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading tracking...</div>}>
      <TrackContent />
    </React.Suspense>
  );
}
