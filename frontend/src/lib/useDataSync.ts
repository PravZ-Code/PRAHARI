"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { syncEngine, SyncState, DatabaseMetrics } from "./syncEngine";

export interface UseDataSyncOptions {
  onGrievanceChange?: (payload?: any) => void;
  onAssessmentChange?: (payload?: any) => void;
  onEmergencyAlert?: (payload?: any) => void;
  onSyncEvent?: (event: string, data: any) => void;
}

export function useDataSync(options: UseDataSyncOptions = {}) {
  const [syncState, setSyncState] = useState<SyncState>(() => syncEngine?.getSyncState() || "connecting");
  const [latencyMs, setLatencyMs] = useState<number>(() => syncEngine?.getLatency() || 0.4);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(() => syncEngine?.getLastSyncedAt() || new Date());
  const [dbMetrics, setDbMetrics] = useState<DatabaseMetrics | null>(() => syncEngine?.getDbMetrics() || null);
  const [queuedCount, setQueuedCount] = useState<number>(() => syncEngine?.getQueuedCount() || 0);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!syncEngine) return;

    setSyncState(syncEngine.getSyncState());
    setLatencyMs(syncEngine.getLatency());
    setLastSyncedAt(syncEngine.getLastSyncedAt());
    setDbMetrics(syncEngine.getDbMetrics());
    setQueuedCount(syncEngine.getQueuedCount());

    const unsubState = syncEngine.onStateChange((state: SyncState) => {
      setSyncState(state);
      setLatencyMs(syncEngine.getLatency());
      setLastSyncedAt(syncEngine.getLastSyncedAt());
      setDbMetrics(syncEngine.getDbMetrics());
      setQueuedCount(syncEngine.getQueuedCount());
    });

    const unsubEvents = syncEngine.subscribe((event: string, data: any) => {
      setLastSyncedAt(new Date());
      setLatencyMs(syncEngine.getLatency());
      setDbMetrics(syncEngine.getDbMetrics());
      setQueuedCount(syncEngine.getQueuedCount());

      const opts = optionsRef.current;
      if (opts.onSyncEvent) opts.onSyncEvent(event, data);

      if (event.includes("grievance") && opts.onGrievanceChange) {
        opts.onGrievanceChange(data);
      } else if (event.includes("assessment") && opts.onAssessmentChange) {
        opts.onAssessmentChange(data);
      } else if ((event.includes("emergency") || event.includes("sos")) && opts.onEmergencyAlert) {
        opts.onEmergencyAlert(data);
      }
    });

    return () => {
      unsubState();
      unsubEvents();
    };
  }, []);

  const forceSync = useCallback(async () => {
    if (syncEngine) {
      await syncEngine.forceSyncNow();
      setSyncState(syncEngine.getSyncState());
      setLatencyMs(syncEngine.getLatency());
      setLastSyncedAt(syncEngine.getLastSyncedAt());
      setDbMetrics(syncEngine.getDbMetrics());
      setQueuedCount(syncEngine.getQueuedCount());
    }
  }, []);

  return {
    syncState,
    latencyMs,
    lastSyncedAt,
    dbMetrics,
    queuedCount,
    forceSync,
  };
}
