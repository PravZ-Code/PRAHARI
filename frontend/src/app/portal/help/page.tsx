"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  PhoneCall,
  AlertTriangle,
  FileSpreadsheet,
  HeartHandshake,
  FileText,
  Shield,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Lock,
  Clock,
  Phone,
} from "lucide-react";
import { openPolicyModal } from "@/components/PolicyModalHost";

export default function PersonnelHelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How quickly are emergency leave applications processed?",
      a: "Family emergency applications are flagged for fast-track review with a target response time within 12 hours. They are routed directly through your unit's authorized welfare chain for immediate sanction.",
    },
    {
      q: "Who can see my voluntary wellbeing check-ins?",
      a: "Only authorized welfare officers and medical staff. In accordance with Section 21 of the Mental Healthcare Act 2017, Company Commanders only see aggregated unit readiness indicators. Your individual psychological check-ins and personal notes are strictly firewalled and cannot be used for disciplinary actions or performance appraisals.",
    },
    {
      q: "What should I do if my duty roster shows shifts I did not perform?",
      a: "You can submit a factual correction request using 'Report a Discrepancy'. Your submission is logged in the company audit trail and sent to the duty clerk for verification against the daily roll-call order.",
    },
    {
      q: "How does the portal work when there is no cellular or intranet signal?",
      a: "PRAHARI functions offline. Any leave or emergency request you submit while offline is saved securely on your device. Once network connection is restored, it is synced automatically to the server without requiring re-entry.",
    },
    {
      q: "How can I check who has viewed my personnel file?",
      a: "Go to 'Privacy & Data' from your profile menu. PRAHARI maintains an immutable audit log under the Digital Personal Data Protection Act 2023 showing the name, role, timestamp, and purpose for every officer who accessed your records.",
    },
    {
      q: "What is the procedure for bereavement or compassionate leave?",
      a: "Select 'Family Emergency' or 'Apply Leave' and choose compassionate / bereavement category. You may attach family telegrams or civil verification if available, or submit immediately for provisional approval.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Page Title */}
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Personnel Support & Help
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Access welfare support, report discrepancies, or contact authorized helpline officers.
          </p>
        </div>

        {/* 1. PRIMARY SUPPORT PATHWAYS (TASK-BASED) */}
        <section aria-labelledby="support-channels-heading" className="space-y-4">
          <h2
            id="support-channels-heading"
            className="text-xs font-bold uppercase tracking-wider text-slate-500"
          >
            How Can We Assist You?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Welfare Support */}
            <Link
              href="/request?type=welfare"
              className="p-5 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:shadow-xs transition-all group"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-lg bg-purple-50 text-purple-700 shrink-0">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors flex items-center justify-between">
                    <span>Welfare Support</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Request confidential assistance for family welfare, domestic challenges, or mental resilience.
                  </p>
                </div>
              </div>
            </Link>

            {/* Family Emergency */}
            <Link
              href="/emergency"
              className="p-5 rounded-xl bg-white border border-rose-200 hover:border-rose-400 hover:shadow-xs transition-all group"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="text-sm font-bold text-rose-900 group-hover:text-rose-700 transition-colors flex items-center justify-between">
                    <span>Family Emergency</span>
                    <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Immediate fast-track leave assistance for acute domestic or medical emergencies. 12h target.
                  </p>
                </div>
              </div>
            </Link>

            {/* Report a Discrepancy */}
            <Link
              href="/portal"
              className="p-5 rounded-xl bg-white border border-slate-200 hover:border-amber-300 hover:shadow-xs transition-all group"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-800 transition-colors flex items-center justify-between">
                    <span>Report a Discrepancy</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Submit factual corrections for duty rosters, night shift logs, or recorded leave balances.
                  </p>
                </div>
              </div>
            </Link>

            {/* Apply Leave */}
            <Link
              href="/request?type=leave"
              className="p-5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all group"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-lg bg-blue-50 text-[#0c3866] shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0c3866] transition-colors flex items-center justify-between">
                    <span>Apply for Leave</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Submit routine annual, casual, or compensatory leave applications.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* 2. CONTACT WELFARE OFFICER & HELPLINE */}
        <section
          id="contact"
          aria-labelledby="contact-heading"
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-[#0c3866]" />
            <h2 id="contact-heading" className="text-base font-bold text-slate-900">
              Contact Your Welfare Officer & Helplines
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Assigned Unit Caseworker
              </span>
              <p className="text-sm font-bold text-slate-900">
                Inspector (Welfare) Sunita Sharma
              </p>
              <p className="text-xs text-slate-600">
                142 Battalion Welfare Cell, CRPF
              </p>
              <div className="pt-2 flex items-center gap-3 text-xs">
                <a
                  href="tel:01124368630"
                  className="font-semibold text-[#0c3866] hover:underline inline-flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Extension 4210</span>
                </a>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500">Hours: 0800 &ndash; 1800 IST</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                24x7 CRPF Welfare Toll-Free
              </span>
              <p className="text-sm font-bold text-slate-900">
                14411 / 14416
              </p>
              <p className="text-xs text-slate-600">
                National CAPF Welfare Directorate Helpline
              </p>
              <div className="pt-2 text-xs text-slate-500">
                <span>Free from any mobile or landline across India</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. FREQUENTLY ASKED QUESTIONS */}
        <section aria-labelledby="faq-heading" className="space-y-4">
          <h2
            id="faq-heading"
            className="text-xs font-bold uppercase tracking-wider text-slate-500"
          >
            Frequently Asked Questions
          </h2>

          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="transition-colors">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50 cursor-pointer"
                  >
                    <span className="text-sm font-semibold text-slate-900">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-[#0c3866]" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 pt-1 text-xs text-slate-700 leading-relaxed bg-slate-50/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. STATUTORY POLICIES & CHARTERS */}
        <section className="bg-slate-100/80 rounded-xl border border-slate-200/80 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Statutory Guarantees & Guidelines
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            PRAHARI operates under statutory legal frameworks designed to safeguard personnel wellbeing:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => openPolicyModal("confidentiality")}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
            >
              Section 21 MHCA Confidentiality Charter
            </button>
            <button
              type="button"
              onClick={() => openPolicyModal("privacy")}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
            >
              DPDP Act 2023 Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => openPolicyModal("guidelines")}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
            >
              MHA Circadian Rest Orders
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
