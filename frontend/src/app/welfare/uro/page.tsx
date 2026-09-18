"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { UnitCardData, URORunData, User } from "@/lib/types";
import { UROVisualizer } from "@/components/UROVisualizer";
import { DualSignatureModal } from "@/components/DualSignatureModal";
import { playTacticalClick, playSuccessChime } from "@/lib/sound";
import { useRouter } from "next/navigation";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import {
  RefreshCw,
  ArrowLeft,
  KeyRound,
  Shield,
  Layers,
  Sliders,
  CheckCircle2,
  Lock,
  Loader2,
  Calendar,
  Users,
  ShieldCheck,
} from "lucide-react";

export default function UROPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [units, setUnits] = useState<UnitCardData[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("2026-09-05");
  const [endDate, setEndDate] = useState<string>("2026-09-12");
  const [maxSwaps, setMaxSwaps] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [uroData, setUroData] = useState<URORunData | null>(null);
  const [isDualSignModalOpen, setIsDualSignModalOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    setCurrentUser(getStoredUser());
    fetchUnits();
  }, [router]);

  const fetchUnits = async () => {
    try {
      const res = await api.get("/commander/units");
      const list = res.data.units || [];
      setUnits(list);
      if (list.length > 0) {
        setSelectedUnitId(list[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOptimize = async () => {
    if (!selectedUnitId) return;
    playTacticalClick();
    setLoading(true);
    try {
      const res = await api.post(`/uro/optimize/${selectedUnitId}`, {
        roster_date_start: startDate,
        roster_date_end: endDate,
        max_swaps: maxSwaps,
        protect_minimum_manning: true,
      });
      setUroData(res.data);
      playSuccessChime();
    } catch (e) {
      console.error("URO execution error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenApproveModal = () => {
    if (!uroData?.run_id) return;
    playTacticalClick();
    setIsDualSignModalOpen(true);
  };

  const handleApproved = () => {
    if (uroData) {
      setUroData({
        ...uroData,
        status: "approved",
        commander_approved: true,
        welfare_approved: true,
        roster_committed: true,
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Official Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/" className="hover:text-[#0c3866] underline">Home</Link>
        <span>/</span>
        <Link
          href={currentUser?.role === "commander" ? "/commander" : "/welfare"}
          className="hover:text-[#0c3866] underline"
        >
          {currentUser?.role === "commander" ? "Readiness Workspace" : "Welfare Case Management"}
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold" aria-current="page">Unit Resilience Optimizer</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-[#0c3866] border border-blue-200">
              Operational Roster Balancing
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
              Dual Officer Authorization Mandate
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
            Unit Resilience Optimizer (URO Shift Swapper)
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Algorithmic fatigue-mitigation roster generator maintaining Military Occupational Specialty (MOS) trade compatibility and 8-hour circadian rest barriers.
          </p>
        </div>

        {/* Operational Guardrail Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-700 flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>MOS Trade Matched (GD ↔ GD)</span>
          </span>
          <span className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-700 flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>8-Hour Rest Barrier</span>
          </span>
          <span className="px-2.5 py-1 rounded bg-blue-50 border border-blue-200 text-[#0c3866] flex items-center gap-1.5 shadow-sm font-semibold">
            <Lock className="w-3.5 h-3.5 text-[#0c3866]" />
            <span>Co-Signature Sign-Off</span>
          </span>
        </div>
      </div>

      {/* Statutory Mandate Banner */}
      <div className="bg-blue-50/70 border-l-4 border-[#0c3866] p-3.5 rounded-r text-xs text-slate-800 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-[#0c3866] flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="font-bold text-[#0c3866] block">
            Co-Signature Authority Rule (MHA Standing Order):
          </strong>
          <p className="leading-relaxed">
            All proposed duty shifts remain advisory until authenticated by both the <strong>Company Commander</strong> (for operational sentry strength) and the <strong>Battalion Welfare Officer</strong> (for soldier circadian recovery).
          </p>
        </div>
      </div>

      {/* Control Configuration Card */}
      <div className="gov-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end text-xs">
        <div>
          <label className="text-slate-800 font-bold block mb-1">
            Formation / Company Unit
          </label>
          <select
            value={selectedUnitId}
            onChange={(e) => {
              playTacticalClick();
              setSelectedUnitId(e.target.value);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 rounded p-2.5 outline-none focus:ring-2 focus:ring-[#0c3866]"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.operational_area} - {u.strength} personnel)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-slate-800 font-bold block mb-1">
            Roster Period (7-Day Cycle)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded p-2 outline-none focus:ring-2 focus:ring-[#0c3866] text-xs"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded p-2 outline-none focus:ring-2 focus:ring-[#0c3866] text-xs"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-slate-800 font-bold mb-1">
            <span>Max Permitted Swaps:</span>
            <span className="text-[#0c3866] font-mono font-bold">
              {maxSwaps} swaps
            </span>
          </div>
          <input
            type="range"
            min={4}
            max={20}
            value={maxSwaps}
            onChange={(e) => setMaxSwaps(Number(e.target.value))}
            className="w-full accent-[#0c3866] cursor-pointer h-2 bg-slate-200 rounded"
          />
        </div>

        <div>
          <button
            onClick={handleOptimize}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#0c3866] hover:bg-[#0a2f55] text-white font-bold text-xs rounded shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Computing Safe Swaps...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 text-amber-300" />
                <span>Generate Fatigue-Relief Swaps</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Visualizer Display */}
      <UROVisualizer
        data={uroData}
        loading={loading}
        onApprove={handleOpenApproveModal}
        isApproving={approving}
      />

      {/* Dual-Signature Authorization Modal */}
      <DualSignatureModal
        runId={uroData?.run_id || ""}
        isOpen={isDualSignModalOpen}
        onClose={() => setIsDualSignModalOpen(false)}
        onApproved={handleApproved}
        runData={uroData}
      />
    </div>
  );
}
