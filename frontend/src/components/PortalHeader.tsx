"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Award,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { DatabaseSyncIndicator } from "@/components/DatabaseSyncIndicator";

export const PortalHeader: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, t } = useTranslation();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

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

    return () => {
      window.removeEventListener("prahari_auth_change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
      clearInterval(clockInterval);
    };
  }, []);

  // Navigation Dropdown State (for Trooper Telemetry & Parity Links)
  const [openNavDropdown, setOpenNavDropdown] = useState<string | null>(null);
  const navDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navDropdownRef.current && !navDropdownRef.current.contains(event.target as Node)) {
        setOpenNavDropdown(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenNavDropdown(null);
      }
    };
    if (openNavDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openNavDropdown]);

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
            {
              label: "Schedule & Recovery",
              icon: Sliders,
              children: [
                { label: "What Changed? (Schedule & Rest)", href: "/portal/what-changed", icon: Activity, badge: "Baseline vs Recent" },
                { label: "Why is My Risk Changing?", href: "/portal/why-risk-changing", icon: HelpCircle, badge: "Factor Insights" },
                { label: "Dedicated Recovery Timeline", href: "/portal/recovery-timeline", icon: Award, badge: "6-Stage Journey" },
              ],
            },
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
            <span className="text-slate-500">|</span>
            <span className="text-cyan-300 font-mono text-[11px] font-bold">{currentTime || "00:00:00"} IST</span>
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
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-[11px] transition-all hover-scale active-press"
              title="Return to Public Website"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline">Public Website</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-600/80 hover:bg-red-600 text-white text-[11px] font-bold transition-all hover-scale active-press cursor-pointer"
              title="Sign out of portal"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tactical Title Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
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
            className="flex items-center gap-3 hover:opacity-95 transition-all group"
            title="Go to Portal Home"
          >
            <img
              src="/images/emblem_of_india.svg"
              alt="National Emblem"
              className="w-7 h-9 object-contain filter brightness-200 group-hover:scale-105 transition-transform duration-200"
            />
            <img
              src="/images/prahari_logo_trans.png"
              alt="PRAHARI Crest"
              className="w-8 h-8 object-contain group-hover:scale-105 transition-transform duration-200"
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
      <nav className="bg-[#051c36] border-t border-white/10 px-4 sm:px-6 lg:px-8 overflow-visible relative z-30">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-visible py-1 relative flex-wrap sm:flex-nowrap">
          {portalInfo.nav.map((item: any) => {
            const Icon = item.icon;
            if (item.children) {
              const isChildActive = item.children.some((c: any) => pathname === c.href);
              const isOpen = openNavDropdown === item.label;
              return (
                <div key={item.label} className="relative" ref={navDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setOpenNavDropdown(isOpen ? null : item.label)}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                      isChildActive || isOpen
                        ? "bg-[#0c3866] text-[#ff9933] border-b-2 border-[#ff9933] font-bold shadow-inner"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 transition-transform duration-200 ${isChildActive || isOpen ? "text-[#ff9933] scale-110" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isOpen && (
                    <div
                      role="menu"
                      aria-orientation="vertical"
                      className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-fade-in text-slate-800 divide-y divide-slate-100"
                    >
                      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Telemetry & Recovery
                        </span>
                        <span className="text-[10px] font-semibold text-[#0c3866] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          3 Modules
                        </span>
                      </div>
                      <div className="p-1 space-y-0.5">
                        {item.children.map((child: any) => {
                          const ChildIcon = child.icon;
                          const isChildItemActive = pathname === child.href;
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setOpenNavDropdown(null)}
                              role="menuitem"
                              className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors group cursor-pointer ${
                                isChildItemActive
                                  ? "bg-blue-50 text-[#0c3866] font-bold"
                                  : "text-slate-700 hover:bg-slate-50 hover:text-[#0c3866]"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <ChildIcon className={`w-4 h-4 shrink-0 ${isChildItemActive ? "text-[#0c3866]" : "text-slate-400 group-hover:text-[#0c3866]"}`} />
                                <span className="truncate">{child.label}</span>
                              </div>
                              {child.badge && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0 group-hover:bg-blue-50 group-hover:text-[#0c3866]">
                                  {child.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-200 hover:scale-105 active:scale-95 ${
                  isActive
                    ? "bg-[#0c3866] text-[#ff9933] border-b-2 border-[#ff9933] font-bold shadow-inner"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 transition-transform duration-200 ${isActive ? "text-[#ff9933] scale-110" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
};

