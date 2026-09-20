"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const PortalFooter: React.FC = () => {
  return (
    <footer className="bg-[#051c36] text-slate-400 text-xs py-4 px-4 sm:px-6 lg:px-8 border-t border-white/10 mt-auto print:hidden">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>PRAHARI Defense Welfare Platform — Restricted Official Portal</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 font-mono">CRPF / MHA</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span className="hidden md:inline text-amber-400/90 font-medium">Decision Support Only (Non-Clinical)</span>
          <span>Section 21 MHCA 2017</span>
          <Link href="/privacy" className="hover:text-white underline">
            Privacy Charter
          </Link>
          <Link href="/terms" className="hover:text-white underline">
            Terms of Service
          </Link>
          <Link href="/" className="hover:text-white underline">
            Public Website
          </Link>
        </div>
      </div>
    </footer>

  );
};
