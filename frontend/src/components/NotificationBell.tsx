"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Clock, ExternalLink, AlertTriangle, ShieldAlert, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

interface NotificationItem {
  id: string;
  recipient_role?: string;
  title: string;
  message: string;
  link?: string;
  priority: string;
  entity_type?: string;
  is_read: boolean;
  read_at?: string;
  created_at?: string;
}

interface NotificationSummary {
  unread_count: number;
  since_previous_login_count: number;
  previous_login_at?: string;
  last_login_at?: string;
}

export const NotificationBell: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState<NotificationSummary>({
    unread_count: 0,
    since_previous_login_count: 0,
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<"all" | "since_login" | "unread">("all");
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchSummary = async () => {
    try {
      const res = await api.get("/notifications/summary");
      if (res.data) {
        setSummary(res.data);
      }
    } catch {
      // Unauthenticated or offline
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications?limit=30");
      if (res.data) {
        setNotifications(res.data);
      }
    } catch {
      // Silent error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 15000);

    // Listen for custom sync events from SSE stream
    const handleSyncEvent = (e: any) => {
      if (
        e.detail?.event === "notification_created" ||
        e.detail?.event === "grievance_created" ||
        e.detail?.event === "grievance_approved" ||
        e.detail?.event === "emergency_sos" ||
        e.detail?.event === "notifications_cleared" ||
        e.detail?.event === "notification_deleted"
      ) {
        fetchSummary();
        if (isOpen) {
          fetchNotifications();
        }
      }
    };

    window.addEventListener("prahari_sync_event", handleSyncEvent);
    return () => {
      clearInterval(interval);
      window.removeEventListener("prahari_sync_event", handleSyncEvent);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setSummary((prev) => ({
        ...prev,
        unread_count: Math.max(0, prev.unread_count - 1),
        since_previous_login_count: Math.max(0, prev.since_previous_login_count - 1),
      }));
    } catch {
      // Failed to mark
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setSummary((prev) => ({
        ...prev,
        unread_count: 0,
        since_previous_login_count: 0,
      }));
    } catch {
      // Failed to mark all
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear all notifications?")) {
      return;
    }
    try {
      await api.delete("/notifications/clear-all");
      setNotifications([]);
      setSummary((prev) => ({
        ...prev,
        unread_count: 0,
        since_previous_login_count: 0,
      }));
    } catch {
      // Failed to clear all
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      const deletedItem = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (deletedItem && !deletedItem.is_read) {
        setSummary((prev) => ({
          ...prev,
          unread_count: Math.max(0, prev.unread_count - 1),
          since_previous_login_count: Math.max(0, prev.since_previous_login_count - 1),
        }));
      }
    } catch {
      // Failed to delete
    }
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return "";
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const displayedNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "since_login") {
      if (!summary.previous_login_at) return !n.is_read;
      return !n.is_read && new Date(n.created_at || 0) > new Date(summary.previous_login_at);
    }
    return true;
  });

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-1.5 rounded-md transition-all duration-200 cursor-pointer ${
          isOpen
            ? "bg-white/20 text-white"
            : "text-slate-300 hover:bg-white/10 hover:text-white"
        }`}
        aria-label="Notifications"
        title="View Notifications"
      >
        <Bell className="w-4 h-4" />
        {summary.unread_count > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-600 rounded-full border-2 border-[#072648] shadow-sm animate-pulse">
            {summary.unread_count > 99 ? "99+" : summary.unread_count}
          </span>
        )}
      </button>

      {/* Notifications Drawer / Dropdown */}
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 text-slate-800 divide-y divide-slate-100 animate-fade-in"
        >
          {/* Header */}
          <div className="p-3 bg-slate-50 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-[#0c3866]">
                Notifications
              </span>
              {summary.since_previous_login_count > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                  {summary.since_previous_login_count} since login
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {summary.unread_count > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors"
                  title="Mark all notifications as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] text-red-600 hover:text-red-800 hover:bg-red-50 px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors border border-red-200 shadow-2xs"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>Clear all</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-3 py-1.5 flex items-center gap-1 bg-slate-100/70 text-[11px]">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                filter === "all"
                  ? "bg-white font-bold text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("since_login")}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                filter === "since_login"
                  ? "bg-white font-bold text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Since Login ({summary.since_previous_login_count})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                filter === "unread"
                  ? "bg-white font-bold text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Unread ({summary.unread_count})
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Loading notifications...
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-1">
                <Check className="w-6 h-6 text-emerald-500 mx-auto" />
                <p className="font-semibold text-slate-700">All caught up</p>
                <p className="text-[11px] text-slate-400">No unread notifications at this time.</p>
              </div>
            ) : (
              displayedNotifications.map((n) => {
                const isUrgent = n.priority === "urgent" || n.priority === "critical";
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.is_read) handleMarkAsRead(n.id);
                      if (n.link) {
                        setIsOpen(false);
                        router.push(n.link);
                      }
                    }}
                    className={`p-3 transition-colors cursor-pointer flex items-start gap-2.5 ${
                      !n.is_read
                        ? isUrgent
                          ? "bg-red-50/70 hover:bg-red-50"
                          : "bg-blue-50/50 hover:bg-blue-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isUrgent ? (
                        <ShieldAlert className="w-4 h-4 text-red-600" />
                      ) : n.entity_type === "grievance" ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {n.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatTimeAgo(n.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                      {!n.is_read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(n.id, e)}
                          className="text-slate-400 hover:text-emerald-600 p-1 rounded hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(n.id, e)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
