"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getStoredUser, logout } from "@/lib/auth";
import {
  Shield,
  ShieldCheck,
  PhoneCall,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Activity,
  CalendarCheck,
  Scale,
  Users,
  LayoutDashboard,
  HeartHandshake,
  Radio,
  Lock,
  RefreshCw,
  Sliders,
  ChevronRight,
  Eye,
  Type,
  Maximize2,
  Minimize2,
  RotateCcw,
  Check,
  Award,
  Stethoscope,
  Settings,
  ArrowRight,
} from "lucide-react";
import { PrahariVaniSimulator } from "@/components/PrahariVaniSimulator";
import { useTranslation, Language } from "@/lib/i18n";
import { DatabaseSyncIndicator } from "@/components/DatabaseSyncIndicator";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
  alert?: boolean;
}

function getRoleProfile(user?: { role?: string; name?: string; username?: string; rank?: string; unit_name?: string }) {
  const role = user?.role;
  const title = user?.rank || user?.name || user?.username || "Personnel";
  const unit = user?.unit_name || "Assigned unit";
  switch (role) {
    case "commander":
      return {
        title,
        unit,
        badge: "Commander Portal",
        primaryPath: "/commander",
      };
    case "welfare":
    case "welfare_officer":
      return {
        title,
        unit,
        badge: "Welfare Portal",
        primaryPath: "/welfare",
      };
    case "admin":
      return {
        title,
        unit,
        badge: "Admin Console",
        primaryPath: "/admin",
      };
    case "personnel":
    case "soldier":
    default:
      return {
        title,
        unit,
        badge: "Jawan Desk",
        primaryPath: "/request",
      };
  }
}

export const GovernmentHeader: React.FC = () => {
  const { lang, setLang, t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showVani, setShowVani] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);
    setUser(getStoredUser());

    const handleAuthChange = () => {
      setUser(getStoredUser());
    };

    window.addEventListener("prahari_auth_change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("prahari_auth_change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setShowUserMenu(false);
    setMobileMenuOpen(false);
    router.push("/");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    if (q.toUpperCase().startsWith("PRH-")) {
      router.push(`/track?ref=${encodeURIComponent(q.toUpperCase())}`);
    } else {
      router.push(`/request?q=${encodeURIComponent(q)}`);
    }
  };

  // Official Public Website Navigation
  const getNavItems = (): NavItem[] => {
    return [
      { label: t.nav.home || "Home", href: "/", icon: FileText },
      { label: "About PRAHARI", href: "/#about", icon: Shield },
      { label: "Welfare Policies & Orders", href: "/#circulars", icon: CalendarCheck },
      { label: t.nav.privacy || "Confidentiality Charter (Sec 21)", href: "/privacy", icon: ShieldCheck },
      { label: "Prahari Vani Helpline", href: "/#helpline", icon: PhoneCall },
    ];
  };

  const navItems = getNavItems();
  const currentProfile = getRoleProfile(user);

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t.header.skipLink}
      </a>

      {/* Tricolor Government Top Strip */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />

      {/* Top Utility Government Identity Bar (NIC Style) */}
      <div className="bg-[#f1f5f9] border-b border-slate-200 text-xs text-slate-700 py-1.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Left: Ministry Identity & Flag */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex items-center">
              <img
                src="/images/flag.svg"
                alt="National Flag"
                className="w-5 h-3.5 object-cover rounded-xs shadow-2xs border border-slate-300"
              />
            </span>
            <span className="font-semibold text-slate-900 tracking-tight">
              {t.header.topGovt}
            </span>
            <span className="hidden md:inline text-slate-300">|</span>
            <span className="hidden md:inline text-slate-700 font-semibold">
              {t.header.topMha}
            </span>
          </div>

          {/* Right: Database Sync & Language Selector */}
          <div className="flex items-center gap-3">
            <DatabaseSyncIndicator compact={true} />
            <div className="flex items-center rounded bg-white border border-slate-300 p-0.5 text-[11px] font-bold shadow-2xs">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  lang === "en" ? "bg-[#0c3866] text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
                title="Switch to English"
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLang("hi")}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  lang === "hi" ? "bg-[#0c3866] text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
                title="हिन्दी में बदलें"
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => setLang("ta")}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  lang === "ta" ? "bg-[#0c3866] text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
                title="தமிழில் மாற்றுக"
              >
                தமிழ்
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Service Brand Header with NIC Proportions & Global Search */}
      <header className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: National Emblems, Official PRAHARI Crest & Service Typography */}
          <Link
            href={
              user
                ? user.role === "commander"
                  ? "/commander"
                  : user.role === "welfare" || user.role === "welfare_officer"
                  ? "/welfare"
                  : user.role === "admin"
                  ? "/admin"
                  : "/portal"
                : "/"
            }
            className="flex items-center gap-2.5 sm:gap-3.5 group shrink-0"
          >
            {/* State Emblem of India */}
            <div className="relative w-9 h-12 sm:w-11 sm:h-15 flex items-center justify-center shrink-0">
              <img
                src="/images/emblem_of_india.svg"
                alt="State Emblem of India"
                className="w-full h-full object-contain filter drop-shadow-xs transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            {/* Official PRAHARI Logo */}
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shrink-0 border-l border-slate-200 pl-2.5">
              <img
                src="/images/prahari_logo_trans.png"
                alt={`PRAHARI Official Emblem - ${t.header.motto}`}
                className="w-full h-full object-contain filter drop-shadow-xs transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            {/* CRPF Official Crest */}
            <div className="relative w-9 h-12 sm:w-11 sm:h-15 hidden sm:flex items-center justify-center shrink-0 border-l border-slate-200 pl-2.5">
              <img
                src="/images/crpf_logo_official.svg"
                alt="Central Reserve Police Force Official Crest"
                className="w-full h-full object-contain filter drop-shadow-xs transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            {/* Brand Title & Motto */}
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#0c3866] font-heading">
                  {t.header.title}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 font-mono font-bold bg-[#ff9933]/15 text-[#0c3866] rounded border border-[#ff9933]/40">
                  GOV.IN
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 tracking-tight">
                {t.header.subtitle}
              </p>
              <p className="text-[11px] text-[#0c3866] font-semibold hidden md:block">
                {t.header.motto}
              </p>
            </div>
          </Link>

          {/* Center: Global Search Bar (Matching NIC Header Layout) */}
          <div className="hidden xl:block flex-1 max-w-md mx-4">
            <form onSubmit={handleSearchSubmit} className="relative" role="search">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search welfare circulars, leave rules, or PRH-..."
                className="w-full pl-3.5 pr-10 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0c3866] focus:border-[#0c3866] transition-all"
                aria-label="Search PRAHARI services and references"
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-slate-600 hover:text-[#0c3866] transition-colors"
                title="Search"
                aria-label="Submit search"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Right Header Controls: Digital India & Swachh Bharat Logos + Officer SSO */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Swachh Bharat Abhiyan Official Badge */}
            <div className="hidden lg:flex items-center h-10 pr-2 border-r border-slate-200">
              <img
                src="/images/swachh_bharat.svg"
                alt="Swachh Bharat Abhiyan"
                className="h-9 w-auto object-contain"
                title="Swachh Bharat Abhiyan"
              />
            </div>

            {/* Digital India Official Badge */}
            <div className="hidden md:flex items-center h-10 pr-3 border-r border-slate-200">
              <img
                src="/images/digital_india.svg"
                alt="Digital India - Power to Empower"
                className="h-8 w-auto object-contain"
                title="Digital India"
              />
            </div>

            {/* Azadi Ka Amrit Mahotsav Official Badge */}
            <div className="hidden xl:flex items-center h-10 pr-3 border-r border-slate-200">
              <img
                src="/images/azadi-ka-amrit-mahotsav-logo.png"
                alt="Azadi Ka Amrit Mahotsav"
                className="h-8 w-auto object-contain"
                title="Azadi Ka Amrit Mahotsav"
              />
            </div>

            {/* Prahari Vani Button Phone Helpline Launcher */}
            <button
              type="button"
              onClick={() => setShowVani(true)}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-xs font-semibold shadow-2xs transition-colors"
              title="Interactive Button Phone IVR Helpline Simulator"
            >
              <PhoneCall className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
              <span>{t.header.helpline}</span>
            </button>

            {/* Officer Portal Access / User Profile */}
            {mounted && user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={
                    user.role === "commander"
                      ? "/commander"
                      : user.role === "welfare" || user.role === "welfare_officer"
                      ? "/welfare"
                      : user.role === "admin"
                      ? "/admin"
                      : "/portal"
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ff9933] hover:bg-[#e65100] text-slate-950 font-bold text-xs rounded-md shadow-sm transition-all"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>
                    Open {user.role === "commander" ? "Commander Portal" : user.role === "welfare" || user.role === "welfare_officer" ? "Welfare Portal" : user.role === "admin" ? "Admin Console" : "Trooper Portal"}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Sign out"
                  className="px-2.5 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0c3866] hover:bg-[#072648] text-white text-xs font-bold rounded-md shadow-2xs transition-colors"
              >
                <Lock className="w-3.5 h-3.5 text-[#ff9933]" />
                <span>Personnel & Officer Login</span>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="public-mobile-navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Government Horizontal Navigation Bar (Deep Navy / Indigo like NIC) */}
      <nav className="bg-[#0c3866] text-white text-xs font-semibold shadow-sm hidden md:block border-t border-slate-700/50">
        <div className="max-w-7xl mx-auto flex items-center overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`inline-flex items-center gap-2 px-4 py-3 border-b-2 font-medium tracking-tight whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? "bg-[#072648] border-[#ff9933] text-white font-bold shadow-inner"
                    : "border-transparent text-slate-100 hover:bg-[#114780] hover:text-white hover:border-[#ff9933]/50"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#ff9933]" : "text-slate-300"}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded text-[10px] uppercase font-bold tracking-wider ${
                      item.badgeColor || "bg-amber-400 text-slate-950"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div id="public-mobile-navigation" className="md:hidden bg-[#0c3866] text-white px-4 py-3 border-b border-slate-700 space-y-2">
          {/* Mobile Authenticated Status / SSO Login */}
          {user ? (
            <div className="p-2.5 rounded bg-[#072648] border border-slate-600 mb-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#ff9933] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Authenticated Officer
                </span>
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-[10px] text-red-300 underline font-semibold cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
              <p className="text-xs font-bold text-white">{user.name || user.username}</p>
              <p className="text-[11px] text-slate-300">
                {currentProfile.title} · {currentProfile.unit}
              </p>
              <Link
                href={currentProfile.primaryPath}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full mt-1 py-1.5 bg-[#ff9933] text-slate-950 font-bold text-xs rounded flex items-center justify-center gap-1 shadow-2xs"
              >
                <span>Open {currentProfile.badge}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="p-2.5 rounded bg-[#072648] border border-slate-600 mb-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-1.5 bg-[#0c3866] hover:bg-[#072648] border border-white/20 text-white font-bold text-xs rounded flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <User className="w-3.5 h-3.5" />
                <span>{t.header.ssoLogin}</span>
              </Link>
            </div>
          )}

          {/* Strictly Filtered Mobile Nav Items */}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded text-xs ${
                  isActive ? "bg-[#072648] text-[#ff9933] font-bold" : "hover:bg-[#114780]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      item.badgeColor || "bg-amber-400 text-slate-950"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-2 border-t border-white/20">
            <button
              type="button"
              onClick={() => {
                setShowVani(true);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs bg-amber-500/20 text-amber-300 font-semibold"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Prahari Helpline (IVR Simulator)</span>
            </button>
          </div>
        </div>
      )}

      {/* Global Interactive Phone Simulator */}
      {showVani && (
        <PrahariVaniSimulator isOpen={showVani} onClose={() => setShowVani(false)} />
      )}
    </>
  );
};
