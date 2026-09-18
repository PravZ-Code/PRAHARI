"use client";

import { useTranslation } from "@/lib/i18n";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  Shield,
  ArrowLeft,
  Calendar,
  HeartHandshake,
  HelpCircle,
  Search,
} from "lucide-react";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";

function RequestWelfareContent() {
  const { lang } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") || "welfare";

  const [requestType, setRequestType] = useState(
    initialType === "leave"
      ? "Leave"
      : initialType === "grievance"
      ? "Grievance"
      : initialType === "emergency"
      ? "Family Emergency"
      : "Welfare Support"
  );
  const [urgency, setUrgency] = useState("Standard");
  const [reason, setReason] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [serviceNumber, setServiceNumber] = useState("Loading...");
  const [personnelName, setPersonnelName] = useState("Loading...");
  const [unitName, setUnitName] = useState("Loading...");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState<any>(null);
  const [isOfflineSubmission, setIsOfflineSubmission] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/auth/me")
      .then((res) => {
        if (res.data) {
          setServiceNumber(res.data.service_number || "Not available");
          setPersonnelName(res.data.name || res.data.username || "Authenticated user");
          setUnitName(res.data.unit_name || "Assigned unit");
        }
      })
      .catch(() => {
        setServiceNumber("Unavailable");
        setPersonnelName("Unable to load profile");
        setUnitName("Unavailable");
      });
  }, []);

  useEffect(() => {
    if (requestType === "Family Emergency") {
      setUrgency("Urgent");
    }
  }, [requestType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert("Please tell us what you need help with.");
      return;
    }
    if (!confirmed) {
      alert("Please confirm that the details are correct.");
      return;
    }

    setLoading(true);
    setSubmissionError(null);

    const refNo = `PRH-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const submissionDate = new Date().toISOString();

    const requestBody = {
      request_type: requestType.toLowerCase().includes("leave") ? "leave" : requestType.toLowerCase().includes("emergency") ? "leave" : "grievance",
      category: requestType.toLowerCase().replace(/\s+/g, "_"),
      description: `${reason}${additionalDetails ? ` - ${additionalDetails}` : ""}`,
      filing_channel: "pwa",
    };
    const payload = {
      queue_id: crypto.randomUUID(),
      queued_by: getStoredUser()?.username,
      endpoint: "/grievance/file",
      body: requestBody,
      reference_number: refNo,
      personnel_name: personnelName,
      service_number: serviceNumber,
      unit_name: unitName,
      request_type: requestType,
      urgency: urgency,
      reason: reason,
      additional_details: additionalDetails,
      status: "Waiting for Review",
      current_stage: "Operational Check (Rest and duty coverage)",
      submitted_at: submissionDate,
      next_step: "Review by Company Commander and Welfare Officer",
    };

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("Offline");
      }
      const res = await api.post("/grievance/file", requestBody, {
        headers: { "Idempotency-Key": payload.queue_id },
      });
      if (res.data && res.data.id) {
        payload.reference_number = `PRH-2026-${res.data.id.slice(0, 6).toUpperCase()}`;
      }
      setIsOfflineSubmission(false);
      setSubmittedReceipt(payload);
    } catch (err: any) {
      // Differentiate network / offline conditions from real HTTP errors
      const isNetworkError =
        !err.response ||
        err.code === "ERR_NETWORK" ||
        err.message === "Offline" ||
        (typeof navigator !== "undefined" && !navigator.onLine);

      if (isNetworkError) {
        // True offline / unreachable condition: buffer to local offline queue for background sync
        const queue = JSON.parse(localStorage.getItem("prahari_offline_queue") || "[]");
        queue.push(payload);
        localStorage.setItem("prahari_offline_queue", JSON.stringify(queue));
        window.dispatchEvent(new Event("prahari_offline_update"));
        setIsOfflineSubmission(true);
        setSubmittedReceipt(payload);
      } else {
        // Concrete HTTP error response from backend (401, 403, 422, 500)
        const status = err.response?.status;
        const detail = err.response?.data?.detail || "An unexpected error occurred while processing your request.";
        if (status === 401) {
          setSubmissionError("Authentication session expired. Please log in again.");
          setTimeout(() => {
            window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
          }, 1500);
        } else if (status === 403) {
          setSubmissionError(`Permission Denied (403): ${detail}`);
        } else {
          setSubmissionError(`Submission Failed (${status}): ${detail}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="ux4g-breadcrumb ux4g-breadcrumb-divider text-xs text-slate-500 flex items-center gap-1.5 no-print">
        <Link href="/portal" className="hover:text-[#0c3866] font-semibold inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Trooper Portal</span>
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Apply for Leave / Support</span>
      </nav>

      {/* Heading */}
      <div className="border-b border-slate-200 pb-4 no-print">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#0c3866] text-white">
            <HeartHandshake className="w-5 h-5 text-[#ff9933]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0c3866] font-heading">
              {lang === "hi" ? "सहायता का अनुरोध" : lang === "ta" ? "உதவிக்கான கோரிக்கை" : "Request Help"}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Ask for leave, personal welfare support, or tell us about an issue. A human officer always reviews your request.
            </p>
          </div>
        </div>
      </div>

      {submissionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-center gap-2.5 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="font-medium">{submissionError}</span>
        </div>
      )}

      {submittedReceipt ? (
        /* Acknowledgement Receipt View */
        <div className="gov-card p-6 sm:p-8 space-y-6 bg-white border-2 border-slate-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-slate-200 pb-4 gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-12 flex items-center justify-center flex-shrink-0">
                <img
                  src="/images/emblem_of_india.svg"
                  alt="State Emblem of India"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 border-l border-slate-200 pl-2.5">
                <img
                  src="/images/prahari_logo_trans.png"
                  alt="PRAHARI Crest"
                  className="w-full h-full object-contain filter drop-shadow-xs"
                />
              </div>
              <div className="w-10 h-12 flex items-center justify-center flex-shrink-0 border-l border-slate-200 pl-2.5">
                <img
                  src="/images/crpf_logo_official.svg"
                  alt="CRPF Crest"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  <span>Request Received Successfully</span>
                </div>
                <h2 className="text-lg font-bold text-[#0c3866] pt-0.5 font-heading">
                  Official Request Receipt
                </h2>
                <p className="text-[11px] text-slate-500">
                  Directorate General, CRPF · Ministry of Home Affairs
                </p>
              </div>
            </div>
            <div className="text-right bg-slate-50 p-2.5 rounded border border-slate-200 w-full sm:w-auto">
              <span className="text-[11px] text-slate-500 block">Your Reference Number</span>
              <span className="text-base font-bold text-[#0c3866] font-mono">
                {submittedReceipt.reference_number}
              </span>
            </div>
          </div>

          {isOfflineSubmission && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Saved on your phone:</strong> You are currently offline. Your request has been saved securely on this device and will be sent automatically when you have internet.
              </span>
            </div>
          )}

          {/* Receipt Particulars Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-500 block">Your Name:</span>
              <strong className="text-slate-900 text-sm">{submittedReceipt.personnel_name}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Service Number:</span>
              <strong className="text-slate-900 font-mono text-sm">{submittedReceipt.service_number}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Unit:</span>
              <strong className="text-slate-900">{submittedReceipt.unit_name}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Request Type:</span>
              <strong className="text-slate-900">{submittedReceipt.request_type}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Status:</span>
              <strong className="text-amber-700 font-bold">
                {submittedReceipt.status}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Next Step:</span>
              <strong className="text-[#0c3866]">{submittedReceipt.next_step}</strong>
            </div>
            <div className="sm:col-span-2 pt-2 border-t border-slate-200">
              <span className="text-slate-500 block">Reason Given:</span>
              <p className="text-slate-800 mt-1 italic">&ldquo;{submittedReceipt.reason}&rdquo;</p>
            </div>
          </div>

          {/* What happens next */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2 text-xs">
            <h3 className="font-bold text-[#0c3866] flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>What Happens Next?</span>
            </h3>
            <ol className="list-decimal pl-5 space-y-1 text-slate-700">
              <li>The system checks duty coverage and rest for your teammates so no one is overloaded.</li>
              <li>Your Company Commander and Welfare Officer review your request directly.</li>
              <li>You will receive an update once a decision is made.</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 no-print">
            <button
              onClick={handlePrint}
              className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print Receipt</span>
            </button>

            <div className="flex items-center gap-2">
              <Link
                href={`/track?ref=${encodeURIComponent(submittedReceipt.reference_number)}`}
                className="ux4g-btn ux4g-btn-primary ux4g-btn-sm flex items-center gap-1.5"
              >
                <Search className="w-4 h-4" />
                <span>Check Status</span>
              </Link>
              <button
                onClick={() => {
                  setSubmittedReceipt(null);
                  setReason("");
                  setAdditionalDetails("");
                  setConfirmed(false);
                }}
                className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm"
              >
                Make Another Request
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Form View */
        <form onSubmit={handleSubmit} className="gov-card space-y-6 bg-white p-6">
          {/* Soldier Particulars Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Name:</span>
              <strong className="text-slate-900">{personnelName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Service Number:</span>
              <strong className="text-slate-900 font-mono">{serviceNumber}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Unit:</span>
              <strong className="text-slate-900">{unitName}</strong>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Request Type */}
            <div>
              <label htmlFor="req-type" className="gov-label">
                What kind of help do you need? <span className="text-red-600">*</span>
              </label>
              <select
                id="req-type"
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                className="gov-input font-medium"
                required
              >
                <option value="Leave">Leave (Rest, Family Visit, Planned Time Off)</option>
                <option value="Welfare Support">Welfare Support (Health, Family, or Duty Fatigue)</option>
                <option value="Grievance">Grievance (Duty Issues, Delayed Leave, Facilities)</option>
                <option value="Family Emergency">Family Emergency (Urgent Help Needed at Home)</option>
                <option value="Other Help">Other Help</option>
              </select>
            </div>

            {/* Urgency */}
            <div>
              <label className="gov-label">
                How urgent is this? <span className="text-red-600">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <label className={`p-3 rounded-lg border cursor-pointer flex flex-col justify-between ${
                  urgency === "Standard" ? "border-[#0c3866] bg-blue-50/50" : "border-slate-200 hover:bg-slate-50"
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="urgency"
                      checked={urgency === "Standard"}
                      onChange={() => setUrgency("Standard")}
                      className="text-[#0c3866]"
                    />
                    <strong className="text-slate-900">Standard</strong>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">Planned leave or regular support</span>
                </label>

                <label className={`p-3 rounded-lg border cursor-pointer flex flex-col justify-between ${
                  urgency === "Urgent" ? "border-[#0c3866] bg-blue-50/50" : "border-slate-200 hover:bg-slate-50"
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="urgency"
                      checked={urgency === "Urgent"}
                      onChange={() => setUrgency("Urgent")}
                      className="text-[#0c3866]"
                    />
                    <strong className="text-slate-900">Urgent</strong>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">Need attention as soon as possible</span>
                </label>

                <label className={`p-3 rounded-lg border cursor-pointer flex flex-col justify-between ${
                  urgency === "Family Emergency" ? "border-amber-500 bg-amber-50/60" : "border-slate-200 hover:bg-slate-50"
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="urgency"
                      checked={urgency === "Family Emergency"}
                      onChange={() => setUrgency("Family Emergency")}
                      className="text-amber-700"
                    />
                    <strong className="text-amber-900">Family Emergency</strong>
                  </div>
                  <span className="text-[11px] text-amber-700 mt-1 block font-semibold">Immediate family crisis</span>
                </label>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label htmlFor="reason" className="gov-label">
                Please explain what happened or why you need help <span className="text-red-600">*</span>
              </label>
              <textarea
                id="reason"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Write in simple words. For example: My mother is in the hospital and I need 10 days leave to care for her..."
                className="gov-input"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Your notes are confidential and shared only with authorized officers handling your welfare.
              </p>
            </div>

            {/* Additional Details */}
            <div>
              <label htmlFor="additional" className="gov-label">
                Additional Details (Optional)
              </label>
              <input
                id="additional"
                type="text"
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                placeholder="For example: hospital name, city, or flight date"
                className="gov-input"
              />
            </div>

            {/* Confirmation */}
            <div className="pt-2 border-t border-slate-200">
              <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 rounded text-[#0c3866] focus:ring-[#0c3866]"
                />
                <span>
                  <strong>Confirmation:</strong> I confirm that the information provided is correct. I understand that a human officer will review and decide on my request.
                </span>
              </label>
            </div>
          </div>

          {/* Form Submit Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <Link
              href="/"
              className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              <span>Back to Home</span>
            </Link>

            <button
              type="submit"
              disabled={loading || !confirmed}
              className="ux4g-btn ux4g-btn-primary ux4g-btn-md"
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">◌</span>
                  <span>Sending Request...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  <span>Submit Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function RequestWelfarePage() {
  const { lang } = useTranslation();
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading request form...</div>}>
      <RequestWelfareContent />
    </React.Suspense>
  );
}
