"use client";

import React from "react";
import Link from "next/link";
import {
  Shield,
  FileCheck,
  Scale,
  Lock,
  ArrowLeft,
  AlertCircle,
  HelpCircle,
  PhoneCall,
  UserCheck,
  BookOpen,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/" className="hover:text-[#0c3866]">Home</Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Terms of Service & System Usage Charter</span>
      </nav>

      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#0c3866] text-white">
            <BookOpen className="w-5 h-5 text-[#ff9933]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0c3866]">
              Terms of Service & System Usage Charter
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Governing Defense Welfare Decision-Support, Operational Safety, and Personnel Rights under MHA & CRPF Guidelines
            </p>
          </div>
        </div>
      </div>

      <div className="ux4g-card ux4g-card-solid ux4g-card-vertical p-6 sm:p-8 space-y-6 text-xs text-slate-700 leading-relaxed">
        {/* Core Notice Banner */}
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-[#0c3866]">
            <Scale className="w-4 h-4" />
            <span>Authorized Official Platform Usage Charter</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            PRAHARI is an official welfare and operational resilience decision-support platform designed for Central Armed Police Forces (CAPF), starting with the Central Reserve Police Force (CRPF) under the Ministry of Home Affairs, Government of India. Access is strictly restricted to authorized defense personnel, welfare officers, and commanding officers.
          </p>
        </div>

        {/* Section 1: Non-Clinical Decision Support Disclaimer */}
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <span>1. Decision Support System Disclaimer (Non-Clinical Architecture)</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            <strong>PRAHARI is not a medical device, psychiatric diagnostic system, or clinical certification authority.</strong> All risk scores, strain trajectories, and Unit Resilience Optimizer (URO) recommendations serve strictly as operational decision support for administrative and welfare officers.
          </p>
          <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-900/90">
            <li>Machine learning models (XGBoost, TreeSHAP, and Hungarian matching) estimate operational strain and duty fatigue to assist human commanders in equitable rest rotation.</li>
            <li>No algorithm within PRAHARI is authorized or capable of providing clinical diagnoses of depression, PTSD, or psychiatric disorders.</li>
            <li>Emergency psychological support and clinical intervention are delivered independently through certified medical professionals and the National Tele-MANAS helpline (14416).</li>
          </ul>
        </div>

        {/* Section 2: Non-Punitive Doctrine & Section 21 MHCA Protection */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <Shield className="w-4 h-4 text-[#0c3866]" />
            <h2 className="text-sm font-bold text-[#0c3866] uppercase tracking-wider">
              2. Non-Punitive Doctrine & Statutory Career Protection
            </h2>
          </div>
          <p>
            PRAHARI operates on the sovereign doctrine: <strong>Help First, Predict Second</strong>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded border border-slate-200 bg-white space-y-1">
              <strong className="text-slate-900 block text-xs">Mental Healthcare Act 2017 (§21)</strong>
              <p className="text-[11px] text-slate-600">
                Participation in voluntary wellbeing check-ins or seeking confidential welfare counsel shall never be used as grounds for disciplinary inquiry, adverse entries in Annual Confidential Reports (ACR), denial of promotion, or punitive reassignment.
              </p>
            </div>
            <div className="p-3 rounded border border-slate-200 bg-white space-y-1">
              <strong className="text-slate-900 block text-xs">Human-in-the-Loop Sovereign Gate</strong>
              <p className="text-[11px] text-slate-600">
                No automated algorithm can decline a leave request, mandate disciplinary action, or alter personnel postings independently. Every recommendation requires the active review and dual co-signature of authorized human officers.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Role-Based Usage & Responsibilities */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <UserCheck className="w-4 h-4 text-[#0c3866]" />
            <h2 className="text-sm font-bold text-[#0c3866] uppercase tracking-wider">
              3. User Roles, Responsibilities & Access Boundaries
            </h2>
          </div>
          <div className="space-y-2 text-[11px]">
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <strong className="text-[#0c3866] block font-bold text-xs">Troopers & Jawans (Data Principals):</strong>
              <p className="text-slate-600 mt-1">
                Entitled to submit voluntary wellbeing check-ins, apply for administrative leave or welfare grants, track SLA deadlines in real-time, inspect personal data access transparency logs, and exercise statutory rights of correction and erasure under DPDP Act 2023.
              </p>
            </div>
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <strong className="text-[#0c3866] block font-bold text-xs">Welfare Officers (Confidential Custodians):</strong>
              <p className="text-slate-600 mt-1">
                Bound by strict statutory confidentiality under Section 23 of the Mental Healthcare Act 2017. Welfare Officers access confidential dossiers, coordinate peer buddy interventions, and initiate proactive support without disclosing private health disclosures to operational command.
              </p>
            </div>
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <strong className="text-[#0c3866] block font-bold text-xs">Company Commanders (Operational Authorities):</strong>
              <p className="text-slate-600 mt-1">
                Access aggregate battalion fatigue metrics, shift swap recommendations, and leave queues. Company commanders are strictly firewalled by software and cryptographic controls from viewing troopers' private medical records, mental health self-reports, or confidential grievance notes.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Evidentiary Admissibility under BSA 2023 §63(4) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <FileCheck className="w-4 h-4 text-[#0c3866]" />
            <h2 className="text-sm font-bold text-[#0c3866] uppercase tracking-wider">
              4. Cryptographic Audit Integrity (Bharatiya Sakshya Adhiniyam, 2023)
            </h2>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            All system interactions, roster allocations, leave adjudications, and access events are recorded in an immutable append-only cryptographic ledger. Each transaction block is linked by SHA-256 hash chains and signed by isolated hardware key management services (KMS), providing full compliance and admissibility under <strong>Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023</strong> for statutory Courts of Inquiry.
          </p>
        </div>

        {/* Section 5: Data Rights, Correction & Erasure */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <Lock className="w-4 h-4 text-[#0c3866]" />
            <h2 className="text-sm font-bold text-[#0c3866] uppercase tracking-wider">
              5. Data Principal Rights under DPDP Act 2023
            </h2>
          </div>
          <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-slate-600">
            <li><strong>Right to Access:</strong> Jawans can view every access event on their record via the Personal Access Transparency Log (`/portal/access-log`).</li>
            <li><strong>Right to Correction:</strong> Factual discrepancies in duty shifts, denial records, or posting records can be formally contested via the Data Correction portal (`POST /api/personnel/data-correction`) with an expedited 48-hour SLA.</li>
            <li><strong>Right to Erasure / Redaction:</strong> Voluntary daily pulse submissions and subjective notes can be formally requested for erasure or redaction under Section 12(3) (`POST /api/personnel/data-deletion`) with a 72-hour statutory SLA. Operational duty rosters mandated for state security remain preserved under DPDP §7(b).</li>
          </ul>
        </div>

        {/* Section 6: Emergency Contacts & Tele-MANAS Referral */}
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-300 space-y-2 text-emerald-950">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
            <PhoneCall className="w-4 h-4 text-emerald-700" />
            <span>Emergency Crisis Support & Statutory Redressal</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            If you or a colleague are experiencing acute operational stress, emotional crisis, or personal distress, immediate confidential support is available 24x7 without chain-of-command reporting:
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1 font-mono text-xs">
            <div className="px-3 py-1 bg-white rounded border border-emerald-300 font-bold text-emerald-900">
              Tele-MANAS: <span className="text-[#0c3866]">14416</span> / <span className="text-[#0c3866]">1800-891-4416</span>
            </div>
            <div className="px-3 py-1 bg-white rounded border border-emerald-300 font-bold text-emerald-900">
              CRPF Madadgaar: <span className="text-[#0c3866]">14411</span> / <span className="text-[#0c3866]">0194-2440210</span>
            </div>
          </div>
        </div>

        {/* Return & Privacy Links */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm inline-flex items-center">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Return to Service Directory
          </Link>
          <Link href="/privacy" className="text-xs font-semibold text-[#0c3866] hover:underline">
            View Statutory Privacy Policy & DPDP Charter →
          </Link>
        </div>
      </div>
    </div>
  );
}
