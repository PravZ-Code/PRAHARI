"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { setAuthData, getStoredUser, isAuthenticated, clearAuthData } from "@/lib/auth";
import {
  Shield,
  Lock,
  User,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  KeyRound,
  FileCheck,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Generate random 5-character captcha code
  const generateCaptcha = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setCaptchaInput("");
  };

  useEffect(() => {
    setMounted(true);
    generateCaptcha();
    if (isAuthenticated()) {
      const u = getStoredUser();
      let target = "/portal";
      if (u?.role === "commander") {
        target = "/commander";
      } else if (u?.role === "welfare" || u?.role === "welfare_officer") {
        target = "/welfare";
      } else if (u?.role === "admin") {
        target = "/admin";
      }
      window.location.replace(target);
      return;
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!username.trim() || !password) {
      setErrorMessage("Please enter both Officer Service Number and Password.");
      return;
    }

    if (captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      setErrorMessage("Invalid Captcha code entered. Please try again.");
      generateCaptcha();
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", {
        username: username.trim(),
        password: password,
      });

      const { access_token, user } = res.data;
      setAuthData(access_token, user);
      const sessionResponse = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: access_token }),
      });
      if (!sessionResponse.ok) {
        throw new Error("Unable to establish the browser session");
      }
      setSuccessMessage(`Welcome, ${user.username}. Authenticated as ${user.role}.`);

      const urlParams = new URLSearchParams(window.location.search);
      const redirectParam = urlParams.get("redirect");

      let target = "/portal";
      if (
        redirectParam &&
        redirectParam.startsWith("/") &&
        redirectParam !== "/" &&
        !redirectParam.startsWith("/login") &&
        !redirectParam.startsWith("/?")
      ) {
        target = redirectParam;
      } else if (user.role === "commander") {
        target = "/commander";
      } else if (user.role === "welfare" || user.role === "welfare_officer") {
        target = "/welfare";
      } else if (user.role === "admin") {
        target = "/admin";
      }

      window.location.replace(target);
    } catch (err: any) {
      console.error("Login failed:", err);
      clearAuthData();
      if (err.response?.data?.detail) {
        setErrorMessage(err.response.data.detail);
      } else {
        setErrorMessage("Authentication failed. Please verify credentials or check network connectivity.");
      }
      generateCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {/* Official Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500 flex items-center gap-1.5">
        <Link href="/" className="hover:text-[#0c3866] underline">Home</Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold" aria-current="page">Personnel & Officer Authentication</span>
      </nav>

      {/* Official Government Identity Header */}
      <div className="text-center space-y-3 border-b border-slate-200 pb-6">
        <div className="flex items-center justify-center gap-4 sm:gap-6 mb-2">
          <div className="w-12 h-14 sm:w-14 sm:h-16 flex items-center justify-center">
            <img
              src="/images/emblem_of_india.svg"
              alt="State Emblem of India"
              className="w-full h-full object-contain filter drop-shadow-xs"
            />
          </div>
          <div className="h-10 w-px bg-slate-300" />
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
            <img
              src="/images/prahari_logo_trans.png"
              alt="PRAHARI Official Crest"
              className="w-full h-full object-contain filter drop-shadow-md hover:scale-105 transition-transform"
            />
          </div>
          <div className="h-10 w-px bg-slate-300" />
          <div className="w-12 h-14 sm:w-14 sm:h-16 flex items-center justify-center">
            <img
              src="/images/crpf_logo_official.svg"
              alt="Central Reserve Police Force Crest"
              className="w-full h-full object-contain filter drop-shadow-xs"
            />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-300 rounded text-amber-900 text-xs font-semibold">
          <Shield className="w-3.5 h-3.5 text-amber-800" />
          <span>Official Government Gateway · Directorate General CRPF (Ministry of Home Affairs)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-heading">
          Central Armed Police Forces Personnel Portal
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto">
          Single Sign-On (SSO) gateway for Troopers, Company Commanders, Battalion Welfare Officers, and Administrative Personnel.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Login Form (7 cols) */}
        <div className="md:col-span-7 gov-card space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-[#0c3866] flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#0c3866]" />
              <span>Service Credentials Verification</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter official force username or service number and password to access your portal.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-300 rounded text-xs text-red-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Authentication Error:</strong> {errorMessage}
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              <div>{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username / Service No */}
            <div className="space-y-1">
              <label htmlFor="username" className="block text-xs font-bold text-slate-800">
                Service Number / Force ID / Username <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your service number or username"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-[#0c3866] focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label htmlFor="password" className="block text-xs font-bold text-slate-800">
                Security Password <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter security password"
                  className="w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-[#0c3866] focus:border-transparent outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Security Captcha */}
            <div className="space-y-1 pt-1">
              <label htmlFor="captcha" className="block text-xs font-bold text-slate-800">
                Security Verification (Captcha) <span className="text-red-600">*</span>
              </label>
              <div className="flex items-center gap-3">
                <div
                  suppressHydrationWarning
                  className="px-4 py-2 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-lg tracking-widest select-none text-slate-800 line-through decoration-slate-400"
                >
                  {mounted && captchaCode ? captchaCode : "•••••"}
                </div>
                <button
                  type="button"
                  onClick={generateCaptcha}
                  className="p-2 border border-slate-300 rounded hover:bg-slate-100 text-slate-600"
                  title="Reload Captcha"
                  aria-label="Reload Captcha"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <input
                  id="captcha"
                  type="text"
                  required
                  maxLength={5}
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  placeholder="Enter code"
                  className="flex-1 py-2 px-3 text-sm uppercase font-mono tracking-wider border border-slate-300 rounded focus:ring-2 focus:ring-[#0c3866] outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-2.5 px-4 bg-[#0c3866] hover:bg-[#0a2f55] text-white text-sm font-bold rounded shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Authorize & Sign In</span>
                </>
              )}
            </button>
          </form>

        </div>

        {/* RIGHT COLUMN: Statutory Advisories & Security Compliance (5 cols) */}
        <div className="md:col-span-5 space-y-4">
          <div className="gov-card space-y-3 bg-amber-50/40 border-amber-200">
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-800" />
              <span>Official Warning & Statutory Notice</span>
            </h3>
            <p className="text-xs text-amber-950 leading-relaxed">
              This digital portal is restricted to authorized personnel of the Central Armed Police Forces / Ministry of Home Affairs. Unauthorized access, alteration of operational records, or tampering with personnel welfare data is punishable under:
            </p>
            <ul className="text-xs text-amber-900 space-y-1 list-disc pl-4">
              <li>Information Technology Act, 2000 (Section 43 & 66)</li>
              <li>Official Secrets Act, 1923</li>
              <li>Mental Healthcare Act, 2017 (Confidentiality Section 23)</li>
            </ul>
          </div>

          <div className="gov-card space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-[#0c3866]" />
              <span>Cryptographic Governance</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every officer authentication, roster change, and welfare docket modification is cryptographically hashed with SHA-256 and appended to the immutable tamper-evident ledger compliant with Section 65B of the Indian Evidence Act.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Session Duration:</span>
              <span className="font-semibold text-slate-700">15 min idle timeout</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 block">Authorized Role Portals</span>
              <span className="text-[10px] text-slate-500 font-mono">Demo Accounts</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Select an authorized CAPF role to populate credentials for instant portal verification:
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setUsername("personnel_unit_a_01");
                  setPassword("demo123");
                  setCaptchaInput(captchaCode);
                }}
                className="p-2 bg-white hover:bg-amber-50/60 border border-amber-300 rounded text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-[#0c3866] text-[11px]">Trooper (Personnel)</div>
                <div className="text-[10px] text-slate-500 font-mono">personnel_unit_a_01</div>
                <div className="text-[9px] text-emerald-700 font-semibold mt-0.5">→ Trooper Portal</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsername("commander_unit_a");
                  setPassword("demo123");
                  setCaptchaInput(captchaCode);
                }}
                className="p-2 bg-white hover:bg-blue-50/60 border border-blue-300 rounded text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-[#0c3866] text-[11px]">Company Commander</div>
                <div className="text-[10px] text-slate-500 font-mono">commander_unit_a</div>
                <div className="text-[9px] text-blue-700 font-semibold mt-0.5">→ Command Center</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsername("welfare_officer_01");
                  setPassword("demo123");
                  setCaptchaInput(captchaCode);
                }}
                className="p-2 bg-white hover:bg-emerald-50/60 border border-emerald-300 rounded text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-[#0c3866] text-[11px]">Welfare Officer</div>
                <div className="text-[10px] text-slate-500 font-mono">welfare_officer_01</div>
                <div className="text-[9px] text-emerald-700 font-semibold mt-0.5">→ Welfare Desk</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsername("system_admin");
                  setPassword("demo123");
                  setCaptchaInput(captchaCode);
                }}
                className="p-2 bg-white hover:bg-purple-50/60 border border-purple-300 rounded text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-[#0c3866] text-[11px]">System Administrator</div>
                <div className="text-[10px] text-slate-500 font-mono">system_admin</div>
                <div className="text-[9px] text-purple-700 font-semibold mt-0.5">→ Audit & Health</div>
              </button>
            </div>
            <div className="pt-1 text-[10px] text-slate-500 border-t border-slate-200">
              Default password: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold text-slate-800">demo123</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
