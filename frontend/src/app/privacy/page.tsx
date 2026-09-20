"use client";

import React from "react";
import Link from "next/link";
import {
  Shield,
  Lock,
  EyeOff,
  Scale,
  CheckCircle2,
  ArrowLeft,
  FileText,
  PhoneCall,
  KeyRound,
  Fingerprint,
  UserCheck,
  AlertCircle
} from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/" className="hover:text-[#0c3866]">Home</Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Privacy Policy & Statutory Legal Governance</span>
      </nav>

      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#0c3866] text-white">
            <Lock className="w-5 h-5 text-[#ff9933]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0c3866]">
              Statutory Privacy & Legal Architecture
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Comprehensive legal compliance under BSA 2023, MHCA 2017, DPDP Act 2023, and CRPF Standing Order 04/2020
            </p>
          </div>
        </div>
      </div>

      <div className="ux4g-card ux4g-card-solid ux4g-card-vertical p-6 sm:p-8 space-y-6 text-xs text-slate-700 leading-relaxed">
        {/* Core Principles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-[#0c3866] font-bold text-sm">
              <Shield className="w-4 h-4" />
              <span>Role-Based Firewall (RBAC)</span>
            </div>
            <p>
              Segregates operational command data from confidential welfare dockets. Company Commanders access aggregate fatigue and swap recommendations; they cannot view private medical disclosures or personal grievances.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-[#0c3866] font-bold text-sm">
              <KeyRound className="w-4 h-4" />
              <span>Asymmetric Cryptographic Ledger</span>
            </div>
            <p>
              Every access attempt and approval is hashed (SHA-256) and signed with an isolated KMS hardware key. Verified admissible under Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023 (BSA).
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-[#0c3866] font-bold text-sm">
              <Scale className="w-4 h-4" />
              <span>Human-in-the-Loop Sovereign Gate</span>
            </div>
            <p>
              The system operates strictly under the principle: <em>Help First, Predict Second</em>. AI never takes automated punitive decisions; all roster swaps and leave approvals require human officer co-signature.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-[#0c3866] font-bold text-sm">
              <EyeOff className="w-4 h-4" />
              <span>Contextual Pseudonymity</span>
            </div>
            <p>
              Troopers remain pseudonymous toward company command dashboards and squad analytics. Full identification occurs exclusively within the encrypted, authorized welfare approval workflow.
            </p>
          </div>
        </div>

        {/* DPDP Act 2023 Statutory Governance */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <Fingerprint className="w-4 h-4 text-[#0c3866]" />
            <h2 className="text-sm font-bold text-[#0c3866] uppercase tracking-wider">
              Digital Personal Data Protection Act, 2023 (DPDP Act)
            </h2>
          </div>
          <p>
            PRAHARI processes digital personal data under the lawful grounds established in the Digital Personal Data Protection Act, 2023:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded border border-slate-200 bg-white">
              <strong className="text-slate-900 block text-xs">Section 7(b) — State Function Mandate</strong>
              <p className="text-[11px] text-slate-600 mt-1">
                Data processing is conducted for the lawful discharge of state functions and maintenance of public order and national security by the Central Armed Police Forces.
              </p>
            </div>
            <div className="p-3 rounded border border-slate-200 bg-white">
              <strong className="text-slate-900 block text-xs">Section 7(i) — Medical Emergency & Safety</strong>
              <p className="text-[11px] text-slate-600 mt-1">
                Authorizes necessary and proportionate welfare data processing to respond to acute operational stress, fatigue hazards, and prevent critical self-harm emergencies.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-600">
            Troopers retain their statutory rights as Data Principals under Section 12 of the DPDP Act 2023:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
              <strong className="text-[#0c3866] block font-bold">Right to Access (§11)</strong>
              <p className="text-slate-600 mt-0.5">Inspect every access event via the transparent Personal Access Log.</p>
            </div>
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
              <strong className="text-[#0c3866] block font-bold">Right to Correction (§12.1)</strong>
              <p className="text-slate-600 mt-0.5">Dispute incorrect duty roster entries with guaranteed 48-hour SLA review.</p>
            </div>
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
              <strong className="text-[#0c3866] block font-bold">Right to Erasure (§12.3)</strong>
              <p className="text-slate-600 mt-0.5">Request statutory redaction/deletion of voluntary pulse logs under 72-hour SLA.</p>
            </div>
          </div>
        </div>

        {/* Section: Data Minimization Principle */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <Shield className="w-4 h-4 text-[#0c3866]" />
            <h2 className="text-sm font-bold text-[#0c3866] uppercase tracking-wider">
              Data Minimization & Sovereign Scope (No Unnecessary Data)
            </h2>
          </div>
          <p>
            PRAHARI adheres strictly to the principle of purpose limitation and data minimization under Section 6 of the DPDP Act 2023:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
            <div className="p-3 rounded bg-emerald-50/70 border border-emerald-200 text-emerald-950 space-y-1">
              <strong className="font-bold block text-emerald-900">What PRAHARI Collects (Strictly Necessary):</strong>
              <ul className="list-disc pl-4 space-y-0.5 text-emerald-800">
                <li>Operational shift allocations (hours on duty, night shifts, continuous deployment).</li>
                <li>Voluntary daily wellbeing pulse (sleep hours, subjective rest quality - optional).</li>
                <li>Administrative leave requests and official grievance tracking IDs.</li>
              </ul>
            </div>
            <div className="p-3 rounded bg-rose-50/70 border border-rose-200 text-rose-950 space-y-1">
              <strong className="font-bold block text-rose-900">What PRAHARI NEVER Collects (Strictly Prohibited):</strong>
              <ul className="list-disc pl-4 space-y-0.5 text-rose-800">
                <li>No monitoring of personal phone calls, SMS, WhatsApp, or private communications.</li>
                <li>No browsing history, personal social media harvesting, or external telemetry.</li>
                <li>No unauthorized off-duty geolocation tracking or biometric surveillance.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section: Third-Party SDK Audit Verification */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <Lock className="w-4 h-4 text-[#0c3866]" />
            <h2 className="text-sm font-bold text-[#0c3866] uppercase tracking-wider">
              Third-Party SDK Audit & Sovereign Air-Gap Verification
            </h2>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            PRAHARI is engineered as a zero-telemetry, defense-grade sovereign application. In rigorous compliance with CAPF IT Security Directives and GIGW 3.0:
          </p>
          <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1.5 text-[11px]">
            <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Audit Passed: 0% External Tracking / Analytics SDKs</span>
            </div>
            <p className="text-slate-600">
              The platform contains <strong>zero third-party analytics, behavioral tracking, or advertising scripts</strong> (no Google Analytics, Meta Pixel, Mixpanel, Datadog, Sentry, or third-party CDNs). All application scripts, fonts (Google Noto Sans under SIL OFL), and UX4G components are compiled and served directly from sovereign defense servers. No personnel metadata ever leaves the controlled military network perimeter.
            </p>
          </div>
        </div>

        {/* Section: Cookies and Local Storage Transparency */}
        <div className="space-y-3 pt-2" id="cookies">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <Fingerprint className="w-4 h-4 text-[#0c3866]" />
            <h2 className="text-sm font-bold text-[#0c3866] uppercase tracking-wider">
              Essential Session Storage & Cookie Policy
            </h2>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            PRAHARI deploys <strong>exclusively strictly necessary session cookies and local storage tokens</strong> required for authentication, cryptographic nonces, and offline operational continuity:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
            <li><strong>prahari_session (HttpOnly, SameSite=Strict):</strong> Cryptographically signed session token ensuring secure role-based access.</li>
            <li><strong>prahari_token & prahari_user (Local Storage):</strong> Client-side tactical cache enabling offline check-ins and emergency SOS dispatch when forward outposts lose network connectivity.</li>
            <li><strong>Zero Tracking Cookies:</strong> No persistent marketing, profiling, or cross-site tracking cookies are ever utilized.</li>
          </ul>
        </div>

        {/* Section: Non-Clinical Decision Support Disclaimer */}
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertCircle className="w-4 h-4 text-amber-700" />
            <span>Non-Clinical Decision Support System Disclaimer</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            PRAHARI is an administrative operational stress-monitoring, fatigue-rebalancing, and welfare decision-support system. It does <strong>not</strong> provide psychiatric diagnoses, medical outcome guarantees, or clinical psychotherapy. Statistical risk scores reflect duty roster fatigue and operational strain patterns to assist commanding officers in preventative rest scheduling. Emergency clinical psychological support is routed directly to certified clinicians via National Tele-MANAS (14416).
          </p>
        </div>

        {/* Mental Healthcare Act 2017 Governance */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <Shield className="w-4 h-4 text-[#0c3866]" />
            <h2 className="text-sm font-bold text-[#0c3866] uppercase tracking-wider">
              Mental Healthcare Act, 2017 (MHCA) & Stigma Elimination
            </h2>
          </div>
          <div className="space-y-2">
            <div className="p-3 rounded bg-blue-50 border border-blue-200 text-slate-800">
              <h3 className="font-bold text-[#0c3866] text-xs">
                Section 21 & Section 23 — Non-Discrimination & Confidentiality
              </h3>
              <p className="mt-1 text-[11px]">
                Under Section 23 of the Mental Healthcare Act 2017, all mental health assessments and welfare disclosures are statutorily confidential. Section 21 guarantees that seeking support cannot be used as grounds for career prejudice, denied promotion, or administrative censure.
              </p>
            </div>

            <div className="p-3 rounded bg-amber-50 border border-amber-200 text-amber-950">
              <h3 className="font-bold text-amber-900 text-xs">
                Section 115 — Decriminalisation & State Duty of Care
              </h3>
              <p className="mt-1 text-[11px]">
                Section 115 presumes that any individual experiencing acute self-harm crisis is under severe stress and mandates that the Government has an active, non-punitive duty to provide medical care, rehabilitation, and administrative relief rather than judicial punishment.
              </p>
            </div>
          </div>
        </div>

        {/* Bharatiya Sakshya Adhiniyam, 2023 Governance */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <FileText className="w-4 h-4 text-[#0c3866]" />
            <h2 className="text-sm font-bold text-[#0c3866] uppercase tracking-wider">
              Bharatiya Sakshya Adhiniyam, 2023 (BSA) §63 & §63(4)
            </h2>
          </div>
          <p>
            Replacing the erstwhile Section 65B of the Indian Evidence Act 1872, <strong>Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023</strong> governs the admissibility of electronic records in judicial proceedings and statutory Courts of Inquiry:
          </p>
          <ul className="space-y-1.5 pl-4 list-disc text-[11px] text-slate-600">
            <li><strong>SHA-256 Cryptographic Block Chaining:</strong> Each record links sequentially to the preceding hash, rendering silent modification instantly detectable.</li>
            <li><strong>Isolated KMS Key Signatures:</strong> Transaction signatures are minted by an isolated key management service (KMS), preventing rogue system administrators from recomputing hashes undetected.</li>
            <li><strong>RFC 3161 Merkle Checkpoints:</strong> Head blocks are anchored into external Merkle checkpoint trees, providing verifiable mathematical proof of historical integrity.</li>
          </ul>
        </div>

        {/* Tele-MANAS Clinical Helpline Integration */}
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-300 space-y-2 text-emerald-950">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
            <PhoneCall className="w-4 h-4 text-emerald-700" />
            <span>National Tele-MANAS Psychological Support Helpline (MoHFW)</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            PRAHARI maintains an immediate referral bridge to <strong>Tele-MANAS</strong> (Tele Mental Health Assistance and Networking Across States), the Government of India&apos;s 24x7 comprehensive, confidential, and free mental health service.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded border border-emerald-300 font-mono text-xs font-bold text-emerald-900">
              <span>Toll-Free Helpline:</span>
              <span className="text-[#0c3866]">14416</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded border border-emerald-300 font-mono text-xs font-bold text-emerald-900">
              <span>Alternate Toll-Free:</span>
              <span className="text-[#0c3866]">1800-891-4416</span>
            </div>
            <span className="text-[10px] text-emerald-800 font-medium">Available in 20+ Regional Languages for all CRPF & CAPF Troopers</span>
          </div>
        </div>

        {/* Return Button & Terms Link */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="ux4g-btn ux4g-btn-outline-primary ux4g-btn-sm inline-flex items-center">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Return to Service Directory
          </Link>
          <Link href="/terms" className="text-xs font-semibold text-[#0c3866] hover:underline">
            View Terms of Service & System Usage Charter →
          </Link>
        </div>
      </div>
    </div>
  );
}

