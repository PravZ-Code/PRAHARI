"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getStoredUser, logout, UserProfile } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api";
import {
  Shield,
  LayoutDashboard,
  HeartHandshake,
  CheckCircle2,
  CalendarCheck,
  Scale,
  Activity,
  RefreshCw,
  Clock,
  User,
  LogOut,
  ExternalLink,
  ChevronDown,
  Bell,
  Sliders,
  Database,
  FileText,
  AlertTriangle,
  Radio,
  FileCheck,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export const PortalHeader: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, t } = useTranslation();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "disconnected">("connected");
  const [dbMetrics, setDbMetrics] = useState<any>(null);
  const [showDbModal, setShowDbModal] = useState(false);
  const failCountRef = React.useRef(0);

  const checkDbHealth = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${getApiBaseUrl()}/health`, {
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.database === "connected") {
          failCountRef.current = 0;
          setDbStatus("connected");
          // Fetch detailed metrics on first check or when modal is opened
          if (!dbMetrics) {
            try {
              const dsRes = await fetch(`${getApiBaseUrl()}/health/datasets`, {
                cache: "no-store",
              });
              if (dsRes.ok) {
                const dsData = await dsRes.json();
                if (dsData.datasets) {
                  setDbMetrics(dsData.datasets);
                }
              }
            } catch {
              // Lightweight health remains authoritative
            }
          }
          return;
        }
      }
      failCountRef.current += 1;
      if (failCountRef.current >= 4) {
        setDbStatus("disconnected");
      }
    } catch {
      failCountRef.current += 1;
      if (failCountRef.current >= 4) {
        setDbStatus("disconnected");
      }
    }
  };

  useEffect(() => {
    setMounted(true);
    const currentUser = getStoredUser();
    setUser(currentUser);

    const handleAuthChange = () => {
      setUser(getStoredUser());
    };
    window.addEventListener("prahari_auth_change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);

    // Initial and periodic DB health check
    const isAdmin = currentUser?.role === "admin";
    if (isAdmin) {
      checkDbHealth();
    }
    const healthInterval = isAdmin ? setInterval(checkDbHealth, 10000) : undefined;

    return () => {
      window.removeEventListener("prahari_auth_change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
      clearInterval(clockInterval);
      if (healthInterval) clearInterval(healthInterval);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    router.push("/");
  };

  const role = user?.role || "commander";

  const getPortalInfo = () => {
    switch (role) {
      case "commander":
        return {
          portalName: "COMMAND TACTICAL CENTER",
          unitName: user?.unit_name || "Assigned command unit",
          badgeColor: "bg-blue-600 text-white",
          nav: [
            { label: "Tactical Overview", href: "/commander", icon: LayoutDashboard },
            { label: "Pending Approvals", href: "/approvals", icon: CheckCircle2 },
            { label: "Duty & Shift Simulation", href: "/what-if", icon: Scale },
          ],
        };
      case "welfare":
      case "welfare_officer":
        return {
          portalName: "CONFIDENTIAL WELFARE CASEWORK",
          unitName: user?.unit_name || "Assigned welfare unit",
          badgeColor: "bg-emerald-600 text-white",
          nav: [
            { label: "Active Casework", href: "/welfare", icon: HeartHandshake },
            { label: "Resilience Optimizer (URO)", href: "/welfare/uro", icon: Sliders },
            { label: "Early Warning Safety Net", href: "/safety-net", icon: Activity },
            { label: "Recovery Tracking", href: "/recovery", icon: RefreshCw },
            { label: "Command Approvals", href: "/approvals", icon: CheckCircle2 },
          ],
        };
      case "admin":
        return {
          portalName: "NATIONAL GOVERNANCE & AUDIT",
          unitName: user?.unit_name || "MHA / NIC IT Directorate",
          badgeColor: "bg-purple-600 text-white",
          nav: [
            { label: "System Health & ML", href: "/admin", icon: Database },
            { label: "Cryptographic Audit Ledger", href: "/admin", icon: FileCheck },
          ],
        };
      case "personnel":
      case "soldier":
      default:
        return {
          portalName: "TROOPER SELF-SERVICE DESK",
          unitName: user?.unit_name || "Assigned command unit",
          badgeColor: "bg-amber-600 text-white",
          nav: [
            { label: "My Dashboard", href: "/portal", icon: LayoutDashboard },
            { label: "Apply for Leave / Support", href: "/request", icon: FileText },
            { label: "Track Application", href: "/track", icon: Clock },
            { label: "Emergency SOS (12h)", href: "/emergency", icon: AlertTriangle },
          ],
        };
    }
  };

  const portalInfo = getPortalInfo();

  return (
    <header className="bg-[#072648] text-white border-b-2 border-[#ff9933] shadow-md sticky top-0 z-40">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {/* Top Telemetry & Identity Bar */}
      <div className="bg-[#051c36] px-4 sm:px-6 lg:px-8 py-1.5 border-b border-white/10 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Tactical Branding & Classification */}
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono font-bold text-[10px] tracking-wider uppercase">
              RESTRICTED
            </span>
            <span className="text-slate-300 font-mono text-[11px] hidden sm:inline">
              MHA / CRPF INTRANET
            </span>
            {role === "admin" && (
              <>
                <span className="text-slate-500">|</span>
                {dbStatus === "connected" ? (
                  <button
                    onClick={() => setShowDbModal(true)}
                    title="Inspect live database and dataset records"
                    className="flex items-center gap-1.5 text-emerald-300 font-mono text-[11px] bg-emerald-950/60 hover:bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-700/60 transition-colors cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold">DATABASE CONNECTED ({dbMetrics?.size_mb ?? "—"} MB)</span>
                  </button>
                ) : dbStatus === "disconnected" ? (
                  <button
                    onClick={() => checkDbHealth()}
                    title="Database unavailable. Click to re-check."
                    className="flex items-center gap-1.5 text-red-300 font-mono text-[11px] bg-red-950/80 hover:bg-red-900 px-2 py-0.5 rounded border border-red-700 animate-pulse cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span className="font-bold">DATABASE OFFLINE</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-300 font-mono text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>CHECKING DATABASE...</span>
                  </div>
                )}
              </>
            )}
            <span className="text-cyan-300 ml-2 font-mono text-[11px] font-bold">{currentTime || "00:00:00"} IST</span>
          </div>

          {/* Right: User Profile & Public Website Switch */}
          <div className="flex items-center gap-3">
            {mounted && user && (
              <div className="flex items-center gap-2">
                <span className="text-slate-300 text-[11px]">
                  Logged in: <strong className="text-white">{user.name || user.username}</strong>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${portalInfo.badgeColor} uppercase tracking-wide`}>
                  {user.role}
                </span>
              </div>
            )}

            {/* GIGW 3.0 / WCAG 2.1 AA Font Resizer */}
            <div className="flex items-center gap-1 bg-white/10 rounded px-1.5 py-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => {
                  const cur = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
                  document.documentElement.style.setProperty('--font-scale', `${Math.max(14, cur - 1)}px`);
                }}
                aria-label="Decrease text size"
                className="px-1.5 py-0.5 hover:bg-white/20 rounded cursor-pointer"
                title="Decrease font size (A-)"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => document.documentElement.style.setProperty('--font-scale', '16px')}
                aria-label="Reset text size"
                className="px-1.5 py-0.5 hover:bg-white/20 rounded cursor-pointer"
                title="Default font size (A)"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => {
                  const cur = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
                  document.documentElement.style.setProperty('--font-scale', `${Math.min(20, cur + 1)}px`);
                }}
                aria-label="Increase text size"
                className="px-1.5 py-0.5 hover:bg-white/20 rounded cursor-pointer"
                title="Increase font size (A+)"
              >
                A+
              </button>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-[11px] transition-colors"
              title="Return to Public Website"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline">Public Website</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out of PRAHARI portal"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-600/80 hover:bg-red-600 text-white text-[11px] font-bold transition-colors cursor-pointer"
              title="Sign Out of Portal"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Portal Bar */}
      <div className="px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Portal Title */}
          <Link
            href={
              role === "commander"
                ? "/commander"
                : role === "welfare" || role === "welfare_officer"
                ? "/welfare"
                : role === "admin"
                ? "/admin"
                : "/portal"
            }
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
            title="Go to Portal Home"
          >
            <img
              src="/images/emblem_of_india.svg"
              alt="National Emblem"
              className="w-7 h-9 object-contain filter brightness-200"
            />
            <img
              src="/images/prahari_logo_trans.png"
              alt="PRAHARI Crest"
              className="w-8 h-8 object-contain"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight font-heading text-white">
                  PRAHARI PORTAL
                </span>
                <span className="border-l-2 border-[#ff9933] pl-2 text-[10px] font-bold font-mono text-[#ffcc80] uppercase tracking-wide">
                  {portalInfo.portalName}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono">
                {portalInfo.unitName}
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Portal Navigation Tabs */}
      <nav className="bg-[#051c36] border-t border-white/10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-1">
          {portalInfo.nav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-[#0c3866] text-[#ff9933] border-b-2 border-[#ff9933] font-bold"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#ff9933]" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* PS26186 Database & Datasets Telemetry Modal */}
      {showDbModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-xl max-w-2xl w-full p-6 text-white shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">
                  PRAHARI Database & PS26186 Datasets Telemetry
                </h3>
              </div>
              <button
                onClick={() => setShowDbModal(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded hover:bg-slate-800"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded bg-slate-800/80 border border-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">SQLite Master Store</span>
                <strong className="text-emerald-300 font-mono text-sm">CONNECTED · HEALTHY</strong>
                <p className="text-[11px] text-slate-300 mt-1 font-mono truncate">{dbMetrics?.path || "Path unavailable"}</p>
              </div>
              <div className="p-3 rounded bg-slate-800/80 border border-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase font-mono">Database File Size</span>
                <strong className="text-cyan-300 font-mono text-sm">{dbMetrics?.size_mb ?? "—"} MB</strong>
                <p className="text-[11px] text-slate-300 mt-1">WAL Mode Enabled · Strict Foreign Keys</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                MHA / CRPF Problem Statement (PS26186) Dataset Inventory:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded bg-slate-800/50 border border-slate-700 flex items-center justify-between">
                  <span className="text-slate-300">1. Anonymized HR Datasets:</span>
                  <span className="font-mono font-bold text-emerald-400">{dbMetrics?.personnel?.toLocaleString() || "—"} Troopers</span>
                </div>
                <div className="p-2.5 rounded bg-slate-800/50 border border-slate-700 flex items-center justify-between">
                  <span className="text-slate-300">2. Deployment History:</span>
                  <span className="font-mono font-bold text-emerald-400">{dbMetrics?.deployments?.toLocaleString() || "—"} Records</span>
                </div>
                <div className="p-2.5 rounded bg-slate-800/50 border border-slate-700 flex items-center justify-between">
                  <span className="text-slate-300">3. Leave Records & Denials:</span>
                  <span className="font-mono font-bold text-emerald-400">{dbMetrics?.leaves?.toLocaleString() || "—"} Records</span>
                </div>
                <div className="p-2.5 rounded bg-slate-800/50 border border-slate-700 flex items-center justify-between">
                  <span className="text-slate-300">4. Wellness Survey Data:</span>
                  <span className="font-mono font-bold text-emerald-400">{dbMetrics?.surveys?.toLocaleString() || "—"} Points</span>
                </div>
                <div className="p-2.5 rounded bg-slate-800/50 border border-slate-700 flex items-center justify-between">
                  <span className="text-slate-300">5. Workload Duty Roster:</span>
                  <span className="font-mono font-bold text-emerald-400">{dbMetrics?.roster?.toLocaleString() || "—"} Shifts</span>
                </div>
                <div className="p-2.5 rounded bg-slate-800/50 border border-slate-700 flex items-center justify-between">
                  <span className="text-slate-300">6. Behavioral Buddy Signals:</span>
                  <span className="font-mono font-bold text-emerald-400">{dbMetrics?.signals?.toLocaleString() || "—"} Signals</span>
                </div>
                <div className="p-2.5 rounded bg-slate-800/50 border border-slate-700 flex items-center justify-between">
                  <span className="text-slate-300">7. Active Welfare Cases:</span>
                  <span className="font-mono font-bold text-amber-400">{dbMetrics?.cases?.toLocaleString() || "—"} Dockets</span>
                </div>
                <div className="p-2.5 rounded bg-slate-800/50 border border-slate-700 flex items-center justify-between">
                  <span className="text-slate-300">8. Grievance & Crisis Flags:</span>
                  <span className="font-mono font-bold text-amber-400">{dbMetrics?.grievances?.toLocaleString() || "—"} Requests</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowDbModal(false)}
                className="px-4 py-2 bg-[#0c3866] hover:bg-[#0a2f55] text-white rounded text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
