"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, Scale, Clock } from "lucide-react";
import { openPolicyModal } from "@/components/PolicyModalHost";

export const PortalFooter: React.FC = () => {
  return (
    <footer className="ux4g-footer-wrapper ux4g-footer-dark bg-[#051c36] text-slate-400 text-xs py-4 px-4 sm:px-6 lg:px-8 border-t border-white/10 mt-auto print:hidden">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>PRAHARI Defense Welfare Platform &mdash; Restricted Official Portal</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 font-mono">CRPF / MHA</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-slate-400">
          <span className="hidden md:inline text-amber-400/90 font-medium">Decision Support Only (Non-Clinical)</span>
          <button
            type="button"
            onClick={() => openPolicyModal("confidentiality")}
            className="hover:text-white underline cursor-pointer"
          >
            Section 21 MHCA
          </button>
          <button
            type="button"
            onClick={() => openPolicyModal("privacy")}
            className="hover:text-white underline cursor-pointer"
          >
            Privacy Charter
          </button>
          <button
            type="button"
            onClick={() => openPolicyModal("terms")}
            className="hover:text-white underline cursor-pointer"
          >
            Terms of Service
          </button>
          <button
            type="button"
            onClick={() => openPolicyModal("guidelines")}
            className="hover:text-white underline cursor-pointer"
          >
            Rest Guidelines
          </button>
          <Link href="/" className="hover:text-white underline">
            Public Website
          </Link>
        </div>
      </div>
    </footer>
  );
};
