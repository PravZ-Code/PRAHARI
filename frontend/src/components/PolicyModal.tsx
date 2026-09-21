"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Shield,
  Lock,
  Scale,
  FileText,
  PhoneCall,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Building2,
  ExternalLink,
} from "lucide-react";

export type PolicyTab = "terms" | "privacy" | "confidentiality" | "guidelines";

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: PolicyTab;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({
  isOpen,
  onClose,
  initialTab = "terms",
}) => {
  const [activeTab, setActiveTab] = useState<PolicyTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="ux4g-modal-backdrop ux4g-modal-backdrop-50 fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="policy-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ux4g-modal-box ux4g-modal-l bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Modal Header */}
        <div className="ux4g-modal-header bg-[#0c3866] text-white px-6 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="ux4g-modal-header-title-content">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#ff9933]" />
              <h2 id="policy-modal-title" className="ux4g-modal-header-title text-base sm:text-lg font-bold">
                Official Statutory Policy &amp; Usage Charter
              </h2>
            </div>
            <p className="ux4g-modal-header-sub-heading text-xs text-slate-200 mt-0.5">
              Ministry of Home Affairs / Central Reserve Police Force &mdash; Government of India
            </p>
          </div>
          <button
            onClick={onClose}
            className="ux4g-modal-close p-1.5 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 flex flex-wrap gap-1 shrink-0">
          <button
            onClick={() => setActiveTab("terms")}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "terms"
                ? "border-[#0c3866] text-[#0c3866] bg-white rounded-t"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-[#0c3866]" />
            <span>Terms of Service</span>
          </button>
          <button
            onClick={() => setActiveTab("privacy")}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "privacy"
                ? "border-[#0c3866] text-[#0c3866] bg-white rounded-t"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-[#0c3866]" />
            <span>Privacy Policy (DPDP)</span>
          </button>
          <button
            onClick={() => setActiveTab("confidentiality")}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "confidentiality"
                ? "border-[#0c3866] text-[#0c3866] bg-white rounded-t"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-[#0c3866]" />
            <span>Confidentiality (Section 21)</span>
          </button>
          <button
            onClick={() => setActiveTab("guidelines")}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "guidelines"
                ? "border-[#0c3866] text-[#0c3866] bg-white rounded-t"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#0c3866]" />
            <span>Rest &amp; Welfare Guidelines</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="ux4g-modal-body p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
          {/* Tab 1: Terms of Service */}
          {activeTab === "terms" && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded bg-blue-50 border border-blue-200 text-blue-950">
                <h3 className="font-bold text-sm text-[#0c3866] mb-1 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#0c3866]" />
                  System Usage Charter &amp; Sovereign Authority
                </h3>
                <p className="text-[11px] leading-relaxed">
                  PRAHARI is an official operational welfare and decision-support platform designed for Central Armed Police Forces (CAPF) under Ministry of Home Affairs, Government of India. Access is restricted to authorized defense personnel, welfare officers, and commanding officers.
                </p>
              </div>

              <div className="p-3 rounded bg-amber-50 border border-amber-200 text-amber-950 space-y-1.5">
                <div className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>1. Non-Clinical Decision Support Disclaimer</span>
                </div>
                <p className="text-[11px]">
                  <strong>PRAHARI is not a medical device or psychiatric diagnostic system.</strong> All strain scores, risk levels, and Unit Resilience Optimizer (URO) recommendations serve strictly as operational decision-support for administrative and welfare planning. No algorithm within PRAHARI provides psychiatric or medical diagnoses.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-200 pb-1">
                  2. Non-Punitive Doctrine &amp; Career Protection
                </h4>
                <p className="text-[11px]">
                  The platform operates under the doctrine: <strong>Help First, Predict Second</strong>. Seeking confidential counsel or completing voluntary daily wellbeing check-ins shall never be used as grounds for disciplinary action, adverse ACR entries, or punitive transfers.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                    <strong className="text-slate-900 text-[11px] block">Mental Healthcare Act 2017 (Section 21)</strong>
                    <span className="text-[11px] text-slate-600">Guarantees non-discrimination and statutory confidentiality in armed forces welfare management.</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                    <strong className="text-slate-900 text-[11px] block">Human-in-the-Loop Sovereign Gate</strong>
                    <span className="text-[11px] text-slate-600">Automated models cannot decline leave or modify postings independently. Dual human sign-off is required.</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-200 pb-1">
                  3. Role Separation &amp; Access Boundaries
                </h4>
                <div className="space-y-1.5 text-[11px]">
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <strong className="text-[#0c3866]">Troopers &amp; Jawans:</strong> Submit voluntary check-ins, apply for leaves and family emergency grants, monitor SLA deadlines, and inspect personal data access transparency logs.
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <strong className="text-[#0c3866]">Welfare Officers:</strong> Custodians of confidential health and buddy signals under Section 23 of Mental Healthcare Act 2017. Clinical notes are never exposed to field commanders.
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200">
                    <strong className="text-[#0c3866]">Company Commanders:</strong> View unit-level operational readiness and aggregate fatigue indices; strictly firewalled from private self-reports and medical notes.
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-200 pb-1">
                  4. Cryptographic Audit Admissibility (BSA 2023 Section 63)
                </h4>
                <p className="text-[11px]">
                  All duty allocations, leave decisions, and system access logs are recorded in an append-only SHA-256 cryptographic audit ledger, verifiable under Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023 for statutory Courts of Inquiry.
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Privacy Policy & DPDP Charter */}
          {activeTab === "privacy" && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded bg-slate-50 border border-slate-200 text-slate-900">
                <h3 className="font-bold text-sm text-[#0c3866] mb-1 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#0c3866]" />
                  Digital Personal Data Protection (DPDP) Act 2023 Compliance
                </h3>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  PRAHARI processes digital personnel records exclusively for sovereign operational defense welfare and personnel readiness under Section 7(b) and Section 7(i) of the DPDP Act 2023.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-200 pb-1">
                  Statutory Data Principal Rights
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                  <div className="p-2.5 rounded bg-white border border-slate-200">
                    <strong className="text-[#0c3866] block">Right to Access (Section 11)</strong>
                    <span className="text-slate-600">Troopers can view who inspected their records via the Personal Access Transparency Log.</span>
                  </div>
                  <div className="p-2.5 rounded bg-white border border-slate-200">
                    <strong className="text-[#0c3866] block">Right to Correction (Section 12.1)</strong>
                    <span className="text-slate-600">Dispute inaccurate duty records with an expedited 48-hour statutory resolution SLA.</span>
                  </div>
                  <div className="p-2.5 rounded bg-white border border-slate-200">
                    <strong className="text-[#0c3866] block">Right to Erasure (Section 12.3)</strong>
                    <span className="text-slate-600">Request erasure of voluntary subjective check-in notes within a 72-hour statutory SLA.</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-200 pb-1">
                  Essential Storage &amp; Cookie Transparency
                </h4>
                <p className="text-[11px]">
                  The platform utilizes strictly essential session tokens (<code>prahari_session</code>, HttpOnly/SameSite) and local offline queue caching (<code>prahari_token</code>). There is zero commercial advertising, behavioral tracking, or third-party profiling.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-200 pb-1">
                  Data Retention &amp; Physical Segregation
                </h4>
                <p className="text-[11px]">
                  User authentication credentials and password hashes reside in an isolated authentication database (<code>prahari_auth.db</code>), while operational duty rosters and wellness records reside in <code>prahari.db</code>. Historical logs older than 30 days are automatically archived.
                </p>
              </div>
            </div>
          )}

          {/* Tab 3: Confidentiality Charter (MHCA Section 21) */}
          {activeTab === "confidentiality" && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-950">
                <h3 className="font-bold text-sm text-emerald-900 mb-1 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-700" />
                  Statutory Duty of Care &amp; Medical Privacy
                </h3>
                <p className="text-[11px] leading-relaxed">
                  Enforces strict statutory confidentiality under Section 21, Section 23, and Section 115 of the Mental Healthcare Act 2017 and Ministry of Home Affairs Welfare Directives.
                </p>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="p-3 rounded bg-white border border-slate-200 space-y-1">
                  <strong className="text-slate-900 block font-semibold text-xs">Complete Commander Firewall</strong>
                  <p className="text-slate-600">
                    Company commanders and field supervisory staff receive only unit-level operational readiness figures and aggregated platoon metrics. They are blocked from inspecting individual psychological responses, sleep ratings, or confidential distress signals.
                  </p>
                </div>
                <div className="p-3 rounded bg-white border border-slate-200 space-y-1">
                  <strong className="text-slate-900 block font-semibold text-xs">Voluntary Participation with Zero Penalty</strong>
                  <p className="text-slate-600">
                    Frontline troops can choose to skip daily wellbeing pulse assessments at any time with no negative impact on their professional evaluation, promotion prospects, or duty roster standing.
                  </p>
                </div>
                <div className="p-3 rounded bg-white border border-slate-200 space-y-1">
                  <strong className="text-slate-900 block font-semibold text-xs">Direct Confidential Clinical Referral</strong>
                  <p className="text-slate-600">
                    Troopers in acute distress are connected directly to professional medical officers and the National Tele-MANAS 24x7 helpline without intermediary chain-of-command routing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Rest & Circadian Welfare Guidelines */}
          {activeTab === "guidelines" && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded bg-slate-50 border border-slate-200 text-slate-900">
                <h3 className="font-bold text-sm text-[#0c3866] mb-1 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#0c3866]" />
                  Operational Rest &amp; Circadian Health Standards
                </h3>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Established in accordance with CRPF Standing Order 04/2020 and Bureau of Police Research and Development (BPR&amp;D) shift fatigue mitigation directives.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div className="p-3 rounded bg-white border border-slate-200 space-y-1">
                  <strong className="text-[#0c3866] block font-semibold text-xs">8-Hour Circadian Rest Barrier</strong>
                  <p className="text-slate-600">
                    A mandatory minimum 8-hour continuous rest period is required between consecutive operational shifts. The Unit Resilience Optimizer blocks swaps that violate this barrier.
                  </p>
                </div>

                <div className="p-3 rounded bg-white border border-slate-200 space-y-1">
                  <strong className="text-[#0c3866] block font-semibold text-xs">Night Shift Density Limit</strong>
                  <p className="text-slate-600">
                    Personnel are restricted to a maximum of 2 heavy or night shifts per rolling 7-day period to prevent acute circadian rhythm disruption.
                  </p>
                </div>

                <div className="p-3 rounded bg-white border border-slate-200 space-y-1">
                  <strong className="text-[#0c3866] block font-semibold text-xs">12-Hour Fast-Track Emergency Lane</strong>
                  <p className="text-slate-600">
                    Family emergencies, acute personal crises, and bereavement leave requests are automatically expedited with a mandatory 12-hour resolution SLA.
                  </p>
                </div>

                <div className="p-3 rounded bg-white border border-slate-200 space-y-1">
                  <strong className="text-[#0c3866] block font-semibold text-xs">Welfare Reserve Protection</strong>
                  <p className="text-slate-600">
                    Company commanders must maintain a minimum 15% rested personnel reserve to ensure operational continuity without overloading relief troopers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Emergency Helplines Banner */}
          <div className="p-3 rounded bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-[11px] mt-2">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-white">24x7 Confidential Clinical Assistance:</span>
                <span className="text-slate-300 ml-1">Tele-MANAS: <strong className="text-[#ff9933]">14416</strong> | CRPF Madadgaar: <strong className="text-[#ff9933]">14411</strong></span>
              </div>
            </div>
            <span className="text-[10px] text-slate-400">Toll-Free Government Helplines</span>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="ux4g-modal-actions bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Guidelines for Indian Government Websites (GIGW 3.0) &amp; UX4G 3.1.0
          </span>
          <button
            onClick={onClose}
            className="ux4g-btn ux4g-btn-primary ux4g-btn-md px-5 py-2 bg-[#0c3866] hover:bg-[#072648] text-white font-semibold text-xs rounded transition-colors cursor-pointer"
          >
            Acknowledge &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
