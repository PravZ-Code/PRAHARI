"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, Lock, CheckCircle2, X } from "lucide-react";

export const CookieConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const acknowledged = localStorage.getItem("prahari_cookie_notice_acknowledged");
      if (!acknowledged) {
        setVisible(true);
      }
    } catch {
      // In case localStorage is disabled or throws in restricted environment
      setVisible(false);
    }
  }, []);

  const handleAcknowledge = () => {
    try {
      localStorage.setItem("prahari_cookie_notice_acknowledged", "true");
    } catch {
      // Ignore storage errors
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Cookie and Session Storage Notice"
      aria-live="polite"
      className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 bg-[#07172b]/95 text-white border-t-2 border-[#ff9933] shadow-2xl backdrop-blur-md transition-transform duration-300"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5 max-w-4xl">
          <div className="p-1.5 rounded bg-[#0c3866] border border-blue-400/30 text-[#ff9933] shrink-0 mt-0.5">
            <Lock className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <h2 className="font-bold text-slate-100 flex items-center gap-1.5 text-xs font-heading">
              <span>Government Security & Essential Session Storage Notice</span>
              <span className="text-[10px] text-emerald-400 font-mono px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-500/40">
                Zero Trackers
              </span>
            </h2>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              PRAHARI deploys <strong>strictly necessary session cookies and offline storage tokens</strong> required for cryptographic verification, role-based defense security, and forward-outpost offline resilience. In compliance with DPDP Act 2023 and GIGW 3.0, <strong>zero third-party advertising or telemetry trackers</strong> are deployed.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <Link
            href="/privacy#cookies"
            className="px-3 py-1.5 rounded border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff9933]"
          >
            Read Storage Policy
          </Link>
          <button
            type="button"
            onClick={handleAcknowledge}
            className="px-3.5 py-1.5 rounded bg-[#ff9933] hover:bg-[#e68822] text-[#07172b] font-bold text-[11px] transition-all flex items-center gap-1 shadow-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Acknowledge & Proceed</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
