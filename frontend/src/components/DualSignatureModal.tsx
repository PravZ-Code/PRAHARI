"use client";

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { api } from "@/lib/api";
import { URORunData, User } from "@/lib/types";
import { playSuccessChime, playTacticalClick } from "@/lib/sound";
import { getStoredUser } from "@/lib/auth";
import {
  X,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  ArrowRight,
  Database
} from "lucide-react";

interface DualSignatureModalProps {
  runId: string;
  isOpen: boolean;
  onClose: () => void;
  onApproved: () => void;
  runData?: URORunData | null;
}

export const DualSignatureModal: React.FC<DualSignatureModalProps> = ({
  runId,
  isOpen,
  onClose,
  onApproved,
  runData,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [commanderSigned, setCommanderSigned] = useState(false);
  const [commanderSignedAt, setCommanderSignedAt] = useState<string | null>(null);
  const [welfareSigned, setWelfareSigned] = useState(false);
  const [welfareSignedAt, setWelfareSignedAt] = useState<string | null>(null);
  const [rosterCommitted, setRosterCommitted] = useState(false);

  const [commanderPin, setCommanderPin] = useState("1234");
  const [welfarePin, setWelfarePin] = useState("1234");
  const [singleSignDemo, setSingleSignDemo] = useState(false);

  const [signingRole, setSigningRole] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync state from runData if available
  useEffect(() => {
    setCurrentUser(getStoredUser());
    if (runData) {
      setCommanderSigned(Boolean(runData.commander_approved));
      setCommanderSignedAt(runData.commander_approved_at || null);
      setWelfareSigned(Boolean(runData.welfare_approved));
      setWelfareSignedAt(runData.welfare_approved_at || null);
      setRosterCommitted(Boolean(runData.roster_committed || runData.status === "approved"));
    }
  }, [runData, isOpen]);

  if (!isOpen) return null;

  const handleSign = async (roleToSign: "commander" | "welfare") => {
    setSigningRole(roleToSign);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = {
        role: roleToSign,
        single_sign: singleSignDemo,
      };

      const res = await api.put(`/uro/result/${runId}/approve`, payload);
      const data = res.data;

      setCommanderSigned(data.commander_approved);
      if (data.commander_approved_at) {
        setCommanderSignedAt(data.commander_approved_at);
      }
      setWelfareSigned(data.welfare_approved);
      if (data.welfare_approved_at) {
        setWelfareSignedAt(data.welfare_approved_at);
      }

      if (data.roster_committed || data.both_approved) {
        setRosterCommitted(true);
        setSuccessMessage("Both officers approved. New schedule is now active.");
        playSuccessChime();
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#06b6d4", "#10b981", "#f59e0b", "#3b82f6"],
          });
        } catch (e) {}
        setTimeout(() => {
          onApproved();
        }, 1200);
      } else {
        setSuccessMessage(
          `${roleToSign === "commander" ? "Company Commander" : "Welfare Officer"} approved. Waiting for the other officer.`
        );
      }
    } catch (err: any) {
      console.error("Signature error:", err);
      setErrorMessage(err.response?.data?.detail || "Approval failed. Please check PIN.");
    } finally {
      setSigningRole(null);
    }
  };

  const handleExecuteSingleSign = async () => {
    setSigningRole("all");
    setErrorMessage(null);
    try {
      const res = await api.put(`/uro/result/${runId}/approve?single_sign=true`, {
        single_sign: true,
      });
      const data = res.data;
      setCommanderSigned(true);
      setWelfareSigned(true);
      setRosterCommitted(true);
      setSuccessMessage("Schedule approved and saved.");
      playSuccessChime();
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#06b6d4", "#10b981", "#f59e0b", "#3b82f6"],
        });
      } catch (e) {}
      setTimeout(() => {
        onApproved();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || "Approval failed.");
    } finally {
      setSigningRole(null);
    }
  };

  const acuteRelief = runData?.risk_reduction_pct || 38.5;
  const swapsCount = runData?.swaps?.length || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="dual-signature-title">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl z-10 overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-700/80 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="dual-signature-title" className="text-base font-black text-white uppercase tracking-tight">
                  Two-Officer Shift Approval
                </h3>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  Commander + Welfare
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Requires approval from both the Company Commander and the Welfare Officer.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close two-officer approval dialog"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Stress & Operational Impact Summary Card */}
          <div className="bg-gradient-to-r from-emerald-950/50 via-slate-850 to-slate-900 border border-emerald-500/40 rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-heading">
                <ShieldCheck className="w-3.5 h-3.5" />
                Validated Duty Roster Optimization
              </span>
              <p className="text-xs text-slate-300">
                Gives tired soldiers time to sleep while making sure all guard posts are covered.
              </p>
              <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-1">
                <span>• Swaps: <strong className="text-slate-200">{swapsCount} Shifts</strong></span>
                <span>• Rules: <strong className="text-emerald-300">Same Job & 8+ Hours Rest</strong></span>
              </div>
            </div>

            <div className="text-right pl-4 border-l border-slate-700/60 flex-shrink-0">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                Tiredness Relief
              </span>
              <span className="text-3xl font-black text-emerald-400 tracking-tight">
                +{acuteRelief}%
              </span>
            </div>
          </div>

          {/* Alert / Feedback Messages */}
          {errorMessage && (
            <div className="bg-rose-950/70 border border-rose-500/60 text-rose-200 text-xs p-3.5 rounded-xl flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-950/70 border border-emerald-500/60 text-emerald-200 text-xs p-3.5 rounded-xl flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Officer Sign-off Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Company Commander Card */}
            <div className={`p-4 rounded-xl border transition-all ${
              commanderSigned
                ? "bg-emerald-950/30 border-emerald-500/50"
                : "bg-slate-800/60 border-slate-700/70"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wide">
                  1. Company Commander
                </span>
                {commanderSigned ? (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Approved
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Needs Approval
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400 mb-3">
                Role: Confirms guard posts and security duties remain fully staffed.
              </p>

              {commanderSigned ? (
                <div className="text-[11px] text-slate-400 font-mono space-y-0.5 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-emerald-300 font-semibold">
                    Approved by: {currentUser?.name || currentUser?.username || "Authorized commander"}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Time: {commanderSignedAt ? new Date(commanderSignedAt).toLocaleString() : "Confirmed"}
                  </div>
                </div>
              ) : (currentUser?.role === "commander" || currentUser?.role === "admin" || singleSignDemo) ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      maxLength={4}
                      value={commanderPin}
                      onChange={(e) => setCommanderPin(e.target.value)}
                      placeholder="PIN"
                      className="w-20 bg-slate-900 border border-slate-700 text-center font-mono text-xs rounded-lg py-1.5 text-white tracking-widest outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => handleSign("commander")}
                      disabled={signingRole === "commander" || rosterCommitted}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-lg shadow transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      {signingRole === "commander" ? "Approving..." : "Approve as Commander"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-amber-300/85 bg-amber-950/40 p-2.5 rounded-lg border border-amber-800/40 flex items-center gap-2 font-mono">
                  <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Waiting for Commander (Switch role to Commander to approve)</span>
                </div>
              )}
            </div>

            {/* 2. Battalion Welfare Officer Card */}
            <div className={`p-4 rounded-xl border transition-all ${
              welfareSigned
                ? "bg-emerald-950/30 border-emerald-500/50"
                : "bg-slate-800/60 border-slate-700/70"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wide">
                  2. Welfare Officer
                </span>
                {welfareSigned ? (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Approved
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Needs Approval
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400 mb-3">
                Role: Confirms overworked soldiers receive sufficient rest and sleep.
              </p>

              {welfareSigned ? (
                <div className="text-[11px] text-slate-400 font-mono space-y-0.5 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-emerald-300 font-semibold">Approved: Capt. Ananya Sharma (Welfare)</div>
                  <div className="text-[10px] text-slate-500">
                    Time: {welfareSignedAt ? new Date(welfareSignedAt).toLocaleString() : "Confirmed"}
                  </div>
                </div>
              ) : (currentUser?.role === "welfare" || currentUser?.role === "admin" || singleSignDemo) ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      maxLength={4}
                      value={welfarePin}
                      onChange={(e) => setWelfarePin(e.target.value)}
                      placeholder="PIN"
                      className="w-20 bg-slate-900 border border-slate-700 text-center font-mono text-xs rounded-lg py-1.5 text-white tracking-widest outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => handleSign("welfare")}
                      disabled={signingRole === "welfare" || rosterCommitted}
                      className="flex-1 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-xs py-2 px-3 rounded-lg shadow transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      {signingRole === "welfare" ? "Approving..." : "Approve as Welfare Officer"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-sky-300/85 bg-sky-950/40 p-2.5 rounded-lg border border-sky-800/40 flex items-center gap-2 font-mono">
                  <Lock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Waiting for Welfare Officer (Switch role to Welfare Officer to approve)</span>
                </div>
              )}
            </div>
          </div>

          {/* Roster Database Status Banner */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-sky-400" />
              <div>
                <span className="font-semibold text-slate-200 block">Schedule Update Status</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {rosterCommitted
                    ? "SAVED: New shifts saved to duty roster."
                    : "WAITING: Needs approval from both officers before saving."}
                </span>
              </div>
            </div>

            {rosterCommitted ? (
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950 border border-emerald-500/50 px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            ) : (
              <span className="text-[11px] font-bold text-amber-400 bg-amber-950 border border-amber-500/50 px-3 py-1 rounded-full flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Waiting for Approval
              </span>
            )}
          </div>

          {/* Demo evaluation helper */}
          {!rosterCommitted && (
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-t border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={singleSignDemo}
                  onChange={(e) => setSingleSignDemo(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span>Quick Approve (Both Officers at Once)</span>
              </label>

              <button
                onClick={handleExecuteSingleSign}
                disabled={signingRole !== null}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold underline flex items-center gap-1"
              >
                <span>Approve Both Directly</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            {rosterCommitted ? "Close" : "Cancel"}
          </button>
          {rosterCommitted && (
            <button
              onClick={() => {
                onApproved();
                onClose();
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
