"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getStoredUser, isAuthenticated, logout } from "@/lib/auth";
import { useRouter } from "next/navigation";
import {
  User,
  Shield,
  Lock,
  Phone,
  Building2,
  Calendar,
  Award,
  LogOut,
  ChevronRight,
  CheckCircle2,
  Loader2,
  LifeBuoy,
} from "lucide-react";

export default function PersonnelProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login");
      return;
    }
    const currentUser = getStoredUser();
    setUser(currentUser);
    api.get("/personnel/me")
      .then((res) => {
        setProfile(res.data);
      })
      .catch((err) => {
        console.warn("Personnel profile endpoint not available, trying /auth/me:", err);
        return api.get("/auth/me").then((res) => setProfile(res.data));
      })
      .catch((err) => {
        console.error("Profile load error:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const name = profile?.name || user?.name || user?.username || "Trooper";
  const serviceNumber = profile?.service_number || user?.service_number || "—";
  const rank = profile?.rank || user?.rank || "Personnel";
  const trade = profile?.trade || user?.trade || "General Duty";
  const unitName = profile?.unit_name || user?.unit_name || "Assigned Battalion";
  const joiningDate = profile?.date_of_joining
    ? new Date(profile.date_of_joining).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Verified on record";
  const hardAreaMonths =
    profile?.hard_area_months !== undefined && profile?.hard_area_months !== null
      ? `${profile.hard_area_months} Months`
      : "Standard Deployment";

  if (loading && !profile) {
    return (
      <div className="py-24 px-4 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="w-8 h-8 text-[#0c3866] animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header */}
        <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              My Profile
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Verified service identity and account credentials.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* 1. Identity Overview Card */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-[#0c3866]/10 text-[#0c3866] flex items-center justify-center font-bold text-xl shrink-0">
              {name.charAt(0)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">{name}</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active Service
                </span>
              </div>
              <p className="text-xs font-mono text-slate-600">
                Service Number: <strong>{serviceNumber}</strong>
              </p>
              <p className="text-xs text-slate-500">
                {rank} &bull; {trade}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div className="space-y-1">
              <span className="font-semibold text-slate-500 block">Unit & Formation</span>
              <p className="text-sm font-medium text-slate-900">{unitName}</p>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-slate-500 block">Parent Directorate</span>
              <p className="text-sm font-medium text-slate-900">CRPF Directorate General, MHA</p>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-slate-500 block">Date of Enlistment</span>
              <p className="text-sm font-medium text-slate-900">{joiningDate}</p>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-slate-500 block">Hard Area Service Duration</span>
              <p className="text-sm font-medium text-slate-900">{hardAreaMonths}</p>
            </div>
          </div>
        </section>

        {/* 2. Security & Credentials */}
        <section id="security" className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#0c3866]" />
            <h2 className="text-base font-bold text-slate-900">Security & Credentials</h2>
          </div>

          <div className="space-y-3 text-xs text-slate-700">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="font-semibold text-slate-900 block">Authentication Method</span>
                <span className="text-slate-500 text-[11px]">CRPF Service SSO / Token Session</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Encrypted
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="font-semibold text-slate-900 block">Session Status</span>
                <span className="text-slate-500 text-[11px]">Active intranet authorization</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Verified
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed pt-1">
            To reset intranet passwords or update verified biometrics, please contact your unit IT clerk or Battalion Signal Center.
          </p>
        </section>

        {/* 3. Quick Links to Privacy & Help */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <Link
            href="/portal/privacy"
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-[#0c3866]/40 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-slate-500" />
              <span className="font-bold text-slate-800 group-hover:text-[#0c3866]">
                Privacy & Data Access History
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            href="/portal/help"
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-[#0c3866]/40 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <LifeBuoy className="w-4 h-4 text-slate-500" />
              <span className="font-bold text-slate-800 group-hover:text-[#0c3866]">
                Help & Welfare Contacts
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
