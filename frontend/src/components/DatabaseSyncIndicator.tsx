"use client";

import React, { useState } from "react";
import { useDataSync } from "@/lib/useDataSync";
import {
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  Radio,
  Server,
  X,
  Layers,
  Clock,
  ShieldCheck,
} from "lucide-react";

export interface DatabaseSyncIndicatorProps {
  compact?: boolean;
}

export const DatabaseSyncIndicator: React.FC<DatabaseSyncIndicatorProps> = ({ compact = false }) => {
  const { syncState, latencyMs, lastSyncedAt, dbMetrics, queuedCount, forceSync } = useDataSync();
  const [showModal, setShowModal] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleForceSync = async () => {
    setIsManualSyncing(true);
    try {
      await forceSync();
    } finally {
      setIsManualSyncing(false);
    }
  };

  const getStatusBadge = () => {
    if (queuedCount > 0 && syncState === "offline") {
      return (
        <button
          onClick={() => setShowModal(true)}
          title="Working offline. Click to view local queue."
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/80 text-amber-300 font-mono text-[11px] hover:bg-amber-900 transition-colors cursor-pointer"
        >
          <WifiOff className="w-3 h-3 text-amber-400" />
          <span className="font-bold">OFFLINE ({queuedCount} QUEUED)</span>
        </button>
      );
    }

    switch (syncState) {
      case "connected":
        return (
          <button
            onClick={() => setShowModal(true)}
            title="Real-time SSE database stream active. Click for metrics."
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 font-mono text-[11px] hover:bg-emerald-900/80 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">
              {compact ? "SYNCED" : `DB SYNCED (${latencyMs.toFixed(1)}ms)`}
            </span>
          </button>
        );
      case "syncing":
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-950/80 border border-blue-600/80 text-blue-300 font-mono text-[11px]">
            <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
            <span className="font-bold">SYNCING...</span>
          </div>
        );
      case "fallback_poll":
        return (
          <button
            onClick={() => setShowModal(true)}
            title="Active via high-speed delta polling. Click for details."
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-700/60 text-cyan-300 font-mono text-[11px] hover:bg-cyan-900/80 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold">
              {compact ? "DELTA" : `DELTA SYNC (${latencyMs.toFixed(1)}ms)`}
            </span>
          </button>
        );
      case "offline":
        return (
          <button
            onClick={() => setShowModal(true)}
            title="Network disconnected. Requests are buffered locally."
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-300 font-mono text-[11px] hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <WifiOff className="w-3 h-3 text-slate-400" />
            <span className="font-bold">OFFLINE</span>
          </button>
        );
      case "connecting":
      default:
        return (
          <button
            onClick={() => setShowModal(true)}
            title="Connecting to database synchronization stream..."
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950/50 border border-amber-700/50 text-amber-300 font-mono text-[11px] cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>CONNECTING DB...</span>
          </button>
        );
    }
  };

  return (
    <>
      {getStatusBadge()}

      {/* Tactical Database Synchronization Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sync-modal-title"
        >
          <div className="bg-[#051c36] text-white border-2 border-[#0c3866] rounded-lg shadow-2xl max-w-xl w-full p-6 relative space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 id="sync-modal-title" className="text-sm font-bold tracking-wide uppercase font-mono text-white">
                    Database Telemetry & Real-Time Sync
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    MHA / CRPF Defense Operational Data Pipeline
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-[#072648] p-3 rounded border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Status</span>
                <span className="text-xs font-bold text-emerald-300 font-mono mt-0.5 block uppercase">
                  {syncState === "connected" ? "LIVE STREAM" : syncState}
                </span>
              </div>
              <div className="bg-[#072648] p-3 rounded border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Latency</span>
                <span className="text-xs font-bold text-cyan-300 font-mono mt-0.5 block">
                  {latencyMs.toFixed(2)} ms
                </span>
              </div>
              <div className="bg-[#072648] p-3 rounded border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Engine Mode</span>
                <span className="text-xs font-bold text-slate-200 font-mono mt-0.5 block">
                  WAL MMAP
                </span>
              </div>
              <div className="bg-[#072648] p-3 rounded border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Offline Queue</span>
                <span className={`text-xs font-bold font-mono mt-0.5 block ${queuedCount > 0 ? "text-amber-400" : "text-slate-400"}`}>
                  {queuedCount} Items
                </span>
              </div>
            </div>

            {/* Database Table Records */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  Synchronized Table Records
                </span>
                <span className="text-emerald-400">
                  Total: {dbMetrics?.total_records?.toLocaleString() ?? "1,000+"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div className="bg-[#072648]/80 px-3 py-2 rounded border border-white/5 flex justify-between items-center">
                  <span className="text-slate-400">Personnel:</span>
                  <strong className="text-white">{dbMetrics?.record_counts?.personnel ?? "1,002"}</strong>
                </div>
                <div className="bg-[#072648]/80 px-3 py-2 rounded border border-white/5 flex justify-between items-center">
                  <span className="text-slate-400">Units:</span>
                  <strong className="text-white">{dbMetrics?.record_counts?.units ?? "5"}</strong>
                </div>
                <div className="bg-[#072648]/80 px-3 py-2 rounded border border-white/5 flex justify-between items-center">
                  <span className="text-slate-400">Grievances:</span>
                  <strong className="text-white">{dbMetrics?.record_counts?.grievances ?? "788+"}</strong>
                </div>
                <div className="bg-[#072648]/80 px-3 py-2 rounded border border-white/5 flex justify-between items-center">
                  <span className="text-slate-400">Surveys:</span>
                  <strong className="text-white">{dbMetrics?.record_counts?.assessments ?? "200+"}</strong>
                </div>
                <div className="bg-[#072648]/80 px-3 py-2 rounded border border-white/5 flex justify-between items-center">
                  <span className="text-slate-400">Buddy Signals:</span>
                  <strong className="text-white">{dbMetrics?.record_counts?.buddy_signals ?? "200+"}</strong>
                </div>
                <div className="bg-[#072648]/80 px-3 py-2 rounded border border-white/5 flex justify-between items-center">
                  <span className="text-slate-400">Welfare Cases:</span>
                  <strong className="text-white">{dbMetrics?.record_counts?.welfare_cases ?? "100+"}</strong>
                </div>
              </div>
            </div>

            {/* Architecture Details & Last Sync */}
            <div className="p-3 bg-[#031427] rounded border border-white/10 text-[11px] font-mono text-slate-400 space-y-1">
              <div className="flex justify-between items-center">
                <span>Protocol:</span>
                <span className="text-white font-bold">Server-Sent Events (SSE) + Delta Sync</span>
              </div>
              <div className="flex justify-between items-center">
                <span>SQLite Concurrency:</span>
                <span className="text-emerald-400">WAL (Write-Ahead Logging) + 256MB MMAP</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Last Synchronized:</span>
                <span className="text-cyan-300">
                  {lastSyncedAt.toLocaleTimeString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    hour12: false,
                  })}{" "}
                  IST
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-[10px] text-slate-500 font-mono">
                Multi-tab synchronized via BroadcastChannel
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleForceSync}
                  disabled={isManualSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0c3866] hover:bg-[#114b87] text-white font-mono text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? "animate-spin" : ""}`} />
                  <span>{isManualSyncing ? "Syncing..." : "Force DB Sync Now"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
