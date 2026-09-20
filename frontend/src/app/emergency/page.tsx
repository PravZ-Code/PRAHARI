"use client";

import { useTranslation } from "@/lib/i18n";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Phone,
  Hospital,
  Shield,
  UserCheck,
} from "lucide-react";
import { api } from "@/lib/api";

export default function FamilyEmergencyPage() {
  const { lang } = useTranslation();
  const router = useRouter();
  const [relationship, setRelationship] = useState("Parent / Spouse");
  const [details, setDetails] = useState("");
  const [destination, setDestination] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) {
      setErrorMessage("Please describe the nature of the emergency.");
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await api.post("/grievance/file", {
        request_type: "leave",
        category: "family_emergency",
        description: `Family Emergency [${relationship}]: ${details} (Destination: ${destination || "Home"}, Contact: ${contactNumber || "On file"})`,
        filing_channel: "pwa",
      });
      const ref = res.data?.id ? `PRH-2026-${res.data.id.slice(0, 6).toUpperCase()}` : `PRH-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      setSubmittedRef(ref);
    } catch (err: any) {
      console.error("Emergency submit error:", err);
      if (typeof window !== "undefined" && !navigator.onLine) {
        try {
          const queue = JSON.parse(localStorage.getItem("prahari_offline_queue") || "[]");
          const emergencyPayload = {
            queue_id: crypto.randomUUID(),
            endpoint: "/grievance/file",
            body: {
              request_type: "leave",
              category: "family_emergency",
              description: `Family Emergency [${relationship}]: ${details} (Destination: ${destination || "Home"}, Contact: ${contactNumber || "On file"})`,
              filing_channel: "pwa_offline"
            },
            submitted_at: new Date().toISOString()
          };
          queue.push(emergencyPayload);
          localStorage.setItem("prahari_offline_queue", JSON.stringify(queue));
          window.dispatchEvent(new Event("prahari_offline_update"));
          setSubmittedRef(`OFFLINE-${Math.floor(100000 + Math.random() * 900000)}`);
        } catch {
          setErrorMessage("Failed to buffer emergency request offline. Please dial 14411 / 14416 immediately.");
        }
      } else {
        const detail = err.response?.data?.detail || "Emergency submission failed. Please contact duty officer or dial 14411 / 14416 immediately.";
        setErrorMessage(detail);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="ux4g-breadcrumb ux4g-breadcrumb-divider text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/portal" className="hover:text-[#0c3866] font-semibold inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Trooper Portal</span>
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Family Emergency SOS (12h)</span>
      </nav>

      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-red-600 text-white">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-heading">
              Family Emergency — I need urgent help
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Urgent request path for hospitalizations, family illness, or immediate domestic emergencies.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <img
            src="/images/prahari_logo_trans.png"
            alt="PRAHARI Logo"
            className="h-12 w-auto object-contain filter drop-shadow-xs"
          />
        </div>
      </div>

      {/* Emergency Notice Banner */}
      <div className="ux4g-alert ux4g-alert-warning p-4 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-2">
        <p className="font-bold text-amber-900 flex items-center gap-1.5 text-sm">
          <Clock className="w-4 h-4 text-amber-700" />
          <span>Priority Emergency Notice</span>
        </p>
        <p className="leading-relaxed">
          When you submit this emergency form, your Company Commander and Welfare Officer are notified immediately. A human officer reviews your request and authorizes emergency leave or travel relief.
        </p>
      </div>

      {errorMessage && (
        <div role="alert" className="p-4 rounded-lg bg-red-50 border border-red-300 text-sm text-red-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-800">Emergency Submission Error</p>
            <p className="mt-1">{errorMessage}</p>
          </div>
        </div>
      )}

      {submittedRef ? (
        <div className="ux4g-card ux4g-card-solid ux4g-card-vertical p-6 sm:p-8 space-y-6 bg-white border-2 border-amber-400">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-shrink-0">
                <img
                  src="/images/emblem_of_india.svg"
                  alt="State Emblem of India"
                  className="h-10 w-auto object-contain"
                />
                <img
                  src="/images/prahari_logo_trans.png"
                  alt="PRAHARI Emblem"
                  className="h-11 w-auto object-contain filter drop-shadow-xs"
                />
                <img
                  src="/images/crpf_logo_official.svg"
                  alt="CRPF Crest"
                  className="h-10 w-auto object-contain"
                />
              </div>
              <div>
                <span className="ux4g-tag-tonal-warning ux4g-tag-s font-bold">
                  {lang === "hi" ? "आपातकालीन अनुरोध प्रेषित" : lang === "ta" ? "அவசர கோரிக்கை அனுப்பப்பட்டது" : "Emergency Request Sent"}
                </span>
                <h2 className="text-xl font-bold text-[#0c3866] mt-1.5 font-heading">
                  Emergency Reference: {submittedRef}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Notified: Company Commander & Battalion Welfare Officer
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 text-xs">
            <div>
              <span className="text-slate-500 block">Family Relationship:</span>
              <strong className="text-slate-900">{relationship}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Location:</span>
              <strong className="text-slate-900">{destination || "Not specified"}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Emergency Contact:</span>
              <strong className="text-slate-900">{contactNumber || "Not specified"}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Emergency Details:</span>
              <p className="text-slate-800 italic mt-0.5">&ldquo;{details}&rdquo;</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-xs text-slate-700 space-y-1">
            <span className="font-bold text-[#0c3866] block">Next Step</span>
            <p>
              Your officers have been notified. Keep your phone reachable. If you need immediate assistance right this moment, you can also dial the toll-free helpline or speak to your unit duty officer.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <Link
              href="/"
              className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm"
            >
              <span>Back to Home</span>
            </Link>

            <Link
              href={`/track?ref=${encodeURIComponent(submittedRef)}`}
              className="ux4g-btn ux4g-btn-primary ux4g-btn-md"
            >
              <span>Track This Emergency</span>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="ux4g-card ux4g-card-solid ux4g-card-vertical p-6 space-y-5">
          {/* Who needs help? */}
          <div>
            <label htmlFor="relationship" className="block text-xs font-bold text-slate-700 mb-1">
              Who needs help? <span className="text-red-600">*</span>
            </label>
            <select
              id="relationship"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="Parent (Father / Mother)">Parent (Father / Mother)</option>
              <option value="Spouse (Wife / Husband)">Spouse (Wife / Husband)</option>
              <option value="Child (Son / Daughter)">Child (Son / Daughter)</option>
              <option value="Sibling (Brother / Sister)">Sibling (Brother / Sister)</option>
              <option value="Self (Acute Personal Emergency)">Self (Acute Personal Emergency)</option>
            </select>
          </div>

          {/* What happened? */}
          <div>
            <label htmlFor="emergency-details" className="block text-xs font-bold text-slate-700 mb-1">
              What happened? <span className="text-red-600">*</span>
            </label>
            <textarea
              id="emergency-details"
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Tell us what happened in simple words (e.g. Hospital admission, urgent medical treatment needed)..."
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          {/* Where is the emergency? */}
          <div>
            <label htmlFor="destination" className="block text-xs font-bold text-slate-700 mb-1">
              Where do you need to go? (City / State / Hospital)
            </label>
            <input
              id="destination"
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. District Hospital, Varanasi, Uttar Pradesh"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Contact number */}
          <div>
            <label htmlFor="contact" className="block text-xs font-bold text-slate-700 mb-1">
              Phone number to reach you or your family
            </label>
            <input
              id="contact"
              type="tel"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Confirmation */}
          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 rounded text-red-600 focus:ring-red-500"
              />
              <span>
                <strong>Confirmation:</strong> I confirm this is an urgent family emergency. I understand an authorized officer will review and approve emergency leave or duty relief.
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <Link
              href="/"
              className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              <span>Cancel</span>
            </Link>

            <button
              type="submit"
              disabled={!confirmed || submitting}
              className="ux4g-btn ux4g-btn-danger ux4g-btn-md flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <span>Submitting Emergency Notice...</span>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-1.5" />
                  <span>Send Emergency Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
