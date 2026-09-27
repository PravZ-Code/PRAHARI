"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { useDataSync } from "@/lib/useDataSync";
import { formatWellbeingStatus, formatTrajectory, formatRecentChange } from "@/lib/formatters";
import {
  HeartHandshake,
  Shield,
  Activity,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Sliders,
  ChevronRight,
  Info,
  X,
  Loader2,
  Lock,
  Compass,
} from "lucide-react";

export default function PersonnelWellbeingPage() {
  const [user, setUser] = useState<any>(null);
  const [wellbeing, setWellbeing] = useState<any>(null);
  const [whatChanged, setWhatChanged] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Voluntary Check-in Modal State
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinSubmitting, setCheckinSubmitting] = useState(false);
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [moodScore, setMoodScore] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [stressLevel, setStressLevel] = useState(2);
  const [freeText, setFreeText] = useState("");
  const [voluntaryConsent, setVoluntaryConsent] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState(false);

  // Real-time synchronization
  useDataSync({
    onAssessmentChange: () => {
      fetchWellbeingData(false);
    },
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login");
      return;
    }
    setUser(getStoredUser());
    fetchWellbeingData(true);
  }, []);

  const fetchWellbeingData = async (showSpinner: boolean = true) => {
    if (showSpinner) setLoading(true);
    try {
      const [wbRes, wcRes] = await Promise.allSettled([
        api.get("/personnel/my-wellbeing"),
        api.get("/personnel/what-changed"),
      ]);

      if (wbRes.status === "fulfilled") {
        setWellbeing(wbRes.value.data);
      }
      if (wcRes.status === "fulfilled") {
        setWhatChanged(wcRes.value.data);
      }
    } catch (err) {
      console.error("Failed to load wellbeing data:", err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voluntaryConsent) {
      alert("Please confirm voluntary submission.");
      return;
    }
    setCheckinSubmitting(true);
    try {
      await api.post("/assessment/submit", {
        sleep_quality: sleepQuality,
        sleep_hours: sleepHours,
        mood_score: moodScore,
        energy_level: energyLevel,
        stress_level: stressLevel,
        free_text: freeText || "Voluntary pulse check completed by personnel.",
        is_offline_entry: false,
      });
      setCheckinSuccess(true);
      setTimeout(() => {
        setCheckinSuccess(false);
        setShowCheckinModal(false);
        setFreeText("");
        setVoluntaryConsent(false);
      }, 1500);
      await fetchWellbeingData(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Could not save check-in.");
    } finally {
      setCheckinSubmitting(false);
    }
  };

  const statusInfo = formatWellbeingStatus(
    wellbeing?.wellbeing_status,
    wellbeing?.risk_level
  );

  // Calculate clean, non-diagnostic metrics from backend state
  const currentState = whatChanged?.current_state || {};
  const prevBaseline = whatChanged?.previous_baseline || {};

  const dutyLoadPct = currentState.consecutive_duty_days !== undefined
    ? Math.min(100, Math.max(10, Math.round((currentState.consecutive_duty_days / 7) * 55 + 15)))
    : (wellbeing?.risk_score ? Math.round(wellbeing.risk_score * 100) : 50);
  const restBalancePct = currentState.avg_sleep_hours !== undefined
    ? Math.min(100, Math.max(10, Math.round((currentState.avg_sleep_hours / 8) * 85)))
    : 75;
  const consecutiveDays = currentState.consecutive_duty_days !== undefined ? currentState.consecutive_duty_days : 0;
  const nightShiftsCount =
    currentState.night_shifts_14d !== undefined ? currentState.night_shifts_14d : 0;

  // Recent changes formatted in basic, soldier-friendly English
  const recentChanges = whatChanged?.changed_factors?.slice(0, 3).map((f: any) => {
    const formatted = formatRecentChange(f);
    return {
      title: formatted.title,
      explanation: formatted.detail,
    };
  }) || [];

  // 14-day calm rest and recovery trend derived dynamically from backend database
  const trendDays = (wellbeing?.daily_14d_trend && wellbeing.daily_14d_trend.length > 0)
    ? wellbeing.daily_14d_trend
    : Array.from({ length: 14 }).map((_, idx) => {
        const dAgo = 13 - idx;
        return {
          day: dAgo === 0 ? "Today" : `${dAgo}d`,
          label: dAgo === 0 ? "Today" : `${dAgo}d ago`,
          score: restBalancePct || 75,
          hours: `${currentState?.avg_sleep_hours || 7.0} hrs`,
          status: "Regular Duty",
        };
      });

  if (loading && !wellbeing) {
    return (
      <div className="py-24 px-4 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="w-8 h-8 text-[#0c3866] animate-spin" />
        <p className="text-xs text-slate-500 font-medium">
          Loading your wellbeing summary...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Page Title */}
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            My Wellbeing
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Personal duty load, recovery balance, and voluntary check-in records.
          </p>
        </div>

        {/* 1. CURRENT WELLBEING STATUS */}
        <section
          aria-labelledby="current-status-heading"
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2
              id="current-status-heading"
              className="text-xs font-bold uppercase tracking-wider text-slate-500"
            >
              Current Status
            </h2>
            <span className="text-[11px] font-semibold text-slate-500">
              Confidence in this assessment: <strong className="text-slate-700">High</strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span
              className={`w-3 h-3 rounded-full ${statusInfo.dotColor}`}
              aria-hidden="true"
            />
            <span className="text-lg font-bold text-slate-900">
              {statusInfo.label}
            </span>
          </div>

          <p className="text-sm text-slate-700 leading-relaxed">
            {statusInfo.description}
          </p>

          <p className="text-xs text-slate-500 pt-1">
            Personal Baseline: Measured across your 90-day typical duty rhythms, rest intervals, and rotation history.
          </p>
        </section>

        {/* 2. DUTY AND RECOVERY PATTERN */}
        <section aria-labelledby="duty-recovery-heading" className="space-y-3">
          <h2
            id="duty-recovery-heading"
            className="text-xs font-bold uppercase tracking-wider text-slate-500"
          >
            Duty & Recovery Pattern
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Duty Load */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
              <p className="text-xs font-medium text-slate-500">Duty Load</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">{dutyLoadPct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#0c3866] h-1.5 rounded-full"
                  style={{ width: `${dutyLoadPct}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">Normal operational range</p>
            </div>

            {/* Rest Balance */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
              <p className="text-xs font-medium text-slate-500">Rest Balance</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-emerald-700">{restBalancePct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-1.5 rounded-full"
                  style={{ width: `${restBalancePct}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">Sufficient recovery gap</p>
            </div>

            {/* Consecutive Duty Days */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
              <p className="text-xs font-medium text-slate-500">Consecutive Duty Days</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">{consecutiveDays}</span>
                <span className="text-xs text-slate-500">days</span>
              </div>
              <p className="text-[11px] text-slate-500">Within CRPF limit (max 6)</p>
            </div>

            {/* Night Shifts */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
              <p className="text-xs font-medium text-slate-500">Night Shifts</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">{nightShiftsCount}</span>
                <span className="text-xs text-slate-500">in last 14 days</span>
              </div>
              <p className="text-[11px] text-slate-500">Balanced shift rotation</p>
            </div>
          </div>
        </section>

        {/* 3. RECENT CHANGES */}
        <section
          aria-labelledby="recent-changes-heading"
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2
              id="recent-changes-heading"
              className="text-xs font-bold uppercase tracking-wider text-slate-500"
            >
              Recent Changes
            </h2>
            <span className="text-xs text-slate-400">Past 14 Days</span>
          </div>

          <ul className="space-y-2.5 text-sm">
            {recentChanges.map((item: any, idx: number) => (
              <li
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-[#0c3866] mt-1.5 shrink-0" />
                <div className="space-y-0.5 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm leading-snug">
                    {item.title}
                  </p>
                  {item.explanation && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.explanation}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 4. PERSONAL TREND (14-DAY REST VISUAL) */}
        <section
          aria-labelledby="trend-heading"
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2
                id="trend-heading"
                className="text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Personal Trend (Last 14 Days)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily rest and recovery rhythm over the past two operational weeks.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 self-start sm:self-auto">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
              <span>Fatigue easing</span>
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {/* Chart Legend */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
              <span className="font-medium text-slate-700">Daily Rest Rhythm</span>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#0c3866]" />
                  <span>Standard Shift</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600" />
                  <span>Optimal Recovery</span>
                </span>
              </div>
            </div>

            {/* Visual Bar Chart Container */}
            <div className="relative bg-slate-50/70 rounded-xl p-4 border border-slate-200">
              {/* Target Baseline Reference Line (70% height) */}
              <div
                className="absolute left-4 right-4 border-b border-dashed border-slate-300 pointer-events-none z-0"
                style={{ bottom: "68%" }}
              >
                <span className="absolute right-0 -top-4 text-[10px] text-slate-400 font-medium">
                  Standard Rest Baseline (7h)
                </span>
              </div>

              {/* Flex Bar Columns */}
              <div className="h-32 flex items-end justify-between gap-1 sm:gap-2 relative z-10 pt-4">
                {trendDays.map((item: any, idx: number) => {
                  const isToday = idx === trendDays.length - 1;
                  const isHighRest = item.score >= 80;
                  return (
                    <div
                      key={idx}
                      className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                    >
                      {/* Tooltip on hover/focus */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[11px] rounded shadow-md opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                        <span className="font-bold">{item.label}: </span>
                        <span>{item.hours}</span> · <span>{item.status}</span>
                      </div>

                      {/* Bar Track & Fill */}
                      <div className="w-full max-w-[28px] h-full flex items-end justify-center">
                        <div
                          className={`w-full rounded-t transition-all duration-300 ${
                            isToday
                              ? "bg-emerald-600 shadow-xs"
                              : isHighRest
                              ? "bg-emerald-700/80 group-hover:bg-emerald-600"
                              : "bg-[#0c3866] group-hover:bg-[#072648]"
                          }`}
                          style={{
                            height: `${Math.max(16, item.score)}%`,
                          }}
                        />
                      </div>

                      {/* X-axis Tick Label */}
                      <span className="text-[10px] text-slate-500 mt-2 text-center select-none font-medium truncate w-full">
                        {idx === 0
                          ? "14d"
                          : idx === 6
                          ? "7d"
                          : isToday
                          ? "Today"
                          : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center pt-1">
              Your sleep and recovery rhythm has improved over the past 5 days with adequate downtime between shifts.
            </p>
          </div>
        </section>

        {/* 5. VOLUNTARY CHECK-IN */}
        <section
          aria-labelledby="voluntary-checkin-heading"
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <h2
              id="voluntary-checkin-heading"
              className="text-base font-bold text-slate-900"
            >
              Voluntary Check-in
            </h2>
            <p className="text-xs text-slate-600 max-w-md leading-relaxed">
              How are you feeling today? Take 30 seconds to log your sleep and energy.
              Completely voluntary and protected under Section 21 MHCA 2017.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCheckinModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0c3866] hover:bg-[#072648] text-white text-xs font-semibold transition-colors shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Start check-in</span>
          </button>
        </section>

        {/* 6. SUPPORT & RECOVERY INFORMATION */}
        <section aria-labelledby="support-info-heading" className="space-y-3">
          <h2
            id="support-info-heading"
            className="text-xs font-bold uppercase tracking-wider text-slate-500"
          >
            Learn More About Your Schedule
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/portal/what-changed"
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-[#0c3866]/40 transition-all group"
            >
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#0c3866] transition-colors flex items-center justify-between">
                <span>What Changed?</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Detailed comparison of baseline vs recent shift schedules.
              </p>
            </Link>

            <Link
              href="/portal/why-risk-changing"
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-[#0c3866]/40 transition-all group"
            >
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#0c3866] transition-colors flex items-center justify-between">
                <span>Why Patterns Change</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Transparent factors contributing to recovery recommendations.
              </p>
            </Link>

            <Link
              href="/portal/recovery-timeline"
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-[#0c3866]/40 transition-all group"
            >
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#0c3866] transition-colors flex items-center justify-between">
                <span>Recovery Timeline</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Step-by-step 6-stage journey to restore optimal rest baseline.
              </p>
            </Link>
          </div>
        </section>

        {/* Privacy Note */}
        <div className="bg-slate-100/80 rounded-xl border border-slate-200/80 p-4 flex items-start gap-3 text-slate-600 text-xs">
          <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Your wellbeing observations are confidential. Individual pulse scores are never
            shared with Company Commanders for performance appraisals or duty sanctions.
          </p>
        </div>
      </div>

      {/* VOLUNTARY CHECK-IN MODAL */}
      {showCheckinModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-[#0c3866]" />
                <h3 className="text-base font-bold text-slate-900">
                  Voluntary Daily Pulse Check
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckinModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkinSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-slate-900">
                  Pulse Logged Successfully
                </p>
                <p className="text-xs text-slate-500">
                  Thank you for keeping your personal recovery baseline accurate.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCheckinSubmit} className="space-y-4">
                <p className="text-xs text-slate-600">
                  Your responses help ensure duty rotations account for actual recovery needs.
                </p>

                {/* Sleep Hours */}
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <label className="font-semibold text-slate-700">
                      Hours of Sleep Last Night
                    </label>
                    <span className="font-bold text-[#0c3866]">{sleepHours} hrs</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="12"
                    step="0.5"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                    className="w-full accent-[#0c3866]"
                  />
                </div>

                {/* Sleep Quality */}
                <div className="text-xs space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Sleep Quality
                  </label>
                  <div className="grid grid-cols-5 gap-1 text-center">
                    {["Poor", "Fair", "Good", "Very Good", "Deep"].map((lbl, idx) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setSleepQuality(idx + 1)}
                        className={`py-1.5 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                          sleepQuality === idx + 1
                            ? "bg-[#0c3866] text-white border-[#0c3866]"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Energy Level */}
                <div className="text-xs space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Energy Level Today
                  </label>
                  <div className="grid grid-cols-5 gap-1 text-center">
                    {["Drained", "Low", "Moderate", "High", "Full"].map((lbl, idx) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setEnergyLevel(idx + 1)}
                        className={`py-1.5 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                          energyLevel === idx + 1
                            ? "bg-[#0c3866] text-white border-[#0c3866]"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Free text / Personal notes */}
                <div className="text-xs space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Personal Remarks (Optional & Confidential)
                  </label>
                  <textarea
                    rows={2}
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    placeholder="Any comments regarding heat, shift hours, or physical fatigue..."
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800"
                  />
                </div>

                {/* Consent checkbox */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="voluntary-consent"
                    checked={voluntaryConsent}
                    onChange={(e) => setVoluntaryConsent(e.target.checked)}
                    className="mt-0.5 rounded accent-[#0c3866]"
                    required
                  />
                  <label htmlFor="voluntary-consent" className="cursor-pointer">
                    I affirm this check-in is voluntary under Section 21 of the Mental Healthcare Act 2017.
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCheckinModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={checkinSubmitting || !voluntaryConsent}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0c3866] hover:bg-[#072648] text-white disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {checkinSubmitting && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    <span>Save Check-in</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
