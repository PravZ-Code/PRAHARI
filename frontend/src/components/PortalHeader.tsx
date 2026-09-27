"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getStoredUser, logout, UserProfile } from "@/lib/auth";
import { api } from "@/lib/api";
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
  Menu,
  X,
  Lock,
  LifeBuoy,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { NotificationBell } from "@/components/NotificationBell";

export const PortalHeader: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, t } = useTranslation();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  // Dropdown states
  const [openNavDropdown, setOpenNavDropdown] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navDropdownRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const currentUser = getStoredUser();
    setUser(currentUser);
    if (currentUser && (!currentUser.name || !currentUser.service_number)) {
      api.get("/auth/me").then((res: any) => {
        if (res.data) setUser(res.data);
      }).catch(() => {});
    }

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

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (navDropdownRef.current && !navDropdownRef.current.contains(target)) {
        setOpenNavDropdown(null);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenNavDropdown(null);
        setProfileMenuOpen(false);
        setMobileNavOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
    setProfileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    router.push("/");
  };

  const role = user?.role || "personnel";
  const isPersonnel =
    role === "personnel" ||
    role === "soldier" ||
    role === "jawan" ||
    (!role && pathname.startsWith("/portal"));

  // Tactical / Commander / Welfare / Admin information
  const getTacticalInfo = () => {
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
      default:
        return {
          portalName: "NATIONAL GOVERNANCE & AUDIT",
          unitName: user?.unit_name || "MHA / NIC IT Directorate",
          badgeColor: "bg-purple-600 text-white",
          nav: [
            { label: "System Health & ML", href: "/admin", icon: Database },
            { label: "Cryptographic Audit Ledger", href: "/admin", icon: FileCheck },
          ],
        };
    }
  };

  const tacticalInfo = !isPersonnel ? getTacticalInfo() : null;

  // -------------------------------------------------------------
  // 1. PERSONNEL SELF-SERVICE PORTAL HEADER (CALM, ENTERPRISE-GRADE)
  // -------------------------------------------------------------
  if (isPersonnel) {
    const personnelNav = [
      { label: "Home", href: "/portal", icon: LayoutDashboard },
      { label: "Requests", href: "/portal/requests", icon: FileText },
      { label: "Wellbeing", href: "/portal/wellbeing", icon: HeartHandshake },
      { label: "Help", href: "/portal/help", icon: LifeBuoy },
    ];

    const displayName = user?.name || user?.username || "Personnel";
    const serviceNumber = user?.service_number || "Verified Identity";
    const unitName = user?.unit_name || "Assigned Battalion";

    return (
      <header className="bg-[#072648] text-white border-b-2 border-[#ff9933] shadow-sm sticky top-0 z-40">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Subtle Intranet & Classification Status Bar */}
        <div className="bg-[#051c36] px-4 sm:px-6 lg:px-8 py-1 border-b border-white/10 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-red-600/90 text-white font-mono font-bold text-[9px] tracking-wider uppercase">
                RESTRICTED
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                CRPF INTRANET
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 font-mono text-[11px]">
                {currentTime || "00:00:00"} IST
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Text Size Resizer */}
              <div className="flex items-center gap-1 bg-white/10 rounded px-1.5 py-0.5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    const cur = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
                    document.documentElement.style.setProperty("--font-scale", `${Math.max(14, cur - 1)}px`);
                  }}
                  aria-label="Decrease text size"
                  className="px-1 py-0.5 hover:bg-white/20 rounded cursor-pointer"
                  title="Decrease font size (A-)"
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => document.documentElement.style.setProperty("--font-scale", "16px")}
                  aria-label="Reset text size"
                  className="px-1 py-0.5 hover:bg-white/20 rounded cursor-pointer"
                  title="Default font size (A)"
                >
                  A
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cur = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
                    document.documentElement.style.setProperty("--font-scale", `${Math.min(20, cur + 1)}px`);
                  }}
                  aria-label="Increase text size"
                  className="px-1 py-0.5 hover:bg-white/20 rounded cursor-pointer"
                  title="Increase font size (A+)"
                >
                  A+
                </button>
              </div>

              <Link
                href="/"
                className="hidden sm:inline-flex items-center gap-1 text-slate-400 hover:text-white text-[11px] transition-colors"
                title="Return to Public Portal"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Public Portal</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Main Personnel Header & Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Branding */}
            <Link
              href="/portal"
              className="flex items-center gap-3 hover:opacity-95 transition-opacity group"
              title="Go to Personnel Home"
            >
              <img
                src="/images/emblem_of_india.svg"
                alt="National Emblem of India"
                className="w-6 h-8 object-contain filter brightness-200"
              />
              <img
                src="/images/prahari_logo_trans.png"
                alt="PRAHARI Logo"
                className="w-8 h-8 object-contain"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base tracking-tight font-heading text-white">
                    PRAHARI
                  </span>
                  <span className="border-l border-white/20 pl-2 text-[11px] font-medium text-slate-300">
                    Personnel Welfare Portal
                  </span>
                </div>
              </div>
            </Link>

            {/* Center: 4 Primary Top-Level Destinations (Desktop) */}
            <nav className="hidden md:flex items-center gap-1">
              {personnelNav.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/portal"
                    ? pathname === "/portal"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-[#0c3866] text-[#ff9933] border-b-2 border-[#ff9933] font-bold shadow-inner"
                        : "text-slate-200 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isActive ? "text-[#ff9933]" : "text-slate-400"
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right: Notifications & Personnel Profile Menu */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notification Icon */}
              {mounted && user && <NotificationBell />}

              {/* Personnel Profile Dropdown Menu */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="true"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-xs transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-[#ff9933]/20 border border-[#ff9933]/40 flex items-center justify-center text-[#ff9933]">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span className="hidden sm:inline font-semibold text-slate-100 max-w-[120px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 text-slate-400 transition-transform ${
                      profileMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {profileMenuOpen && (
                  <div
                    role="menu"
                    aria-orientation="vertical"
                    className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-slate-800 animate-fade-in divide-y divide-slate-100"
                  >
                    {/* User Identity Header */}
                    <div className="px-4 py-2.5 bg-slate-50">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {displayName}
                      </p>
                      <p className="text-[11px] font-mono text-slate-600 mt-0.5">
                        {serviceNumber}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {unitName}
                      </p>
                    </div>

                    {/* Profile & Privacy Links */}
                    <div className="py-1">
                      <Link
                        href="/portal/profile"
                        role="menuitem"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>My Profile</span>
                      </Link>

                      <Link
                        href="/portal/privacy"
                        role="menuitem"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Privacy & Data</span>
                      </Link>

                      <Link
                        href="/portal/profile#security"
                        role="menuitem"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5 text-slate-500" />
                        <span>Security</span>
                      </Link>

                      <Link
                        href="/portal/help#accessibility"
                        role="menuitem"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Sliders className="w-3.5 h-3.5 text-slate-500" />
                        <span>Accessibility</span>
                      </Link>
                    </div>

                    {/* Sign Out Button */}
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        role="menuitem"
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-medium transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-red-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Toggle Button */}
              <button
                type="button"
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                aria-expanded={mobileNavOpen}
                aria-label="Toggle navigation menu"
                className="md:hidden p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer"
              >
                {mobileNavOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileNavOpen && (
          <div className="md:hidden bg-[#051c36] border-t border-white/10 px-4 py-3 space-y-1 animate-fade-in">
            {personnelNav.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/portal"
                  ? pathname === "/portal"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold ${
                    isActive
                      ? "bg-[#0c3866] text-[#ff9933] font-bold"
                      : "text-slate-200 hover:bg-white/10"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-[#ff9933]" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <div className="pt-2 border-t border-white/10 space-y-1">
              <Link
                href="/portal/profile"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-white/10"
              >
                <User className="w-4 h-4 text-slate-400" />
                <span>My Profile</span>
              </Link>
              <Link
                href="/portal/privacy"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-white/10"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Privacy & Data</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-white/10 text-left cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </header>
    );
  }

  // -------------------------------------------------------------
  // 2. COMMANDER / WELFARE OFFICER / ADMIN TACTICAL DASHBOARD HEADER
  // -------------------------------------------------------------
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
            <span className="text-cyan-300 font-mono text-[11px] font-bold">
              {currentTime || "00:00:00"} IST
            </span>
          </div>

          {/* Right: User Profile & Public Website Switch */}
          <div className="flex items-center gap-3">
            {mounted && user && (
              <div className="flex items-center gap-2">
                <span className="text-slate-300 text-[11px]">
                  Logged in: <strong className="text-white">{user.name || user.username}</strong>
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${tacticalInfo?.badgeColor} uppercase tracking-wide`}
                >
                  {user.role}
                </span>
              </div>
            )}

            {mounted && user && <NotificationBell />}

            {/* GIGW 3.0 / WCAG 2.1 AA Font Resizer */}
            <div className="flex items-center gap-1 bg-white/10 rounded px-1.5 py-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => {
                  const cur = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
                  document.documentElement.style.setProperty("--font-scale", `${Math.max(14, cur - 1)}px`);
                }}
                aria-label="Decrease text size"
                className="px-1.5 py-0.5 hover:bg-white/20 rounded cursor-pointer"
                title="Decrease font size (A-)"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => document.documentElement.style.setProperty("--font-scale", "16px")}
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
                  document.documentElement.style.setProperty("--font-scale", `${Math.min(20, cur + 1)}px`);
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
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-[11px] transition-all"
              title="Return to Public Website"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline">Public Website</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-600/80 hover:bg-red-600 text-white text-[11px] font-bold transition-all cursor-pointer"
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
                : "/admin"
            }
            className="flex items-center gap-3 hover:opacity-95 transition-all group"
            title="Go to Dashboard Home"
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
                  {tacticalInfo?.portalName}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono">
                {tacticalInfo?.unitName}
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Tactical Navigation Tabs */}
      <nav className="bg-[#051c36] border-t border-white/10 px-4 sm:px-6 lg:px-8 overflow-visible relative z-30">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-visible py-1 relative flex-wrap sm:flex-nowrap">
          {tacticalInfo?.nav.map((item: any) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#0c3866] text-[#ff9933] border-b-2 border-[#ff9933] font-bold shadow-inner"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isActive ? "text-[#ff9933] scale-110" : "text-slate-400"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
};
