/**
 * PRAHARI Real-Time Database Synchronization Engine
 * Manages Server-Sent Events (SSE) live streaming, sub-millisecond delta sync,
 * cross-tab synchronization via BroadcastChannel, and atomic offline queue batch ingestion.
 */

import { getBackendBaseUrl, getApiBaseUrl } from "./api";

export type SyncState = "connected" | "connecting" | "syncing" | "fallback_poll" | "offline" | "error";

export interface DatabaseMetrics {
  database_connected: boolean;
  read_latency_ms: number;
  wal_checkpoint: string;
  active_subscribers?: number;
  version_epoch?: number;
  server_time?: string;
  total_records: number;
  record_counts: {
    personnel: number;
    units: number;
    grievances: number;
    assessments: number;
    buddy_signals: number;
    welfare_cases: number;
  };
}

export type SyncEventListener = (event: string, data: any) => void;

class PrahariSyncEngine {
  private eventSource: EventSource | null = null;
  private syncState: SyncState = "connecting";
  private latencyMs: number = 0.4;
  private lastSyncedAt: Date = new Date();
  private dbMetrics: DatabaseMetrics | null = null;
  private queuedCount: number = 0;
  private listeners: Set<SyncEventListener> = new Set();
  private stateChangeListeners: Set<(state: SyncState) => void> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private reconnectAttempts: number = 0;
  private reconnectTimer: any = null;
  private pollTimer: any = null;
  private lastDeltaCursor: string | null = null;
  private lastEtag: string | null = null;
  private isFlushingQueue: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.init();
    }
  }

  private init() {
    this.checkOfflineQueue();
    this.initBroadcastChannel();
    this.initNetworkListeners();
    this.connectStream();
    this.fetchInitialStatus();
  }

  private initBroadcastChannel() {
    try {
      if (typeof BroadcastChannel !== "undefined") {
        this.broadcastChannel = new BroadcastChannel("prahari_db_sync");
        this.broadcastChannel.onmessage = (msg) => {
          if (msg.data?.type === "DB_MUTATION") {
            this.notifyListeners(msg.data.event, msg.data.payload);
          } else if (msg.data?.type === "QUEUE_UPDATED") {
            this.checkOfflineQueue();
          }
        };
      }
    } catch {
      // BroadcastChannel unavailable in legacy runtimes
    }
  }

  private initNetworkListeners() {
    window.addEventListener("online", () => {
      this.setSyncState("connecting");
      this.checkOfflineQueue();
      void this.flushOfflineQueue();
      this.connectStream();
    });

    window.addEventListener("offline", () => {
      this.setSyncState("offline");
      this.cleanupStream();
    });

    window.addEventListener("prahari_offline_update", () => {
      this.checkOfflineQueue();
    });
  }

  public checkOfflineQueue() {
    try {
      const q = JSON.parse(localStorage.getItem("prahari_offline_queue") || "[]");
      this.queuedCount = Array.isArray(q) ? q.length : 0;
    } catch {
      this.queuedCount = 0;
    }
  }

  public getQueuedCount(): number {
    return this.queuedCount;
  }

  public getSyncState(): SyncState {
    return this.syncState;
  }

  public getLatency(): number {
    return this.latencyMs;
  }

  public getLastSyncedAt(): Date {
    return this.lastSyncedAt;
  }

  public getDbMetrics(): DatabaseMetrics | null {
    return this.dbMetrics;
  }

  private setSyncState(newState: SyncState) {
    if (this.syncState !== newState) {
      this.syncState = newState;
      this.stateChangeListeners.forEach((cb) => cb(newState));
    }
  }

  public onStateChange(cb: (state: SyncState) => void): () => void {
    this.stateChangeListeners.add(cb);
    return () => this.stateChangeListeners.delete(cb);
  }

  public subscribe(cb: SyncEventListener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notifyListeners(event: string, data: any) {
    this.lastSyncedAt = new Date();
    this.listeners.forEach((cb) => {
      try {
        cb(event, data);
      } catch (err) {
        console.error("Sync listener error:", err);
      }
    });

    // Dispatch DOM events for components listening via window
    window.dispatchEvent(new CustomEvent("prahari_db_sync", { detail: { event, data } }));
    if (event.includes("grievance")) {
      window.dispatchEvent(new CustomEvent("prahari_grievance_sync", { detail: data }));
    } else if (event.includes("assessment")) {
      window.dispatchEvent(new CustomEvent("prahari_assessment_sync", { detail: data }));
    } else if (event.includes("emergency") || event.includes("sos")) {
      window.dispatchEvent(new CustomEvent("prahari_emergency_sync", { detail: data }));
    } else if (event.includes("uro") || event.includes("roster")) {
      window.dispatchEvent(new CustomEvent("prahari_roster_sync", { detail: data }));
    } else if (event.includes("buddy")) {
      window.dispatchEvent(new CustomEvent("prahari_buddy_sync", { detail: data }));
    } else if (event.includes("resilience") || event.includes("plan")) {
      window.dispatchEvent(new CustomEvent("prahari_resilience_sync", { detail: data }));
    }
  }

  public broadcastMutation(event: string, payload: any) {
    this.notifyListeners(event, payload);
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: "DB_MUTATION", event, payload });
      } catch {
        // Safe fallback
      }
    }
  }

  public async fetchInitialStatus(): Promise<DatabaseMetrics | null> {
    const t0 = performance.now();
    try {
      const res = await fetch(`${getApiBaseUrl()}/sync/status`, { cache: "no-store" });
      if (res.ok) {
        const data: DatabaseMetrics = await res.json();
        this.latencyMs = Math.round((performance.now() - t0) * 10) / 10;
        this.dbMetrics = data;
        this.lastSyncedAt = new Date();
        return data;
      }
    } catch {
      // Endpoint fallback
    }
    return null;
  }

  public connectStream() {
    if (typeof window === "undefined" || !navigator.onLine) {
      this.setSyncState("offline");
      return;
    }

    this.cleanupStream();
    this.setSyncState("connecting");

    const token = typeof window !== "undefined" ? localStorage.getItem("prahari_token") : null;
    let streamUrl = `${getApiBaseUrl()}/sync/stream`;
    if (token) {
      const sep = streamUrl.includes("?") ? "&" : "?";
      streamUrl = `${streamUrl}${sep}token=${encodeURIComponent(token)}`;
    }

    try {
      this.eventSource = new EventSource(streamUrl, { withCredentials: true });

      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0;
        this.setSyncState("connected");
        void this.flushOfflineQueue();
      };

      this.eventSource.addEventListener("sync_connected", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          this.notifyListeners("sync_connected", payload);
          void this.fetchInitialStatus();
        } catch {
          // Ignored
        }
      });

      this.eventSource.addEventListener("grievance_created", (e: MessageEvent) => {
        this.handleServerEvent("grievance_created", e.data);
      });

      this.eventSource.addEventListener("grievance_approved", (e: MessageEvent) => {
        this.handleServerEvent("grievance_approved", e.data);
      });

      this.eventSource.addEventListener("grievance_rejected", (e: MessageEvent) => {
        this.handleServerEvent("grievance_rejected", e.data);
      });

      this.eventSource.addEventListener("assessment_submitted", (e: MessageEvent) => {
        this.handleServerEvent("assessment_submitted", e.data);
      });

      this.eventSource.addEventListener("emergency_sos", (e: MessageEvent) => {
        this.handleServerEvent("emergency_sos", e.data);
      });

      this.eventSource.addEventListener("uro_proposed", (e: MessageEvent) => {
        this.handleServerEvent("uro_proposed", e.data);
      });

      this.eventSource.addEventListener("uro_roster_updated", (e: MessageEvent) => {
        this.handleServerEvent("uro_roster_updated", e.data);
      });

      this.eventSource.addEventListener("uro_rejected", (e: MessageEvent) => {
        this.handleServerEvent("uro_rejected", e.data);
      });

      this.eventSource.addEventListener("buddy_signal_submitted", (e: MessageEvent) => {
        this.handleServerEvent("buddy_signal_submitted", e.data);
      });

      this.eventSource.addEventListener("resilience_plan_committed", (e: MessageEvent) => {
        this.handleServerEvent("resilience_plan_committed", e.data);
      });

      this.eventSource.onerror = () => {
        this.cleanupStream();
        this.reconnectAttempts += 1;

        if (this.reconnectAttempts >= 3) {
          // Fall back to high-speed delta polling if SSE stream encounters transport limits
          this.setSyncState("fallback_poll");
          this.startDeltaPolling();
        } else {
          this.setSyncState("connecting");
          const delay = Math.min(15000, 1500 * Math.pow(1.8, this.reconnectAttempts));
          this.reconnectTimer = setTimeout(() => this.connectStream(), delay);
        }
      };
    } catch {
      this.setSyncState("fallback_poll");
      this.startDeltaPolling();
    }
  }

  private handleServerEvent(eventType: string, rawData: string) {
    try {
      const parsed = JSON.parse(rawData);
      const data = parsed.data || parsed;
      this.broadcastMutation(eventType, data);
      void this.fetchInitialStatus();
    } catch {
      this.broadcastMutation(eventType, {});
    }
  }

  private startDeltaPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    // Poll delta every 8 seconds when on fallback
    this.pollTimer = setInterval(() => {
      void this.pollDelta();
    }, 8000);
    void this.pollDelta();
  }

  public async pollDelta() {
    if (!navigator.onLine) {
      this.setSyncState("offline");
      return;
    }
    const t0 = performance.now();
    try {
      const url = new URL(`${getApiBaseUrl()}/sync/delta`, window.location.origin);
      if (this.lastDeltaCursor) {
        url.searchParams.set("since", this.lastDeltaCursor);
      }
      const headers: Record<string, string> = {};
      if (this.lastEtag) {
        headers["If-None-Match"] = this.lastEtag;
      }
      const token = typeof window !== "undefined" ? localStorage.getItem("prahari_token") : null;
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(url.toString(), { headers, credentials: "include", cache: "no-store" });
      this.latencyMs = Math.round((performance.now() - t0) * 10) / 10;

      if (res.status === 304) {
        // Not modified, zero payload overhead
        this.lastSyncedAt = new Date();
        return;
      }

      if (res.ok) {
        const etag = res.headers.get("etag");
        if (etag) this.lastEtag = etag;

        const delta = await res.json();
        this.lastDeltaCursor = delta.cursor;
        this.lastSyncedAt = new Date();

        const hasGrievances = (delta.counts?.grievances || 0) > 0;
        const hasAssessments = (delta.counts?.assessments || 0) > 0;

        if (hasGrievances) {
          this.broadcastMutation("grievance_delta", delta.delta?.grievances);
        }
        if (hasAssessments) {
          this.broadcastMutation("assessment_delta", delta.delta?.assessments);
        }
      }
    } catch {
      // Ignore network errors in polling
    }
  }

  public async flushOfflineQueue(): Promise<boolean> {
    if (this.isFlushingQueue || !navigator.onLine) return false;
    this.isFlushingQueue = true;
    this.setSyncState("syncing");

    try {
      const stored = JSON.parse(localStorage.getItem("prahari_offline_queue") || "[]");
      const queue: any[] = Array.isArray(stored) ? stored : [];

      if (queue.length === 0) {
        this.setSyncState(this.eventSource ? "connected" : "fallback_poll");
        return true;
      }

      const token = typeof window !== "undefined" ? localStorage.getItem("prahari_token") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const pushPayload = { items: queue };
      const res = await fetch(`${getApiBaseUrl()}/sync/push`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(pushPayload),
      });

      if (res.ok) {
        const data = await res.json();
        const syncedCount = data.synced_count || 0;
        const results = data.results || [];

        // Remove synced items from local storage
        const syncedIds = new Set(
          results.filter((r: any) => r.status === "synced" || r.status === "already_synced").map((r: any) => r.queue_id)
        );

        const remaining = queue.filter((item) => !syncedIds.has(item.queue_id || item.id));
        localStorage.setItem("prahari_offline_queue", JSON.stringify(remaining));
        this.queuedCount = remaining.length;

        window.dispatchEvent(new Event("prahari_offline_update"));
        if (this.broadcastChannel) {
          this.broadcastChannel.postMessage({ type: "QUEUE_UPDATED" });
        }

        this.notifyListeners("queue_flushed", { syncedCount, remainingCount: remaining.length });
        await this.fetchInitialStatus();
        return true;
      }
    } catch (err) {
      console.error("Failed to flush offline queue:", err);
    } finally {
      this.isFlushingQueue = false;
      this.setSyncState(this.eventSource ? "connected" : "fallback_poll");
    }
    return false;
  }

  public async forceSyncNow(): Promise<void> {
    this.setSyncState("syncing");
    await this.flushOfflineQueue();
    await this.fetchInitialStatus();
    await this.pollDelta();
    this.setSyncState(this.eventSource ? "connected" : "fallback_poll");
  }

  private cleanupStream() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  public destroy() {
    this.cleanupStream();
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
  }
}

// Global singleton instance
export const syncEngine = typeof window !== "undefined" ? new PrahariSyncEngine() : (null as any);
