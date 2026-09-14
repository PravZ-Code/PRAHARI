"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { RiskBadge } from "@/components/RiskBadge";
import { ShapWaterfallChart } from "@/components/ShapWaterfallChart";
import { ArrowLeft, User } from "lucide-react";
import Link from "next/link";
import { isAuthenticated, getStoredUser } from "@/lib/auth";

export default function PersonnelProfilePage() {
  const params = useParams();
  const pid = params?.id as string;
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login?redirect=" + encodeURIComponent(window.location.pathname));
      return;
    }
    const user = getStoredUser();
    if (user && user.role !== "welfare" && user.role !== "welfare_officer" && user.role !== "admin") {
      window.location.replace("/portal");
      return;
    }
    if (pid) {
      api
        .get(`/welfare/personnel/${pid}/profile`)
        .then((res) => {
          setProfile(res.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load personnel profile:", err);
          if (err.response?.status === 403 || err.response?.status === 401) {
            window.location.replace("/login?redirect=" + encodeURIComponent(window.location.pathname));
          } else {
            setLoading(false);
          }
        });
    }
  }, [pid]);

  if (loading || !profile) {
    return <div className="p-8 text-center text-slate-400 text-xs">Loading soldier profile...</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto min-h-screen">
      <Link href="/welfare" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Welfare Support
      </Link>

      <div className="bg-defense-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-700/50 pb-4">
          <div>
            <h2 className="text-xl font-black text-white">{profile.personnel.name}</h2>
            <p className="text-xs text-slate-400">{profile.personnel.rank} • {profile.personnel.service_number}</p>
          </div>
          <RiskBadge level={profile.current_risk.risk_level} size="lg" score={profile.current_risk.risk_score} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-defense-900/80 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block">Posting Date</span>
            <strong className="text-white">{profile.personnel.current_posting_date}</strong>
          </div>
          <div className="bg-defense-900/80 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block">Months in Difficult Area</span>
            <strong className="text-rose-400">{profile.personnel.hard_area_months} Months</strong>
          </div>
          <div className="bg-defense-900/80 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block">Total Postings</span>
            <strong className="text-slate-200">{profile.personnel.total_transfers}</strong>
          </div>
          <div className="bg-defense-900/80 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block">Profile Baseline</span>
            <strong className="text-blue-400 uppercase">{profile.current_risk.baseline_type}</strong>
          </div>
        </div>

        {profile.shap_explanation && (
          <div className="space-y-3 pt-4 border-t border-slate-700/50">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Key Reasons for High Stress
            </h4>
            <ShapWaterfallChart factors={profile.shap_explanation} />
          </div>
        )}
      </div>
    </div>
  );
}
