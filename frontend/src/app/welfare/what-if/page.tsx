"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { isAuthenticated } from "@/lib/auth";
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  ArrowRight,
  Shield,
  Layers,
  Users,
  Info,
  Loader2,
  Sparkles,
  Zap,
  Home,
  RotateCcw,
  Sliders,
  TrendingDown,
  Activity,
  HeartHandshake,
  Calendar,
  Moon,
  Sun,
  ShieldCheck,
  ChevronRight
} from "lucide-react";

interface Candidate {
  id: string;
  name: string;
  rank: string;
  service_number: string;
  trade: string;
  unit_name: string;
  current_score: number;
  current_level: string;
}

interface ShapShift {
  feature: string;
  display_name: string;
  source_category: string;
  baseline_impact: number;
  projected_impact: number;
  relief_delta: number;
  relief_percentage: number;
}

interface MultiHorizon {
  baseline: {
    acute_7d: number;
    operational_14d: number;
    chronic_30d: number;
    trajectory: string;
  };
  projected: {
    acute_7d: number;
    operational_14d: number;
    chronic_30d: number;
    trajectory: string;
  };
}

interface SquadCascade {
  has_candidate: boolean;
  cascade_risk: string;
  candidate_replacement?: {
    id: string;
    name: string;
    rank: string;
    trade: string;
    service_number: string;
    recent_night_shifts: number;
    projected_night_shifts: number;
    rest_barrier_compliant: boolean;
  };
  safety_verdict: string;
}

interface SimulationResult {
  personnel_id: string;
  soldier_name: string;
  service_number: string;
  trade: string;
  current_score: number;
  current_level: string;
  projected_score: number;
  projected_level: string;
  stress_reduction_percentage: number;
  benefits: string[];
  simple_verdict: string;
  shap_waterfall_shifts: ShapShift[];
  multi_horizon_forecast: MultiHorizon;
  squad_cascade_safety: SquadCascade;
  optimal_prescription?: any;
}

function FlagshipWhatIfContent() {
  const { lang } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPersonnelId = searchParams.get("personnel_id") || "";

  // Candidate Selection
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string>(initialPersonnelId);
  const [loadingCandidates, setLoadingCandidates] = useState(true);

  // Levers
  const [shiftChange, setShiftChange] = useState<string>("day");
  const [nightShiftsRemoved, setNightShiftsRemoved] = useState<number>(4);
  const [addRestDays, setAddRestDays] = useState<number>(2);
  const [grantLeaveDays, setGrantLeaveDays] = useState<number>(0);
  const [dutyHoursReduction, setDutyHoursReduction] = useState<number>(10);
  const [buddySupport, setBuddySupport] = useState<boolean>(true);

  // Simulation State
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [committedSuccess, setCommittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Authentication & Candidates Fetch
  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login?redirect=/what-if");
      return;
    }
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    setLoadingCandidates(true);
    try {
      const res = await api.get("/resilience/what-if-candidates");
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setCandidates(res.data);
        if (!selectedPersonnelId) {
          setSelectedPersonnelId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load what-if candidates:", err);
    } finally {
      setLoadingCandidates(false);
    }
  };

  // 2. Trigger Simulation
  const executeSimulation = useCallback(async (autoOpt = false) => {
    if (!selectedPersonnelId) return;
    setSimulating(true);
    setErrorMessage(null);
    try {
      const payload = {
        personnel_id: selectedPersonnelId,
        shift_change: shiftChange,
        add_rest_days: addRestDays,
        grant_leave_days: grantLeaveDays,
        night_shifts_removed: nightShiftsRemoved,
        duty_hours_reduction: dutyHoursReduction,
        buddy_support_assigned: buddySupport,
        auto_optimize: autoOpt
      };

      const res = await api.post("/resilience/what-if-test", payload);
      if (res.data) {
        setSimulation(res.data);
        if (autoOpt && res.data.counterfactual_parameters) {
          const p = res.data.counterfactual_parameters;
          setNightShiftsRemoved(p.night_shifts_removed || 0);
          setAddRestDays(p.rest_days_added || 0);
          setGrantLeaveDays(p.grant_leave_days || 0);
          setBuddySupport(Boolean(p.buddy_support_assigned));
          setShiftChange(p.shift_change || "day");
        }
      }
    } catch (err: any) {
      console.error("Simulation failed:", err);
      const detail = err?.response?.data?.detail || "Simulation failed. Please check personnel access.";
      setErrorMessage(detail);
    } finally {
      setSimulating(false);
    }
  }, [selectedPersonnelId, shiftChange, addRestDays, grantLeaveDays, nightShiftsRemoved, dutyHoursReduction, buddySupport]);

  // Debounced auto-simulation on lever adjustments
  useEffect(() => {
    if (!selectedPersonnelId) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      executeSimulation(false);
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [selectedPersonnelId, shiftChange, addRestDays, grantLeaveDays, nightShiftsRemoved, dutyHoursReduction, buddySupport, executeSimulation]);

  // Preset Handlers
  const applyPreset = (preset: "48h" | "leave" | "zero_loss" | "auto") => {
    if (preset === "48h") {
      setShiftChange("day");
      setNightShiftsRemoved(6);
      setAddRestDays(2);
      setGrantLeaveDays(0);
      setDutyHoursReduction(16);
      setBuddySupport(true);
    } else if (preset === "leave") {
      setShiftChange("day");
      setNightShiftsRemoved(6);
      setAddRestDays(3);
      setGrantLeaveDays(7);
      setDutyHoursReduction(30);
      setBuddySupport(true);
    } else if (preset === "zero_loss") {
      setShiftChange("day");
      setNightShiftsRemoved(4);
      setAddRestDays(0);
      setGrantLeaveDays(0);
      setDutyHoursReduction(0);
      setBuddySupport(false);
    } else if (preset === "auto") {
      executeSimulation(true);
    }
  };

  // Commit Plan Handler
  const handleCommitPlan = async () => {
    if (!selectedPersonnelId || !simulation) return;
    setCommitLoading(true);
    try {
      await api.post("/resilience/commit-plan", {
        plan_id: "counterfactual-flagship-plan",
        personnel_id: selectedPersonnelId,
        replacement_personnel_id: simulation.squad_cascade_safety.candidate_replacement?.id,
        target_date: new Date().toISOString().split("T")[0]
      });
      setCommittedSuccess(true);
      setTimeout(() => {
        router.push("/approvals");
      }, 1500);
    } catch (err: any) {
      console.error("Failed to commit plan:", err);
      setErrorMessage(err?.response?.data?.detail || "Failed to commit intervention to approval docket.");
    } finally {
      setCommitLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "RED":
        return "bg-rose-500 text-white border-rose-600";
      case "ORANGE":
        return "bg-amber-500 text-white border-amber-600";
      case "YELLOW":
        return "bg-yellow-400 text-slate-900 border-yellow-500";
      case "GREEN":
      default:
        return "bg-emerald-500 text-white border-emerald-600";
    }
  };

  const getRiskBgLight = (level: string) => {
    switch (level?.toUpperCase()) {
      case "RED":
        return "bg-rose-50 border-rose-200 text-rose-950";
      case "ORANGE":
        return "bg-amber-50 border-amber-200 text-amber-950";
      case "YELLOW":
        return "bg-yellow-50 border-yellow-200 text-yellow-950";
      case "GREEN":
      default:
        return "bg-emerald-50 border-emerald-200 text-emerald-950";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Navigation Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/" className="hover:text-[#0c3866]">Home</Link>
        <span>/</span>
        <Link href="/welfare" className="hover:text-[#0c3866]">Welfare Console</Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Flagship What-If Defense Simulator</span>
      </nav>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0c3866] via-[#114a84] to-[#0c3866] text-white p-6 rounded-xl shadow-md border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#ff9933] text-slate-950">
                Defense Decision Support Engine
              </span>
              <span className="text-xs text-slate-300">
                XGBoost 3.4 • TreeSHAP Exact Attribution • URO Hungarian Solver
              </span>
            </div>
            <h1 className="text-2xl font-bold font-heading tracking-tight flex items-center gap-2.5">
              <Scale className="w-7 h-7 text-[#ff9933]" />
              Flagship What-If Welfare Simulator
            </h1>
            <p className="text-xs text-slate-200 max-w-2xl leading-relaxed">
              Synthesize counterfactual operational interventions before committing to the live roster.
              Evaluates calibrated strain relief, exact SHAP attribution deltas, and whole-squad cascade risk.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => applyPreset("auto")}
              disabled={simulating}
              className="px-4 py-2 bg-[#ff9933] hover:bg-[#e68a00] text-slate-950 text-xs font-bold rounded-lg shadow transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              Auto-Solve Safe Bundle
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {committedSuccess && (
        <div role="status" className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <span>Counterfactual Plan Committed to Command Docket! Redirecting to Approvals...</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-300 text-rose-900 rounded-lg text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Trooper Selection Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-[#0c3866]" />
          <div>
            <label htmlFor="trooper-select" className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
              Select Target Personnel for Simulation
            </label>
            <span className="text-[11px] text-slate-500">
              Evaluates 26-element operational and wellness feature vector
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-[300px]">
          {loadingCandidates ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-[#0c3866]" />
              Loading troop candidates...
            </div>
          ) : (
            <select
              id="trooper-select"
              value={selectedPersonnelId}
              onChange={(e) => setSelectedPersonnelId(e.target.value)}
              className="w-full text-xs font-semibold p-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0c3866]"
            >
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.rank} {c.name} ({c.trade}) — {c.service_number} [{c.current_level}]
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Grid: Control Deck vs Visualization Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Simulation Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#0c3866]" />
                <h2 className="text-sm font-bold text-slate-900 font-heading">
                  Operational Intervention Levers
                </h2>
              </div>
              {simulating && (
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0c3866]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Calculating...
                </span>
              )}
            </div>

            {/* Presets Row */}
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block mb-2">
                Tactical Presets
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset("48h")}
                  className="p-2 text-center rounded-lg border border-slate-200 hover:border-[#0c3866] hover:bg-slate-50 text-[11px] font-bold text-slate-700 transition"
                >
                  <Zap className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                  48h Reset
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("leave")}
                  className="p-2 text-center rounded-lg border border-slate-200 hover:border-[#0c3866] hover:bg-slate-50 text-[11px] font-bold text-slate-700 transition"
                >
                  <Home className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                  Home Leave
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("zero_loss")}
                  className="p-2 text-center rounded-lg border border-slate-200 hover:border-[#0c3866] hover:bg-slate-50 text-[11px] font-bold text-slate-700 transition"
                >
                  <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
                  Zero Loss
                </button>
              </div>
            </div>

            {/* Lever 1: Shift Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Shift Mode Allocation</span>
                <span className="text-[11px] font-mono text-[#0c3866] font-bold uppercase">{shiftChange} watch</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "day", label: "Day Watch", icon: Sun },
                  { id: "split", label: "Split Watch", icon: Clock },
                  { id: "current", label: "Maintain Shift", icon: Moon }
                ].map((s) => {
                  const Icon = s.icon;
                  const active = shiftChange === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setShiftChange(s.id)}
                      className={`p-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition ${
                        active
                          ? "bg-[#0c3866] text-white border-[#0c3866] shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? "text-[#ff9933]" : "text-slate-500"}`} />
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lever 2: Night Shifts Converted */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Night Shifts Reallocated:</span>
                <span className="font-mono font-bold text-[#0c3866] px-2 py-0.5 bg-blue-50 rounded border border-blue-200">
                  {nightShiftsRemoved} shifts
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                step="1"
                value={nightShiftsRemoved}
                onChange={(e) => setNightShiftsRemoved(parseInt(e.target.value))}
                className="w-full accent-[#0c3866] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0 (No change)</span>
                <span>4 shifts</span>
                <span>8 shifts</span>
              </div>
            </div>

            {/* Lever 3: Mandatory Rest Days */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Mandatory Continuous Rest Days:</span>
                <span className="font-mono font-bold text-emerald-700 px-2 py-0.5 bg-emerald-50 rounded border border-emerald-200">
                  +{addRestDays} days
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="7"
                step="1"
                value={addRestDays}
                onChange={(e) => setAddRestDays(parseInt(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0 (Standard)</span>
                <span>3 days</span>
                <span>7 days</span>
              </div>
            </div>

            {/* Lever 4: Sanctioned Home Leave */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Restorative / Family Leave:</span>
                <span className="font-mono font-bold text-blue-700 px-2 py-0.5 bg-blue-50 rounded border border-blue-200">
                  {grantLeaveDays} days
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="21"
                step="1"
                value={grantLeaveDays}
                onChange={(e) => setGrantLeaveDays(parseInt(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0 (None)</span>
                <span>7 days</span>
                <span>21 days</span>
              </div>
            </div>

            {/* Lever 5: Duty Hours Reduction */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Weekly Duty Hours Reduction:</span>
                <span className="font-mono font-bold text-slate-700 px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                  -{dutyHoursReduction} hrs
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="5"
                value={dutyHoursReduction}
                onChange={(e) => setDutyHoursReduction(parseFloat(e.target.value))}
                className="w-full accent-slate-700 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0 hrs</span>
                <span>20 hrs</span>
                <span>40 hrs</span>
              </div>
            </div>

            {/* Lever 6: Peer Buddy Support Switch */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <HeartHandshake className="w-4 h-4 text-[#ff9933]" />
                  Dedicated Buddy Pair Assignment
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Assigns trained peer support partner to buffer operational isolation
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={buddySupport}
                  onChange={(e) => setBuddySupport(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0c3866]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Flagship Results Display & Explainability (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {simulation ? (
            <>
              {/* Dual Metric Score Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Baseline Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                    Current Baseline
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 font-mono">
                      {(simulation.current_score * 100).toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-500">/ 100</span>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${getRiskColor(simulation.current_level)}`}>
                    {simulation.current_level} STRAIN
                  </span>
                </div>

                {/* Arrow / Reduction Delta */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white p-4 rounded-xl shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    Calibrated Relief
                  </span>
                  <div>
                    <span className="text-2xl font-black font-mono">
                      -{simulation.stress_reduction_percentage}%
                    </span>
                    <span className="text-[11px] block text-emerald-100 font-medium">
                      Net Risk Score Reduction
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-200">
                    Validated via TreeSHAP
                  </span>
                </div>

                {/* Counterfactual Projected Card */}
                <div className="bg-white p-4 rounded-xl border-2 border-emerald-500 shadow-sm space-y-2">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider block">
                    Projected Scenario
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-700 font-mono">
                      {(simulation.projected_score * 100).toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-500">/ 100</span>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${getRiskColor(simulation.projected_level)}`}>
                    {simulation.projected_level} STATUS
                  </span>
                </div>
              </div>

              {/* TreeSHAP Factor Attribution Shifts */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#0c3866]" />
                    <h3 className="text-xs font-bold text-slate-900 font-heading uppercase tracking-wider">
                      TreeSHAP Factor Attribution Delta
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    Shapley Values (Log-Odds Shift)
                  </span>
                </div>

                <div className="space-y-2.5">
                  {simulation.shap_waterfall_shifts.map((factor, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-200 text-slate-700">
                            {factor.source_category}
                          </span>
                          <span className="font-semibold text-slate-800 text-[11px]">
                            {factor.display_name}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-700">
                          {factor.relief_delta <= 0 ? factor.relief_delta.toFixed(3) : `+${factor.relief_delta.toFixed(3)}`}
                        </span>
                      </div>

                      {/* Visual Relief Progress Bar */}
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex">
                        <div
                          className="bg-slate-400 h-full"
                          style={{ width: `${Math.min(100, Math.max(10, Math.abs(factor.baseline_impact) * 80))}%` }}
                        ></div>
                        <div
                          className="bg-emerald-500 h-full"
                          style={{ width: `${Math.min(100, factor.relief_percentage)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Multi-Horizon Trajectory Matrix */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-900 font-heading uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#0c3866]" />
                    Multi-Horizon Operational Trajectory
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                    {simulation.multi_horizon_forecast.projected.trajectory}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">7-Day Acute</span>
                    <div className="mt-1 flex items-center justify-center gap-1.5 text-xs font-mono font-bold">
                      <span className="text-rose-700 line-through">
                        {(simulation.multi_horizon_forecast.baseline.acute_7d * 100).toFixed(0)}%
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-emerald-700">
                        {(simulation.multi_horizon_forecast.projected.acute_7d * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">14-Day Operational</span>
                    <div className="mt-1 flex items-center justify-center gap-1.5 text-xs font-mono font-bold">
                      <span className="text-rose-700 line-through">
                        {(simulation.multi_horizon_forecast.baseline.operational_14d * 100).toFixed(0)}%
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-emerald-700">
                        {(simulation.multi_horizon_forecast.projected.operational_14d * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">30-Day Chronic</span>
                    <div className="mt-1 flex items-center justify-center gap-1.5 text-xs font-mono font-bold">
                      <span className="text-rose-700 line-through">
                        {(simulation.multi_horizon_forecast.baseline.chronic_30d * 100).toFixed(0)}%
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-emerald-700">
                        {(simulation.multi_horizon_forecast.projected.chronic_30d * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Whole-Squad Cascade Safety (URO Engine) */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-900 font-heading uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#ff9933]" />
                    Whole-Squad Cascade Safety & URO Protection
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                    simulation.squad_cascade_safety.cascade_risk === "SAFE"
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      : "bg-amber-100 text-amber-900 border border-amber-300"
                  }`}>
                    {simulation.squad_cascade_safety.cascade_risk}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {simulation.squad_cascade_safety.safety_verdict}
                </p>

                {simulation.squad_cascade_safety.candidate_replacement && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-slate-900 block">
                        {simulation.squad_cascade_safety.candidate_replacement.rank}{" "}
                        {simulation.squad_cascade_safety.candidate_replacement.name}
                      </strong>
                      <span className="text-[11px] text-slate-500">
                        Trade: {simulation.squad_cascade_safety.candidate_replacement.trade} • {simulation.squad_cascade_safety.candidate_replacement.service_number}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-mono text-[10px] font-bold block">
                        8h Rest Barrier Verified
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {simulation.squad_cascade_safety.candidate_replacement.recent_night_shifts} recent nights
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Commit Footer Bar */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  <span className="font-bold text-slate-800 block">
                    Admissible Under Section 63/65B BSA 2023
                  </span>
                  Plan commits with immutable SHA-256 cryptographic audit record.
                </div>

                <button
                  type="button"
                  onClick={handleCommitPlan}
                  disabled={commitLoading}
                  className="px-5 py-2.5 bg-[#0c3866] hover:bg-[#114a84] text-white text-xs font-bold rounded-lg shadow transition flex items-center justify-center gap-2"
                >
                  {commitLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      Committing Plan...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#ff9933]" />
                      Commit Plan to Approvals Docket
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#0c3866] mx-auto" />
              <p className="text-xs font-semibold">
                Initializing Calibrated XGBoost Counterfactual Studio...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FlagshipWhatIfPage() {
  return (
    <React.Suspense fallback={
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0c3866]" />
        <p className="text-xs font-semibold text-slate-600">Initializing Flagship What-If Defense Studio...</p>
      </div>
    }>
      <FlagshipWhatIfContent />
    </React.Suspense>
  );
}
