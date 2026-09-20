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
    const isDismissed = sessionStorage.getItem("prahari_offline_banner_dismissed") === "true";
    if (isDismissed) setDismissed(true);
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

  const handleClearQueue = () => {
    try {
      localStorage.removeItem("prahari_offline_queue");
      setQueuedCount(0);
      setSyncError(null);
      setDismissed(true);
      sessionStorage.setItem("prahari_offline_banner_dismissed", "true");
      window.dispatchEvent(new Event("prahari_offline_update"));
    } catch {
      setQueuedCount(0);
    }
  };

  const syncQueue = async () => {
    if (!navigator.onLine || syncing) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const currentUser = getStoredUser();
      const stored = JSON.parse(localStorage.getItem("prahari_offline_queue") || "[]");
      const queue: any[] = Array.isArray(stored) ? stored : [];
      if (queue.length === 0) {
        setQueuedCount(0);
        return;
      }

      // Step 1: Attempt Atomic Batch Push via /sync/push
      try {
        const batchRes = await api.post("/sync/push", { items: queue }, {
          headers: { "X-Prahari-Sync": "true" },
        });
        if (batchRes.data && Array.isArray(batchRes.data.results)) {
          const syncedIds = new Set(
            batchRes.data.results
              .filter((r: any) => r.status === "synced" || r.status === "already_synced")
              .map((r: any) => r.queue_id)
          );
          if (syncedIds.size > 0) {
            const afterBatch = queue.filter((item) => !syncedIds.has(item.queue_id || item.id));
            localStorage.setItem("prahari_offline_queue", JSON.stringify(afterBatch));
            setQueuedCount(afterBatch.length);
            if (afterBatch.length === 0) {
              setSyncSuccess(true);
              setTimeout(() => setSyncSuccess(false), 4000);
              return;
            }
          }
        }
      } catch {
        // Fall through to individual item transmission
      }

      // Step 2: Individual Endpoint Transmission Fallback
      const currentStored = JSON.parse(localStorage.getItem("prahari_offline_queue") || "[]");
      const currentQueue: any[] = Array.isArray(currentStored) ? currentStored : [];
      const remaining: any[] = [];
      let transmitted = 0;

      for (let index = 0; index < currentQueue.length; index += 1) {
        const item = currentQueue[index];
        if (!item?.endpoint && !item?.action) {
          continue; // Discard malformed items without endpoints
        }

        const endpoint = item.endpoint || (item.action ? `/${item.action.replace(/^\//, '')}` : "/grievance/file");
        const body = { ...(item.body || item.payload || {}) };

        // Normalize payload fields
        if (!body.category) {
          body.category = body.request_type || "General Request";
        }
        if (!body.personnel_id && currentUser?.personnel_id) {
          body.personnel_id = currentUser.personnel_id;
        }

        try {
          await api.post(endpoint, body, {
            headers: {
              "Idempotency-Key": item.queue_id || item.id || `sync-${Date.now()}`,
              "X-Prahari-Sync": "true",
            },
          });
          transmitted += 1;
        } catch (error: any) {
          const status = error.response?.status;
          // 409 Conflict = already recorded on server, so treat as transmitted
          if (status === 409) {
            transmitted += 1;
            continue;
          }
          // 400 / 422 Unprocessable = invalid client data, discard to prevent wedging
          if (status === 400 || status === 422) {
            transmitted += 1; // Dropped bad item
            continue;
          }
          remaining.push(item);
          if (status === 401) {
            setSyncError("Sign in again to complete transmission.");
            remaining.push(...currentQueue.slice(index + 1));
            break;
          }
          if (status === 403) {
            setSyncError("Current account not authorized for this record.");
            remaining.push(...currentQueue.slice(index + 1));
            break;
          }
          if (!error.response) {
            setSyncError("Backend server temporarily unreachable. Will retry.");
            remaining.push(...currentQueue.slice(index + 1));
            break;
          }
          setSyncError(`Sync paused (HTTP ${status}).`);
          remaining.push(...currentQueue.slice(index + 1));
          break;
        }
      }

      localStorage.setItem("prahari_offline_queue", JSON.stringify(remaining));
      setQueuedCount(remaining.length);
      window.dispatchEvent(new Event("prahari_offline_update"));

      if (remaining.length === 0) {
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
            <>
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
              <button
                type="button"
                onClick={handleClearQueue}
                title="Discard unsynced offline queue"
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
              >
                Discard
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              sessionStorage.setItem("prahari_offline_banner_dismissed", "true");
            }}
            className="p-1 text-slate-500 hover:text-slate-800 rounded transition-colors cursor-pointer"
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
