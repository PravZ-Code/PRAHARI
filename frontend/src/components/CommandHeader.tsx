"use client";

import { useTranslation } from "@/lib/i18n";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getStoredUser, setAuthData, clearAuthData, logout, isSessionExpired, getSessionRemainingMs, getSessionTimeoutMs, recordActivity } from "@/lib/auth";
import { api } from "@/lib/api";
import { playTacticalClick, playSuccessChime } from "@/lib/sound";
import {
  Shield,
  LayoutDashboard,
  HeartHandshake,
  CalendarCheck,
  Sliders,
  Cpu,
  LogOut,
  Radio,
  Clock,
  Wifi,
  ChevronDown,
  UserCheck,
  Volume2,
  VolumeX,
  AlertTriangle,
} from "lucide-react";
import { PrahariVaniSimulator } from "@/components/PrahariVaniSimulator";

export const CommandHeader: React.FC = () => {
  const { lang } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState({ ist: "", utc: "" });
  const [showVani, setShowVani] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Update clock every second
  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      const istString = now.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const utcString = now.toLocaleTimeString("en-GB", {
        timeZone: "UTC",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setCurrentTime({ ist: istString, utc: utcString });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const user = mounted ? getStoredUser() : null;

  // Do not render command header on the root login page
  if (pathname === "/" || pathname === "/login") {
    return null;
  }

  const [sessionRemaining, setSessionRemaining] = useState<number>(0);
  const sessionTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Sync auth state and listen for auth change events
  useEffect(() => {
    const handleAuthChange = () => {
      setMounted(true);
    };
    window.addEventListener("prahari_auth_change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    return () => {
      window.removeEventListener("prahari_auth_change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  const handleLogout = useCallback(async () => {
    if (!isMuted) playTacticalClick();
    await logout();
    setShowRoleMenu(false);
    router.push("/");
  }, [isMuted, router]);

  const navItems = [
    {
      label: "Troop Readiness",
      shortLabel: "Readiness",
      href: "/commander",
      icon: LayoutDashboard,
      roles: ["commander", "admin"],
    },
    {
      label: "Welfare Support",
      shortLabel: "Welfare",
      href: "/welfare",
      icon: HeartHandshake,
      roles: ["welfare", "admin"],
    },
    {
      label: "Shift Swapper",
      shortLabel: "Shift Swapper",
      href: "/welfare/uro",
      icon: CalendarCheck,
      roles: ["commander", "welfare", "admin"],
    },
    {
      label: "Schedule Planner",
      shortLabel: "Planner",
      href: "/welfare/what-if",
      icon: Sliders,
      roles: ["welfare", "admin"],
    },
    {
      label: "Activity Log & Health",
      shortLabel: "Activity Log",
      href: "/admin",
      icon: Cpu,
      roles: ["admin"],
    },
  ];

  const filteredItems = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : true
  );

  const sessionTimeoutMs = getSessionTimeoutMs();

  // Session expiry monitoring with proper refs
  useEffect(() => {
    if (!mounted) return;

    const checkAndResetTimers = () => {
      if (isSessionExpired()) {
        if (!isMuted) playTacticalClick();
        clearAuthData();
        router.push("/");
        return;
      }

      const remaining = getSessionRemainingMs();
      setSessionRemaining(Math.round(remaining / 60000));

      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

      sessionTimerRef.current = setTimeout(() => {
        if (!isMuted) playTacticalClick();
        clearAuthData();
        router.push("/");
      }, Math.max(1000, remaining));

      const warnTime = remaining - 5 * 60 * 1000;
      if (warnTime > 0) {
        warningTimerRef.current = setTimeout(() => {
          recordActivity();
        }, warnTime);
      }
    };

    checkAndResetTimers();

    const handleUserActivity = () => {
      recordActivity();
      checkAndResetTimers();
    };

    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    window.addEventListener("click", handleUserActivity);

    const intervalId = setInterval(() => {
      if (isSessionExpired()) {
        clearAuthData();
        router.push("/");
      } else {
        setSessionRemaining(Math.round(getSessionRemainingMs() / 60000));
      }
    }, 30000);

    return () => {
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("click", handleUserActivity);
      clearInterval(intervalId);
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [mounted, isMuted, router, sessionTimeoutMs]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 h-16 bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-800/80 shadow-2xl px-4 lg:px-6 select-none">
        <div className="flex h-full w-full max-w-7xl mx-auto items-center justify-between gap-4">
          
          {/* Left: Tactical Brand & Live Status */}
          <div className="flex items-center gap-3.5">
            <Link
              href={user?.role === "welfare" ? "/welfare" : user?.role === "admin" ? "/admin" : "/commander"}
              className="flex items-center gap-2.5 group"
              onClick={() => { if (!isMuted) playTacticalClick(); }}
            >
              <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 shadow-md group-hover:border-cyan-500/60 transition-colors">
                <Shield className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-wider text-white font-mono">
                    {lang === "hi" ? "प्रहरी" : lang === "ta" ? "பிரகாரி" : "PRAHARI"}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 tracking-tighter">v4.2</span>
                </div>
                <span className="text-[8px] tracking-wider uppercase font-semibold text-slate-400 font-mono hidden sm:inline-block">
                  SOLDIER WELFARE & READINESS SYSTEM
                </span>
              </div>
            </Link>

            {/* Network Telemetry Pill */}
            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-[10px] font-mono text-slate-400">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300">SECURE CONNECTION</span>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-400">{currentTime.ist || "00:00:00"} IST</span>
            </div>
          </div>

          {/* Center: Tactical Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-900/80 border border-slate-800/80 p-1 rounded-lg">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => { if (!isMuted) playTacticalClick(); }}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium tracking-wide transition-colors ${
                    isActive
                      ? "text-white font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute inset-0 bg-slate-800 border border-cyan-500/40 rounded-md shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                    />
                  )}
                  <Icon className={`w-3.5 h-3.5 relative z-10 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                  <span className="relative z-10">{item.shortLabel}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Actions, Persona Switcher & Vani Launcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Helpline Simulator Launcher */}
            <button
              onClick={() => {
                if (!isMuted) playTacticalClick();
                setShowVani(true);
              }}
              className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium font-mono transition-all hover:scale-105 active:scale-95 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
              title="Test Helpline (Button Phone IVR)"
            >
              <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">Prahari Helpline</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold">IVR</span>
            </button>

            {/* Officer Profile & Session Telemetry Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  if (!isMuted) playTacticalClick();
                  setShowRoleMenu(!showRoleMenu);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-xs text-slate-200 transition-all font-mono"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="max-w-[100px] truncate font-semibold">
                  {user?.name || user?.username || "Officer"}
                </span>
                <span className="text-[10px] text-cyan-400 uppercase">
                  [{user?.role ? user.role.toUpperCase() : "SECURE"}]
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Officer Profile Menu */}
              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-1 py-1 border-b border-slate-800 pb-2.5">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                      Authenticated Officer Profile
                    </p>
                    <div className="mt-2 flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                        <UserCheck className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {user?.name || user?.username || "Officer"}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          ID: {user?.service_number || user?.id?.slice(0, 8) || "MHA-GOV"}
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded border font-mono font-bold bg-cyan-950/70 text-cyan-300 border-cyan-700/50 uppercase">
                        {user?.role || "USER"}
                      </span>
                    </div>
                  </div>

                  <div className="py-2.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-300 px-1">
                      <span className="text-slate-400 flex items-center gap-1.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> Session Active:
                      </span>
                      <span className="text-emerald-400 font-mono font-semibold">
                        {sessionRemaining > 0 ? `${sessionRemaining} min remaining` : "Active"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-300 px-1">
                      <span className="text-slate-400 flex items-center gap-1.5 font-mono">
                        <Shield className="w-3.5 h-3.5 text-cyan-400" /> Security Gate:
                      </span>
                      <span className="text-cyan-400 font-mono">MHA RBAC Level 4</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={handleLogout}
                      className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/50 text-slate-200 hover:text-rose-300 text-xs font-medium font-mono flex items-center justify-center gap-2 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out / Switch Role
                    </button>
                  </div>
                  <div className="pt-1.5 text-center">
                    <button
                      onClick={() => setShowRoleMenu(false)}
                      className="text-[10px] text-slate-500 hover:text-slate-300 font-mono"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Audio Feedback Toggle */}
            <button
              onClick={() => {
                setIsMuted(!isMuted);
                if (isMuted) playTacticalClick();
              }}
              className="p-1.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors hidden sm:flex items-center justify-center"
              title={isMuted ? "Unmute Tactical SFX" : "Mute SFX"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            {/* Sign Out Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/50 text-slate-300 hover:text-rose-300 text-xs transition-colors font-medium"
              title="End Secure Session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer Bar */}
      <nav aria-label="Mobile navigation" className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-[#0B0F19]/95 backdrop-blur-md px-3 py-2">
        <div className="flex items-center justify-around gap-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => { if (!isMuted) playTacticalClick(); }}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-colors ${
                  isActive
                    ? "bg-slate-800 border border-cyan-500/40 text-cyan-400 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                <span className="truncate">{item.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Global Prahari Vani Telecom Simulator Modal */}
      {showVani && (
        <PrahariVaniSimulator
          isOpen={showVani}
          onClose={() => setShowVani(false)}
        />
      )}
    </>
  );
};
