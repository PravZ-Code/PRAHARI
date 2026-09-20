"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Lock, FileText, CheckCircle2, AlertCircle, HelpCircle, ExternalLink, PhoneCall, Mail } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { isAuthenticated } from "@/lib/auth";

export const GovernmentFooter: React.FC = () => {
  const { t, lang } = useTranslation();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const syncAuth = () => setAuthenticated(isAuthenticated());
    syncAuth();
    window.addEventListener("prahari_auth_change", syncAuth);
    return () => window.removeEventListener("prahari_auth_change", syncAuth);
  }, []);

  const protectedLink = (target: string) =>
    authenticated ? target : `/login?redirect=${encodeURIComponent(target)}`;

  return (
    <footer className="bg-[#0f172a] text-slate-300 text-xs border-t-4 border-[#ff9933] mt-16 print:hidden">
      {/* Official Government Partner Logos Strip (NIC Style) */}
      <div className="bg-[#09101f] border-b border-slate-800/80 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center sm:justify-between gap-6 opacity-90 hover:opacity-100 transition-opacity">
            {/* Swachh Bharat */}
            <a
              href="https://swachhbharatmission.ddws.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:scale-105 transition-transform"
              title="Swachh Bharat Abhiyan (External)"
            >
              <img
                src="/images/swachh_bharat.svg"
                alt="Swachh Bharat Abhiyan"
                className="h-9 w-auto object-contain filter brightness-95"
              />
            </a>

            {/* Digital India */}
            <a
              href="https://www.digitalindia.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:scale-105 transition-transform"
              title="Digital India (External)"
            >
              <img
                src="/images/digital_india.svg"
                alt="Digital India - Power to Empower"
                className="h-8 w-auto object-contain filter brightness-95"
              />
            </a>

            {/* Azadi Ka Amrit Mahotsav */}
            <div className="flex items-center gap-2 hover:scale-105 transition-transform" title="Azadi Ka Amrit Mahotsav">
              <img
                src="/images/azadi-ka-amrit-mahotsav-logo.png"
                alt="Azadi Ka Amrit Mahotsav"
                className="h-9 w-auto object-contain filter brightness-105"
              />
            </div>

            {/* National Informatics Centre (NIC) */}
            <a
              href="https://www.nic.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:scale-105 transition-transform"
              title="National Informatics Centre (NIC)"
            >
              <img
                src="/images/logo_of_national_informatics_centre.png"
                alt="National Informatics Centre"
                className="h-7 w-auto object-contain filter brightness-110"
              />
            </a>

            {/* India.gov.in */}
            <a
              href="https://www.india.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:scale-105 transition-transform"
              title="National Portal of India (External)"
            >
              <img
                src="/images/india_gov_in.svg"
                alt="National Portal of India"
                className="h-8 w-auto object-contain filter brightness-95"
              />
            </a>

            {/* STQC CQW Certified Badge */}
            <div className="flex items-center gap-2" title="Certified Quality Website (GIGW 3.0)">
              <img
                src="/images/stqc_badge.svg"
                alt="STQC CQW Certified - GIGW 3.0 Compliant"
                className="h-9 w-auto object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Top Links Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Col 1: About PRAHARI */}
          <div>
            <div className="flex items-center gap-3 text-white font-bold text-sm mb-3">
              <img
                src="/images/prahari_logo_trans.png"
                alt="PRAHARI Crest"
                className="w-10 h-10 object-contain filter brightness-110 shrink-0"
              />
              <div>
                <span className="font-heading block">{t.header.title}</span>
                <span className="text-[10px] text-[#ff9933] font-medium block">{t.header.motto}</span>
              </div>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              {t.footer.aboutDesc}
            </p>
            <div className="mt-3 p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-amber-300/90 leading-normal">
              <strong>{lang === "hi" ? "प्रमुख नियम: " : lang === "ta" ? "முக்கிய விதி: " : "Core Mandate: "}</strong>
              {lang === "hi" ? "सहायता पहले, पूर्वानुमान बाद में। कमान अधिकारी की प्रत्यक्ष मानवीय समीक्षा अनिवार्य है।" : lang === "ta" ? "முதலில் உதவி, அடுத்து கணிப்பு. கட்டளை அதிகாரியின் நேரடி மனித மதிப்பாய்வு கட்டாயமாகும்." : "Help First. Predict Second. Automated systems never decline leave independently."}
            </div>
          </div>

          {/* Col 2: Services & Quick Links */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3 border-b border-slate-800 pb-1 font-heading">
              {t.footer.portalsTitle}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href={protectedLink("/request?type=leave")} className="hover:text-white transition-colors">
                  {t.nav.requestLeave}
                </Link>
              </li>
              <li>
                <Link href={protectedLink("/emergency")} className="hover:text-white transition-colors flex items-center gap-1 text-red-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {t.nav.emergency}
                </Link>
              </li>
              <li>
                <Link href={protectedLink("/track")} className="hover:text-white transition-colors">
                  {t.nav.track}
                </Link>
              </li>
              <li>
                <Link href="/safety-net" className="hover:text-white transition-colors">
                  {t.nav.safetyNet}
                </Link>
              </li>
              <li>
                <Link href="/what-if" className="hover:text-white transition-colors">
                  {t.nav.tryPlan}
                </Link>
              </li>
              <li>
                <Link href="/approvals" className="hover:text-white transition-colors">
                  {t.nav.commandApprovals}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Policy & Statutory Compliance */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3 border-b border-slate-800 pb-1 font-heading">
              {t.footer.statutoryTitle}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors underline font-medium">
                  {t.nav.privacy}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors underline font-medium">
                  Terms of Service & System Usage Charter
                </Link>
              </li>
              <li>
                <span className="text-slate-400">Mental Healthcare Act 2017 (§21 Confidentiality)</span>
              </li>
              <li>
                <span className="text-slate-400">Bharatiya Sakshya Adhiniyam 2023 (§63 Audit Hash)</span>
              </li>
              <li>
                <span className="text-slate-400">DPDP Act 2023 (§7b, §7i State Processing)</span>
              </li>
              <li>
                <span className="text-slate-400">GIGW 3.0 & WCAG 2.1 Level AA Compliant</span>
              </li>
              <li className="pt-1">
                <span className="inline-block px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-amber-300 font-medium">
                  Decision Support System Only — Not a clinical diagnostic device
                </span>
              </li>
            </ul>
          </div>


          {/* Col 4: Troop Helplines & Ministry Info */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3 border-b border-slate-800 pb-1 font-heading">
              {t.footer.helplinesTitle}
            </h4>
            <div className="space-y-2.5 text-[11px] text-slate-400">
              <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-200">
                <strong className="text-emerald-100 font-bold block flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                  National Tele-MANAS (MoHFW)
                </strong>
                <span className="font-mono text-white text-xs font-bold">14416</span> / <span className="font-mono text-white text-xs font-bold">1800-891-4416</span>
                <span className="block text-[10px] text-emerald-300 mt-0.5">24x7 Multilingual Confidential Clinical Assistance</span>
              </div>

              <div className="p-2.5 rounded bg-blue-950/40 border border-blue-500/40 text-blue-200">
                <strong className="text-blue-100 font-bold block flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
                  CRPF 'Madadgaar' Helpline
                </strong>
                <span className="font-mono text-white text-xs font-bold">14411</span> / <span className="font-mono text-white text-xs font-bold">0194-2440210</span>
                <span className="block text-[10px] text-blue-300 mt-0.5">Citizen & Force Welfare Assistance</span>
              </div>

              <p className="pt-1">
                <strong className="text-slate-200">Ministry Oversight:</strong><br />
                Ministry of Home Affairs, North Block, New Delhi 110001
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Legal & GIGW Compliance Bar */}
      <div className="border-t border-slate-800 bg-[#070b14] py-4 text-[11px] text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-center md:text-left">
            {t.footer.copyright}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400">
            <span>{t.footer.lastUpdated}</span>
            <span>·</span>
            <span className="text-emerald-400 font-semibold">{t.footer.shaStatus}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
