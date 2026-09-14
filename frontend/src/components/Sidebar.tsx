"use client";

import { useTranslation } from "@/lib/i18n";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getStoredUser, logout } from "@/lib/auth";
import {
  Shield,
  LayoutDashboard,
  HeartHandshake,
  CalendarCheck,
  Sliders,
  Cpu,
  LogOut,
  User as UserIcon,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const { lang } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const user = mounted ? getStoredUser() : null;

  if (pathname === "/") {
    return null; // Do not render sidebar on login page
  }

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const navItems = [
    {
      label: "Troop Readiness",
      href: "/commander",
      icon: LayoutDashboard,
      roles: ["commander", "admin"],
    },
    {
      label: "Welfare Support",
      href: "/welfare",
      icon: HeartHandshake,
      roles: ["welfare", "admin"],
    },
    {
      label: "Shift Swapper",
      href: "/welfare/uro",
      icon: CalendarCheck,
      roles: ["commander", "welfare", "admin"],
    },
    {
      label: "Schedule Planner",
      href: "/welfare/what-if",
      icon: Sliders,
      roles: ["welfare", "admin"],
    },
    {
      label: "Activity Log & Health",
      href: "/admin",
      icon: Cpu,
      roles: ["admin"],
    },
  ];

  const filteredItems = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : true
  );

  const visibleMobileItems = filteredItems.slice(0, 4);

  return (
    <>
    <aside className="hidden md:flex h-16 bg-m3-primary text-m3-on-primary border-b border-m3-primary/80 items-center px-6 fixed inset-x-0 top-0 z-50 shadow-m3-1">
      <div className="flex w-full max-w-7xl mx-auto items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-m3-sm bg-white flex items-center justify-center text-m3-primary shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
              {lang === "hi" ? "प्रहरी" : lang === "ta" ? "பிரகாரி" : "PRAHARI"}
            </h1>
            <p className="text-[9px] text-blue-100 font-medium tracking-wider uppercase">
              Welfare & Readiness
            </p>
          </div>
        </div>

        {/* User Card (M3 Elevated Container) */}
        <nav className="flex items-center gap-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-m3-sm text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-white text-m3-primary shadow-sm"
                    : "text-blue-100 hover:text-white hover:bg-white/15"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-m3-primary" : "text-blue-100"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          {user && <span className="text-[10px] uppercase font-semibold tracking-wide text-blue-100">{user.username} · {user.role}</span>}
          <button onClick={handleLogout} className="flex items-center gap-2 rounded-m3-sm border border-white/50 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </div>
    </aside>

    <nav aria-label="Mobile navigation" className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-m3-outline-variant/80 bg-m3-surface-container-low/95 backdrop-blur px-2 py-2">
      <div className="flex items-center justify-around gap-1">
        {visibleMobileItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-m3-lg px-1 py-2 text-[9px] font-semibold ${isActive ? "bg-m3-primary-container text-m3-on-primary-container" : "text-m3-on-surface-variant"}`}>
              <Icon className={`h-4 w-4 ${isActive ? "text-m3-primary" : ""}`} />
              <span className="truncate">{item.label.replace("Commander ", "").replace("Welfare Cases & ", "")}</span>
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
};
