"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { CopilotBriefResponse, CopilotChatResponse } from "@/lib/types";
import {
  X,
  FileText,
  Send,
  ShieldCheck,
  BrainCircuit,
  User as UserIcon,
  RefreshCw,
  ExternalLink,
  Info,
  CheckCircle2,
  FileCheck
} from "lucide-react";

interface CopilotDrawerProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
  personnelName?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  cited_sources?: string[];
  model_used?: string;
  is_fallback?: boolean;
  timestamp: string;
}

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({
  caseId,
  isOpen,
  onClose,
  personnelName = "Trooper",
}) => {
  const [activeTab, setActiveTab] = useState<"brief" | "chat">("brief");
  const [brief, setBrief] = useState<CopilotBriefResponse | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  // Chat states
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !brief && !loadingBrief) {
      // Auto-load or prompt to generate
      fetchBrief(false);
    }
  }, [isOpen, caseId]);

  useEffect(() => {
    if (activeTab === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  const fetchBrief = async (forceRegenerate = false) => {
    if (!caseId) return;
    setLoadingBrief(true);
    setBriefError(null);
    try {
      // POST to /api/copilot/brief/{caseId}
      const res = await api.post(`/copilot/brief/${caseId}`, {
        custom_instructions: forceRegenerate ? "Refresh analysis with latest duty shifts and leave records." : null,
      });
      setBrief(res.data);
    } catch (err: any) {
      console.error("Copilot brief fetch error:", err);
      setBriefError(
        err.response?.data?.detail || "Could not load AI summary. Please check connection."
      );
    } finally {
      setLoadingBrief(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, presetQuery?: string) => {
    if (e) e.preventDefault();
    const query = presetQuery || inputText.trim();
    if (!query || isSending) return;

    const userMsg: ChatMessage = {
      id: "u-" + Date.now(),
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!presetQuery) setInputText("");
    setIsSending(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.post("/copilot/chat", {
        case_id: caseId,
        message: query,
        conversation_history: historyPayload,
      });

      const data: CopilotChatResponse = res.data;
      const assistantMsg: ChatMessage = {
        id: "a-" + Date.now(),
        role: "assistant",
        content: data.response,
        cited_sources: data.cited_sources,
        model_used: data.model_used,
        is_fallback: data.is_fallback,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: "err-" + Date.now(),
        role: "assistant",
        content: `Error contacting AI Assistant: ${err.response?.data?.detail || "Request failed."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  // Helper to parse citations and markdown in texts
  const renderFormattedMarkdown = (rawMarkdown: string) => {
    const lines = rawMarkdown.split("\n");
    return (
      <div className="space-y-3 text-xs leading-relaxed text-slate-200">
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          if (trimmed.startsWith("# ")) {
            return (
              <h1 key={idx} className="text-base font-black text-white pt-2 pb-1 border-b border-slate-700/60">
                {trimmed.replace("# ", "")}
              </h1>
            );
          }
          if (trimmed.startsWith("## ")) {
            return (
              <h2 key={idx} className="text-sm font-bold text-sky-300 pt-3 pb-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-sky-500 rounded-sm inline-block" />
                {trimmed.replace("## ", "")}
              </h2>
            );
          }
          if (trimmed.startsWith("### ")) {
            return (
              <h3 key={idx} className="text-xs font-bold text-slate-200 pt-2 text-slate-300">
                {trimmed.replace("### ", "")}
              </h3>
            );
          }
          if (trimmed === "---") {
            return <hr key={idx} className="border-slate-800 my-2.5" />;
          }
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-sky-400 mt-1">•</span>
                <div className="flex-1">{renderInlineChipsAndText(trimmed.replace(/^[-*]\s+/, ""))}</div>
              </div>
            );
          }
          const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (orderedMatch) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-sky-400 font-bold font-mono text-[11px] min-w-[16px]">
                  {orderedMatch[1]}.
                </span>
                <div className="flex-1">{renderInlineChipsAndText(orderedMatch[2])}</div>
              </div>
            );
          }
          if (!trimmed) {
            return <div key={idx} className="h-1.5" />;
          }

          return (
            <p key={idx} className="text-slate-300">
              {renderInlineChipsAndText(line)}
            </p>
          );
        })}
      </div>
    );
  };

  const renderInlineChipsAndText = (text: string) => {
    // Split into segments with [CITED: ...]
    const parts = text.split(/(\[CITED:[^\]]+\])/g);

    return parts.map((part, i) => {
      const citedMatch = part.match(/^\[CITED:\s*([A-Z_]+)\s*-\s*([^\]]+)\]$/);
      if (citedMatch) {
        const cat = citedMatch[1];
        const desc = citedMatch[2];

        let colorClasses = "bg-blue-950/80 border-blue-500/50 text-blue-300 hover:bg-blue-900/90";
        if (cat.includes("SHAP")) {
          colorClasses = "bg-purple-950/80 border-purple-500/50 text-purple-300 hover:bg-purple-900/90";
        } else if (cat.includes("DUTY") || cat.includes("ROSTER")) {
          colorClasses = "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/90";
        } else if (cat.includes("LEAVE")) {
          colorClasses = "bg-amber-950/80 border-amber-500/50 text-amber-300 hover:bg-amber-900/90";
        } else if (cat.includes("BUDDY")) {
          colorClasses = "bg-cyan-950/80 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/90";
        } else if (cat.includes("PREDICTION")) {
          colorClasses = "bg-rose-950/80 border-rose-500/50 text-rose-300 hover:bg-rose-900/90";
        }

        return (
          <span
            key={i}
            title={`Source Check: ${cat} | ${desc}`}
            className={`inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded text-[11px] font-mono border transition-all cursor-help ${colorClasses}`}
          >
            <ShieldCheck className="w-3 h-3 flex-shrink-0" />
            <strong className="font-semibold uppercase tracking-wider">{cat}:</strong>
            <span className="font-normal">{desc}</span>
          </span>
        );
      }

      // Handle bold **text**
      const boldSegments = part.split(/(\*\*[^*]+\*\*)/g);
      return (
        <span key={i}>
          {boldSegments.map((bPart, bIdx) => {
            if (bPart.startsWith("**") && bPart.endsWith("**")) {
              return (
                <strong key={bIdx} className="font-bold text-white">
                  {bPart.slice(2, -2)}
                </strong>
              );
            }
            if (bPart.startsWith("*") && bPart.endsWith("*")) {
              return (
                <em key={bIdx} className="italic text-slate-400">
                  {bPart.slice(1, -1)}
                </em>
              );
            }
            return bPart;
          })}
        </span>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end" role="dialog" aria-modal="true" aria-labelledby="copilot-drawer-title">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-2xl bg-slate-900 text-slate-100 border-l border-slate-700/80 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-700/80 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="copilot-drawer-title" className="text-sm font-black text-white tracking-wide uppercase font-heading">
                  Welfare Clinical Analysis & Briefing
                </h3>
                <span className="text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  MHA §21 CONFIDENTIAL
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Personnel Case Dossier • <span className="text-slate-200 font-semibold">{personnelName}</span> (Case #{caseId.slice(0, 8)})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-700/80 bg-slate-900/60 px-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab("brief")}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "brief"
                ? "border-sky-500 text-sky-400 bg-sky-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Personnel Brief
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "chat"
                ? "border-sky-500 text-sky-400 bg-sky-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Case Q&A
            {messages.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center text-slate-300">
                {messages.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === "brief" && (
            <div className="space-y-4">
              {/* Action Ribbon */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <FileCheck className="w-4 h-4 text-sky-400" />
                  <span>
                    Status:{" "}
                    {loadingBrief ? (
                      <span className="text-amber-400 font-semibold animate-pulse">
                        Creating Soldier Brief...
                      </span>
                    ) : brief ? (
                      <span className="text-emerald-400 font-semibold">
                        Brief Ready ({brief.model_used})
                      </span>
                    ) : (
                      <span className="text-slate-400">Ready to create brief</span>
                    )}
                  </span>
                </div>

                <button
                  onClick={() => fetchBrief(true)}
                  disabled={loadingBrief}
                  className="bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingBrief ? "animate-spin" : ""}`} />
                  {brief ? "Recreate Brief" : "Create Soldier Brief"}
                </button>
              </div>

              {/* Error Warning */}
              {briefError && (
                <div className="bg-rose-950/60 border border-rose-500/60 text-rose-200 text-xs p-3.5 rounded-xl flex items-start gap-2">
                  <Info className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Notice</strong>
                    <span>{briefError}</span>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loadingBrief && (
                <div className="p-12 text-center space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800/80">
                  <BrainCircuit className="w-10 h-10 text-sky-400 animate-pulse mx-auto" />
                  <h4 className="text-sm font-bold text-white">
                    Checking Duty Shifts & Leave History...
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Analyzing stress causes, buddy feedback, and duties to prepare a clear summary.
                  </p>
                </div>
              )}

              {/* Loaded Markdown Brief */}
              {!loadingBrief && brief && (
                <div className="space-y-4">
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-inner">
                    {renderFormattedMarkdown(brief.brief_markdown)}
                  </div>

                  {/* Cited Evidence Sources Summary */}
                  {brief.cited_sources && brief.cited_sources.length > 0 && (
                    <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3.5 space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Verified Sources ({brief.cited_sources.length} items checked)
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {brief.cited_sources.map((src, idx) => (
                          <span
                            key={idx}
                            className="bg-slate-900 border border-slate-700/70 text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono"
                          >
                            {src}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "chat" && (
            <div className="flex flex-col h-full space-y-4">
              {/* Preset suggestion prompts */}
              {messages.length === 0 && (
                <div className="space-y-3 p-4 bg-slate-950/40 rounded-2xl border border-slate-800">
                  <p className="text-xs font-semibold text-slate-300">
                    Suggested Questions:
                  </p>
                  <div className="flex flex-col gap-2">
                    {[
                      "What shift swaps will help this soldier get enough sleep?",
                      "Summarize leave denials over the past 3 months.",
                      "What welfare steps are recommended for this soldier?",
                      "Why is night duty the biggest stress factor?",
                    ].map((prompt, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => handleSendMessage(undefined, prompt)}
                        className="text-left text-xs bg-slate-900 hover:bg-slate-850 border border-slate-750 text-slate-300 hover:text-white p-2.5 rounded-xl transition-colors flex items-center justify-between"
                      >
                        <span>{prompt}</span>
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages display */}
              <div className="space-y-4 pb-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-lg bg-[#0c3866] border border-slate-700 flex items-center justify-center p-0.5 flex-shrink-0 mt-1 shadow-sm">
                        <img
                          src="/images/prahari_logo_trans.png"
                          alt="PRAHARI Welfare System"
                          className="w-full h-full object-contain filter drop-shadow-xs"
                        />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 text-xs ${
                        msg.role === "user"
                          ? "bg-sky-600 text-white rounded-br-none"
                          : "bg-slate-800 border border-slate-700/80 text-slate-200 rounded-bl-none shadow-md space-y-2"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div>{renderFormattedMarkdown(msg.content)}</div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-1 text-[10px] text-slate-400 font-mono">
                        {msg.model_used && (
                          <span className="text-[9px] text-slate-400">
                            {msg.model_used} {msg.is_fallback ? "(Automatic Welfare Rules)" : ""}
                          </span>
                        )}
                        <span className="ml-auto">{msg.timestamp}</span>
                      </div>
                    </div>

                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 mt-1">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
                {isSending && (
                  <div className="flex items-center gap-2 text-xs text-sky-400 font-semibold p-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI assistant is thinking...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
            </div>
          )}
        </div>

        {/* Chat input box at bottom */}
        {activeTab === "chat" && (
          <form
            onSubmit={(e) => handleSendMessage(e)}
            className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about duty shifts, leave history, or welfare steps..."
              className="flex-1 bg-slate-900 border border-slate-750 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="bg-sky-600 hover:bg-sky-500 text-white p-2.5 rounded-xl disabled:opacity-40 transition-colors shadow-sm"
              title="Send Prompt"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
