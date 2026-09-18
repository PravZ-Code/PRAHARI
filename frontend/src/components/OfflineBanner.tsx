"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { WifiOff, Wifi, RefreshCw, CheckCircle2, X } from "lucide-react";
import { api } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";

type QueuedRequest = {
  queue_id: string;
  endpoint: string;
  body: Record<string, unknown>;
  reference_number?: string;
  [key: string]: unknown;
};

export const OfflineBanner: React.FC = () => {
  const pathname = usePathname();
  const [isOffline, setIsOffline] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [authed, setAuthed] = useState(false);

  const checkQueue = () => {
    try {
      const q = JSON.parse(localStorage.getItem("prahari_offline_queue") || "[]");
      setQueuedCount(Array.isArray(q) ? q.length : 0);
    } catch {
      setQueuedCount(0);
    }
  };

  useEffect(() => {
    setAuthed(isAuthenticated());
    setIsOffline(!navigator.onLine);
    checkQueue();

    const handleAuthChange = () => {
      const authenticated = isAuthenticated();
      setAuthed(authenticated);
      if (authenticated && navigator.onLine) {
        window.setTimeout(() => void syncQueue(), 150);
      }
    };

    const handleOnline = () => {
      setIsOffline(false);
      checkQueue();
      void syncQueue();
    };

    const handleOffline = () => {
      setIsOffline(true);
      checkQueue();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("prahari_offline_update", checkQueue);
    window.addEventListener("prahari_auth_change", handleAuthChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("prahari_offline_update", checkQueue);
      window.removeEventListener("prahari_auth_change", handleAuthChange);
    };
  }, []);

  const syncQueue = async () => {
    if (!navigator.onLine || syncing) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const currentUser = getStoredUser();
      const stored = JSON.parse(localStorage.getItem("prahari_offline_queue") || "[]");
      const queue: QueuedRequest[] = Array.isArray(stored) ? stored : [];
      const remaining: QueuedRequest[] = [];
      let transmitted = 0;
      for (let index = 0; index < queue.length; index += 1) {
        const item = queue[index];
        if (!item?.endpoint || !item?.body || !item.queue_id) {
          remaining.push(item);
          continue;
        }
        if (item.queued_by && currentUser?.username && item.queued_by !== currentUser.username) {
          remaining.push(item);
          setSyncError(`Sign in as ${item.queued_by} to transmit this saved request.`);
          remaining.push(...queue.slice(index + 1));
          break;
        }
        try {
          await api.post(item.endpoint, item.body, {
            headers: {
              "Idempotency-Key": item.queue_id,
              "X-Prahari-Sync": "true",
            },
          });
          transmitted += 1;
        } catch (error: any) {
          remaining.push(item);
          if (error.response?.status === 401) {
            setSyncError("Sign in again to transmit the saved request.");
            remaining.push(...queue.slice(index + 1));
            break;
          }
          if (error.response?.status === 403) {
            setSyncError("Your account is not authorised to transmit this request.");
            remaining.push(...queue.slice(index + 1));
            break;
          }
          if (!error.response) {
            setSyncError("The PRAHARI backend is unavailable. The request remains saved and will retry.");
            remaining.push(...queue.slice(index + 1));
            break;
          }
          setSyncError(
            error.response?.data?.detail
              ? `Sync failed: ${error.response.data.detail}`
              : `Sync failed (HTTP ${error.response.status}). The request remains saved.`
          );
          remaining.push(...queue.slice(index + 1));
          break;
        }
      }
      localStorage.setItem("prahari_offline_queue", JSON.stringify(remaining));
      setQueuedCount(remaining.length);
      if (transmitted > 0 && remaining.length === 0) {
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 4000);
      } else if (transmitted === 0 && remaining.length === 0) {
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 4000);
      }
    } finally {
      checkQueue();
      setSyncing(false);
    }
  };

  const handleSyncNow = async () => {
    await syncQueue();
  };

  const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/privacy";

  // Never clutter the public website or login screen for visitors without an active authenticated session
  if (dismissed || (!isOffline && queuedCount === 0 && !syncSuccess) || (isPublicPage && !authed)) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full py-2 px-4 text-xs font-semibold border-b flex items-center justify-between transition-colors ${
        isOffline
          ? "bg-amber-100 border-amber-300 text-amber-900"
          : syncSuccess
          ? "bg-emerald-100 border-emerald-300 text-emerald-900"
          : "bg-blue-50 border-blue-200 text-blue-900"
      }`}
    >
      <div className="max-w-7xl mx-auto w-full flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isOffline ? (
            <WifiOff className="w-4 h-4 text-amber-700 animate-pulse" />
          ) : syncSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          ) : (
            <Wifi className="w-4 h-4 text-blue-700" />
          )}
          <span>
            {isOffline ? (
              <>
                <strong>Offline Mode:</strong> Network disconnected. Welfare requests are saved on this device and will retry when connectivity returns.
              </>
            ) : syncSuccess ? (
              <>
                <strong>Sync Complete:</strong> All queued requests have been transmitted to the battalion welfare ledger.
              </>
            ) : syncError ? (
              <>
                <strong>Sync paused:</strong> {syncError}
              </>
            ) : (
              <>
                <strong>Network Restored:</strong> You have {queuedCount} unsynchronized offline welfare request(s).
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {queuedCount > 0 && (
            <button
              type="button"
              onClick={handleSyncNow}
              aria-label={`Sync ${queuedCount} queued welfare request${queuedCount === 1 ? "" : "s"}`}
              disabled={syncing || isOffline}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-bold text-slate-800 shadow-2xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
              <span>{syncing ? "Syncing..." : `Sync (${queuedCount})`}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 text-slate-500 hover:text-slate-800 rounded transition-colors"
            title="Dismiss notice"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
