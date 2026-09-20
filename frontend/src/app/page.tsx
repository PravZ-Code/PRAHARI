"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  HeartHandshake,
  AlertTriangle,
  FileText,
  Search,
  CheckCircle2,
  Lock,
  ArrowRight,
  PhoneCall,
  Calendar,
  Scale,
  Users,
  ChevronRight,
  ChevronLeft,
  Bell,
  Activity,
  ShieldCheck,
  HelpCircle,
  Clock,
  Compass,
  LayoutDashboard,
  RefreshCw,
  Sliders,
  Shield,
  FileCheck,
  Radio,
  UserCheck,
  XCircle,
  ExternalLink,
  Play,
  Pause,
  Award,
  BookOpen,
  Cpu,
  Database,
  Building2,
  LogIn,
} from "lucide-react";
import { PrahariVaniSimulator } from "@/components/PrahariVaniSimulator";
import { useTranslation } from "@/lib/i18n";
import { getStoredUser, UserProfile } from "@/lib/auth";
import { api } from "@/lib/api";

interface LiveBulletin {
  id: string;
  title: string;
  source: string;
  date: string;
  tag: string;
  is_new: boolean;
  link: string;
  snippet?: string;
}

interface UnifiedBulletin {
  id?: string;
  title: string;
  source?: string;
  date: string;
  tag: string;
  is_new?: boolean;
  isNew?: boolean;
  link?: string;
  href?: string;
  snippet?: string;
  action?: () => void;
}

export default function HomePage() {
  const { t, lang } = useTranslation();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showVani, setShowVani] = useState(false);
  const [trackRef, setTrackRef] = useState("");
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [whatsNewIndex, setWhatsNewIndex] = useState(0);
  const [selectedCalDate, setSelectedCalDate] = useState<number>(13);
  const [liveBulletins, setLiveBulletins] = useState<LiveBulletin[]>([]);
  const [bulletinSource, setBulletinSource] = useState<string>("live_internet");
  const [bulletinUpdated, setBulletinUpdated] = useState<string>("");
  const [bulletinLoading, setBulletinLoading] = useState<boolean>(false);

  const heroSlideImages = [
    "/images/crpf_parade_official.jpg",
    "/images/amit_shah_capf_chiefs.jpg",
    "/images/bsf_parade_official.jpg",
  ];

  const heroSlides = t.hero.slides.map((slide, idx) => ({
    image: heroSlideImages[idx],
    badge: slide.badge,
    title: slide.title,
    subtitle: slide.subtitle,
    description: slide.description,
    primaryAction: {
      text: slide.primaryAction,
      href: idx === 2 ? undefined : idx === 0 ? "/request?type=leave" : "/request?type=welfare",
      action: idx === 2 ? () => setShowVani(true) : undefined,
    },
    secondaryAction: {
      text: slide.secondaryAction,
      href: idx === 0 ? "/emergency" : idx === 1 ? "/privacy" : "/track",
    },
  }));

  useEffect(() => {
    setUser(getStoredUser());
    fetchLiveBulletins();
  }, []);

  const fetchLiveBulletins = async (forceRefresh = false) => {
    setBulletinLoading(true);
    try {
      const res = await api.get(`/welfare/bulletins${forceRefresh ? "?refresh=true" : ""}`);
      if (res.data && res.data.bulletins && res.data.bulletins.length > 0) {
        setLiveBulletins(res.data.bulletins);
        setBulletinSource(res.data.source || "live_internet");
        if (res.data.last_updated) {
          try {
            const dt = new Date(res.data.last_updated);
            setBulletinUpdated(dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
          } catch {
            setBulletinUpdated("");
          }
        }
      }
    } catch (err) {
      console.warn("Failed to fetch live bulletins, using default items:", err);
    } finally {
      setBulletinLoading(false);
    }
  };

  const getServiceLink = (url: string) => {
    if (!user) {
      return `/login?redirect=${encodeURIComponent(url)}`;
    }
    return url;
  };

  // Auto-advance hero carousel
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [isPaused, heroSlides.length]);

  const calEvents = t.calendar.events;
  const whatsNewItems = t.whatsNew.items as Array<{
    date: string;
    title: string;
    tag: string;
    isNew: boolean;
    href: string;
    action?: () => void;
  }>;

  return (
    <div className="space-y-12 pb-16 animate-fade-in">
      {/* ========================================================================= */}
      {/* HERO CAROUSEL (PEAK GOVERNMENT WEBSITE DESIGN - NIC STYLE)                */}
      {/* ========================================================================= */}
          <section
            className="relative bg-[#072648] text-white border-b-4 border-[#ff9933] overflow-hidden animate-slide-up"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            aria-label="Service Overview Carousel"
          >
            {heroSlides.map((slide, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  activeSlide === idx ? "opacity-40" : "opacity-0 pointer-events-none"
                }`}
              >
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-full h-full object-cover object-center filter brightness-90 contrast-105 motion-safe:animate-[heroZoom_12s_ease-in-out_infinite]"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#072648] via-[#072648]/85 to-transparent" />
              </div>
            ))}

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 z-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Slide Text Content */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white/10 font-semibold border border-white/20 backdrop-blur-xs">
                      <img
                        src="/images/prahari_logo_trans.png"
                        alt="PRAHARI Logo"
                        className="w-5 h-5 object-contain filter drop-shadow-xs"
                      />
                      <span>CRPF Frontline Personnel Welfare Desk</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded bg-[#ff9933] text-slate-950 font-bold text-[11px] uppercase tracking-wider">
                      {heroSlides[activeSlide].badge}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-amber-300 text-xs sm:text-sm font-bold tracking-wide uppercase block font-heading">
                      {heroSlides[activeSlide].subtitle}
                    </span>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white font-heading leading-tight">
                      {heroSlides[activeSlide].title}
                    </h1>
                    <p className="text-slate-200 text-xs sm:text-sm leading-relaxed max-w-2xl font-normal">
                      {heroSlides[activeSlide].description}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    {user && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#ff9933]/20 border border-[#ff9933]/40 text-amber-200 text-xs font-semibold w-fit">
                        <span>Authenticated as {user.name || user.username} ({user.role})</span>
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
                          className="underline text-white font-bold hover:text-amber-300 ml-1"
                        >
                          Go to My Portal &rarr;
                        </Link>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={getServiceLink("/request?type=leave")}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff9933] hover:bg-[#e65100] text-slate-950 font-bold rounded-md shadow-md text-xs sm:text-sm hover-scale active-press hover-lift hover-glow-saffron group"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Apply for Leave / Support</span>
                        <ArrowRight className="w-4 h-4 group-hover-arrow" />
                      </Link>
                      <Link
                        href={getServiceLink("/emergency")}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md shadow-sm text-xs sm:text-sm hover-scale active-press hover-lift"
                      >
                        <AlertTriangle className="w-4 h-4 text-white animate-pulse" />
                        <span>Emergency SOS (12h SLA)</span>
                      </Link>
                      <Link
                        href={getServiceLink("/track")}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold rounded-md border border-white/20 shadow-sm text-xs sm:text-sm hover-scale active-press hover-lift group"
                      >
                        <Search className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform" />
                        <span>Track Application</span>
                      </Link>
                      <Link
                        href="/privacy"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 font-semibold rounded-md border border-white/15 text-xs sm:text-sm hover-scale active-press hover-lift"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-300" />
                        <span>Statutory Protection</span>
                      </Link>
                    </div>
                  </div>

                  {/* Carousel Controls & Indicators (NIC Style) */}
                  <div className="flex items-center gap-4 pt-4">
                    <button
                      onClick={() => setIsPaused(!isPaused)}
                      className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
                      title={isPaused ? "Play slide show" : "Pause slide show"}
                      aria-label={isPaused ? "Play slide show" : "Pause slide show"}
                    >
                      {isPaused ? <Play className="w-3.5 h-3.5 fill-white" /> : <Pause className="w-3.5 h-3.5 fill-white" />}
                    </button>

                    <div className="flex items-center gap-2">
                      {heroSlides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveSlide(idx)}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            activeSlide === idx
                              ? "w-8 bg-[#ff9933]"
                              : "w-2.5 bg-white/40 hover:bg-white/70"
                          }`}
                          aria-label={`Go to slide ${idx + 1}`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-1 border-l border-white/20 pl-3">
                      <button
                        onClick={() => setActiveSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
                        className="p-1 rounded hover:bg-white/20 text-white transition-colors"
                        aria-label="Previous Slide"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setActiveSlide((prev) => (prev + 1) % heroSlides.length)}
                        className="p-1 rounded hover:bg-white/20 text-white transition-colors"
                        aria-label="Next Slide"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Hero Box: Quick Grievance / Request Tracker Card */}
                <div className="lg:col-span-4 bg-white p-5 rounded-lg shadow-xl border border-slate-200 text-slate-900">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5 mb-3">
                    <Search className="w-4 h-4 text-[#0c3866]" />
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-heading">
                      {t.hero.quickCheck.title}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    Enter your acknowledgement reference to see review stage, officer assigned, and cover arrangements.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const target = trackRef.trim() || "PRH-2026-000184";
                      if (!user) {
                        window.location.href = `/login?redirect=${encodeURIComponent(`/track?ref=${target}`)}`;
                      } else {
                        window.location.href = `/track?ref=${encodeURIComponent(target)}`;
                      }
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <input
                        type="text"
                        value={trackRef}
                        onChange={(e) => setTrackRef(e.target.value)}
                        placeholder="e.g. PRH-2026-000184"
                        className="w-full px-3 py-2 text-xs uppercase font-mono tracking-wider bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0c3866]"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Standard Reference: PRH-2026-XXXXXX
                      </span>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-[#0c3866] hover:bg-[#072648] text-white text-xs font-bold rounded flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{t.hero.quickCheck.btn}</span>
                    </button>
                  </form>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{t.hero.quickCheck.sampleLabel}:</span>
                    <Link
                      href={user ? "/track?ref=PRH-2026-000184" : "/login?redirect=/track?ref=PRH-2026-000184"}
                      className="font-mono font-bold text-[#0c3866] hover:underline"
                    >
                      PRH-2026-000184
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            {/* ========================================================================= */}
            {/* DIGNITARY / LEADERSHIP CARDS (NIC STYLE: `about-minister` / `ministry_card`)*/}
            {/* ========================================================================= */}
            <section id="about" className="pt-2">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {/* Left: About PRAHARI */}
                <div className="lg:col-span-5 bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b-2 border-[#0c3866] pb-2">
                      <div className="flex items-center gap-2.5">
                        <img
                          src="/images/emblem_of_india.svg"
                          alt="State Emblem of India"
                          className="w-7 h-9 object-contain shrink-0"
                        />
                        <img
                          src="/images/prahari_logo_trans.png"
                          alt="Official PRAHARI Emblem"
                          className="w-9 h-9 object-contain shrink-0 filter drop-shadow-xs"
                        />
                        <img
                          src="/images/crpf_logo_official.svg"
                          alt="CRPF Crest"
                          className="w-7 h-9 object-contain shrink-0"
                        />
                        <div>
                          <h2 className="text-lg font-bold text-[#0c3866] font-heading">
                            {lang === "hi" ? "प्रहरी परिचय" : lang === "ta" ? "பிரகாரி அறிமுகம்" : "About PRAHARI"}
                          </h2>
                          <span className="text-[10px] text-[#ff9933] font-bold block">
                            {t.header.motto}
                          </span>
                        </div>
                      </div>
                      <span className="border-l-2 border-[#0c3866] pl-2 text-[10px] font-mono uppercase tracking-wide text-slate-600 font-semibold">
                        MHA-CRPF-DIR
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {lang === "hi"
                        ? "प्रहरी केंद्रीय सशस्त्र पुलिस बलों के लिए गृह मंत्रालय के मार्गदर्शन में विकसित कार्मिक कल्याण एवं शिकायत निवारण मंच है।"
                        : lang === "ta"
                        ? "பிரகாரி என்பது உள்துறை அமைச்சகத்தின் வழிகாட்டுதலின் கீழ் மத்திய ஆயுதக் காவல் படைகளுக்காக உருவாக்கப்பட்ட பணியாளர் நலன் மற்றும் குறை தீர்க்கும் தளமாகும்."
                        : "PRAHARI (Personnel Welfare & Grievance Resolution Platform) is an institutional digital welfare initiative developed under the guidance of the Ministry of Home Affairs for the Central Armed Police Forces."}
                    </p>
                    <ul className="text-xs text-slate-700 space-y-2 pt-1">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>{lang === "hi" ? "कार्मिक प्राथमिकता: " : lang === "ta" ? "பணியாளர் முன்னுரிமை: " : "Personnel First: "}</strong>
                          {lang === "hi"
                            ? "बिना किसी भय के गोपनीय अवकाश एवं कल्याण सहायता आवेदन।"
                            : lang === "ta"
                            ? "எந்தவொரு அச்சமுமின்றி ரகசிய விடுப்பு மற்றும் நல உதவி விண்ணப்பம்."
                            : "Confidential leave and support self-service without fear of prejudice."}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>{lang === "hi" ? "अनिवार्य मानवीय निगरानी: " : lang === "ta" ? "கட்டாய மனித மேற்பார்வை: " : "Mandatory Human Oversight: "}</strong>
                          {lang === "hi"
                            ? "स्वचालित प्रणालियाँ कभी भी स्वतंत्र रूप से अवकाश अस्वीकार नहीं करतीं।"
                            : lang === "ta"
                            ? "தானியங்கி அமைப்புகள் சுயாதீனமாக விடுப்பை நிராகரிப்பதில்லை."
                            : "Automated systems never decline leave or alter duty rosters independently."}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>{lang === "hi" ? "धारा 21 वैधानिक सुरक्षा: " : lang === "ta" ? "பிரிவு 21 சட்டப்பூர்வ பாதுகாப்பு: " : "Statutory Section 21 Protection: "}</strong>
                          {lang === "hi"
                            ? "मानसिक स्वास्थ्य देखभाल अधिनियम 2017 के अनुरूप सुरक्षा कवच।"
                            : lang === "ta"
                            ? "மனநலப் பராமரிப்புச் சட்டம் 2017-ன் கீழான சட்டப்பூர்வ பாதுகாப்பு உத்தரவாதம்."
                            : "Guardrails compliant with the Mental Healthcare Act 2017."}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>{lang === "hi" ? "सत्यापनीय साक्ष्य: " : lang === "ta" ? "சரிபார்க்கக்கூடிய சான்று: " : "Verifiable Evidence: "}</strong>
                          {lang === "hi"
                            ? "बीएसए 2023 धारा 63 के अनुरूप क्रिप्टोग्राफिक एसएचए-256 ऑडिट लेजर।"
                            : lang === "ta"
                            ? "BSA 2023 பிரிவு 63-ன் கீழ் கிரிப்டோகிராஃபிக் SHA-256 தணிக்கைப் பதிவேடு."
                            : "Cryptographic SHA-256 audit ledger compliant with BSA 2023 Section 63."}
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
                    <Link
                      href="/privacy"
                      className="font-bold text-[#0c3866] hover:underline flex items-center gap-1"
                    >
                      <span>Read Welfare Charter & Privacy Rules</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Right: Leadership / Dignitary Cards */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Dignitary Card 1: Shri Amit Shah */}
                  <div className="nic-card p-4 flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-full sm:w-48 h-36 rounded-lg overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                      <img
                        src="/images/amit_shah.jpg"
                        alt="Shri Amit Shah, Hon'ble Union Minister of Home Affairs"
                        className="w-full h-full object-cover object-top filter contrast-105"
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#ff9933] block">
                        Ministry of Home Affairs · Government of India
                      </span>
                      <h3 className="text-base font-bold text-[#0c3866] font-heading">
                        Shri Amit Shah
                      </h3>
                      <p className="text-xs font-semibold text-slate-800">
                        Hon&apos;ble Union Minister of Home Affairs and Minister of Cooperation
                      </p>
                      <p className="text-[11px] text-slate-500 italic pt-1 leading-snug">
                        &ldquo;Ensuring the dignity, health, and welfare of every jawan guarding our borders is the nation&apos;s foremost priority.&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Dignitary Card 2: Director General CRPF */}
                  <div className="nic-card p-4 flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-full sm:w-48 h-36 rounded-lg overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                      <div className="w-full h-full flex items-center justify-center p-3 bg-slate-50">
                        <img
                          src="/images/crpf_logo_official.svg"
                          alt="Directorate General, Central Reserve Police Force"
                          className="w-full h-full object-contain filter drop-shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1 text-left">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                        Head of Force · Force Welfare Directorate
                      </span>
                      <h3 className="text-base font-bold text-[#0c3866] font-heading">
                        Director General, CRPF
                      </h3>
                      <p className="text-xs font-semibold text-slate-800">
                        Directorate General, Central Reserve Police Force (MHA)
                      </p>
                      <p className="text-[11px] text-slate-500 italic pt-1 leading-snug">
                        &ldquo;PRAHARI bridges the operational frontier and personal family security, ensuring every trooper is heard without delay.&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ========================================================================= */}
            {/* WHAT'S NEW BULLETINS & WELFARE CALENDAR (NIC STYLE: `NIC-calender`)        */}
            {/* ========================================================================= */}
            <section className="bg-[#eeecf9] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-10 border-y border-slate-200">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: What's New Sliding Feed */}
                <div className="lg:col-span-7 bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between border-b-2 border-[#29136C] pb-2 gap-2">
                    <div className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-[#ff9933]" />
                      <h2 className="text-xl font-bold text-[#29136C] font-heading">
                        What&apos;s New & Welfare Bulletins
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {bulletinSource === "live_internet" ? "LIVE MHA/CRPF FEED" : "STATUTORY WELFARE FEED"}
                      </span>
                      {bulletinUpdated && (
                        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline" title="Last live sync timestamp">
                          {bulletinUpdated}
                        </span>
                      )}
                      <button
                        onClick={() => fetchLiveBulletins(true)}
                        disabled={bulletinLoading}
                        className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-[#29136C] transition-colors disabled:opacity-50"
                        title="Force sync latest bulletins from official sources"
                        aria-label="Refresh bulletins"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${bulletinLoading ? "animate-spin text-[#29136C]" : ""}`} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {bulletinLoading && liveBulletins.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#29136C]" />
                        <span>Synchronizing live MHA/CRPF bulletins...</span>
                      </div>
                    ) : (
                      (liveBulletins.length > 0 ? liveBulletins : whatsNewItems).map((item: UnifiedBulletin, idx: number) => {
                        const href = item.link || item.href || "#";
                        const isNew = Boolean(item.is_new ?? item.isNew);
                        const isExternal = href.startsWith("http");

                        return (
                          <div
                            key={item.id || idx}
                            className="p-3 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-mono font-bold text-slate-500">
                                  {item.date}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                                  {item.tag}
                                </span>
                                {item.source && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                    {item.source}
                                  </span>
                                )}
                                {isNew && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-red-600 text-white animate-pulse">
                                    NEW
                                  </span>
                                )}
                              </div>
                              {item.action ? (
                                <button
                                  onClick={item.action}
                                  className="text-left font-semibold text-[#0c3866] hover:underline block"
                                >
                                  {item.title}
                                </button>
                              ) : isExternal ? (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold text-[#0c3866] hover:underline inline-flex items-center gap-1.5 group/link"
                                  title="Open official press release / portal in new tab"
                                >
                                  <span className="line-clamp-2">{item.title}</span>
                                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover/link:text-[#0c3866] shrink-0" />
                                </a>
                              ) : (
                                <Link href={href} className="font-semibold text-[#0c3866] hover:underline block">
                                  {item.title}
                                </Link>
                              )}
                              {item.snippet && (
                                <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                                  {item.snippet}
                                </p>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-2 text-right">
                    <Link
                      href={getServiceLink("/track")}
                      className="text-xs font-bold text-[#29136C] hover:underline inline-flex items-center gap-1"
                    >
                      <span>{t.whatsNew.viewAll} & Standing Orders</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Right: Force Welfare Calendar & Duty Rest Cycle */}
                <div id="circulars" className="lg:col-span-5 bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b-2 border-[#29136C] pb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#29136C]" />
                      <h2 className="text-xl font-bold text-[#29136C] font-heading">
                        {t.calendar.title}
                      </h2>
                    </div>
                    <span className="text-[11px] font-bold text-slate-700">{t.calendar.monthYear}</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {t.calendar.restGuaranteeText}
                  </p>

                  {/* Calendar Widget Preview */}
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/70 text-xs">
                                        <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-600 border-b border-slate-200 pb-1 mb-2">
                      {t.calendar.days.map((d, i) => (
                        <span key={i}>{d}</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center font-mono">
                      {/* Aug 30, 31 (dimmed) */}
                      <span className="text-slate-300 py-1 cursor-default select-none">30</span>
                      <span className="text-slate-300 py-1 cursor-default select-none">31</span>

                      {/* Sep 1-30 */}
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
                        const ev = calEvents[day];
                        const isToday = day === 13;
                        const isSelected = selectedCalDate === day;

                        let bgClass = "bg-white text-slate-800 hover:bg-slate-100 border border-slate-200/80";
                        if (isToday) {
                          bgClass = "bg-emerald-600 text-white font-bold shadow-xs";
                        } else if (ev) {
                          if (ev.type === "Gazetted Holiday" || ev.type === "Restricted Holiday") {
                            bgClass = "bg-purple-100 text-purple-900 font-bold border border-purple-200";
                          } else if (ev.type === "Rest Barrier") {
                            bgClass = "bg-blue-100 text-blue-900 font-bold border border-blue-200";
                          } else if (ev.type === "Welfare Redressal" || ev.type === "Command Redressal") {
                            bgClass = "bg-amber-100 text-amber-900 font-bold border border-amber-200";
                          } else if (ev.type === "Healthcare Welfare") {
                            bgClass = "bg-emerald-100 text-emerald-900 font-bold border border-emerald-200";
                          }
                        }

                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => setSelectedCalDate(day)}
                            title={ev ? `${ev.title} (${ev.type})` : `Sep ${day} - Standard Roster`}
                            className={`py-1 rounded text-xs transition-all cursor-pointer ${bgClass} ${
                              isSelected ? "ring-2 ring-offset-1 ring-[#0c3866] font-extrabold scale-105 z-10" : ""
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}

                      {/* Oct 1, 2, 3 (dimmed) */}
                      <span className="text-slate-300 py-1 cursor-default select-none">1</span>
                      <span className="text-slate-300 py-1 cursor-default select-none">2</span>
                      <span className="text-slate-300 py-1 cursor-default select-none">3</span>
                    </div>

                    {/* Legend */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-[10px] text-slate-600 gap-1.5">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-600" /> {t.calendar.legendToday}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-purple-500" /> {t.calendar.legendHoliday}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500" /> {t.calendar.legendRest}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> {t.calendar.legendReview}
                      </span>
                    </div>

                    {/* Interactive Day Details Card */}
                    <div className="mt-3 p-3 rounded-lg border border-slate-200 bg-white shadow-2xs space-y-1.5 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#0c3866]" />
                          {selectedCalDate} September 2026
                        </span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            selectedCalDate === 13
                              ? "bg-emerald-100 text-emerald-800"
                              : calEvents[selectedCalDate]?.type === "Gazetted Holiday"
                              ? "bg-purple-100 text-purple-800"
                              : calEvents[selectedCalDate]?.type === "Rest Barrier"
                              ? "bg-blue-100 text-blue-800"
                              : calEvents[selectedCalDate]?.type?.includes("Redressal")
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {calEvents[selectedCalDate]?.type || "Standard Duty Shift"}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">
                        {calEvents[selectedCalDate]?.title || "Standard Operational Roster · 8h Rest Barrier Active"}
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        {calEvents[selectedCalDate]?.desc ||
                          "Routine sentry and administrative deployment. Automated fatigue monitoring active; mandatory uninterrupted 8-hour sleep/rest window guaranteed."}
                      </p>
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                        <span>
                          {t.calendar.authorityLabel}: <strong className="text-slate-700">{calEvents[selectedCalDate]?.authority || "CRPF Standard Operating Procedure"}</strong>
                        </span>
                        {selectedCalDate === 13 && (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {t.calendar.liveDateLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/what-if"
                    className="w-full py-2 bg-[#0c3866] hover:bg-[#072648] text-white text-xs font-bold rounded flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Scale className="w-3.5 h-3.5 text-[#ff9933]" />
                    <span>{t.calendar.checkComplianceBtn}</span>
                  </Link>
                </div>
              </div>
            </section>

            {/* ========================================================================= */}
            {/* CORE SERVICES GRID (NIC STYLE: `offerings-sec` / `core-services`)          */}
            {/* ========================================================================= */}
            <section aria-labelledby="core-services-heading" className="space-y-6">
              <div className="text-center space-y-1">
                <span className="text-[11px] font-bold tracking-widest text-[#ff9933] uppercase font-heading">
                  {t.services.tag}
                </span>
                <h2 id="core-services-heading" className="text-2xl sm:text-3xl font-bold text-[#0c3866] font-heading">
                  {t.services.title}
                </h2>
                <p className="text-xs text-slate-600 max-w-xl mx-auto">
                  {t.services.desc}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. Request Leave */}
                <Link
                  href={getServiceLink("/request?type=leave")}
                  className="nic-card hover-lift active-press animate-fade-in-up stagger-1 flex flex-col justify-between p-5 border-t-4 border-t-[#0c3866] bg-white group"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0c3866] flex items-center justify-center group-hover:bg-[#0c3866] group-hover:text-white transition-colors shadow-2xs group-hover-bounce">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-[#0c3866] transition-colors">
                      {t.services.leave.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t.services.leave.desc}
                    </p>
                  </div>
                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0c3866]">
                    <span><span>Apply for Leave</span></span>
                    {user ? (
                      <ArrowRight className="w-4 h-4 group-hover-arrow" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0c3866]" />
                    )}
                  </div>
                </Link>

                {/* 2. Family Emergency */}
                <Link
                  href={getServiceLink("/emergency")}
                  className="nic-card hover-lift active-press animate-fade-in-up stagger-2 flex flex-col justify-between p-5 border-t-4 border-t-red-600 bg-white group"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-red-50 text-red-700 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors shadow-2xs group-hover-bounce">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-red-700 transition-colors">
                          {t.services.emergency.title}
                        </h3>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-700 uppercase animate-pulse">
                          12h Fast-Lane
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {t.services.emergency.desc}
                      </p>
                  </div>
                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-red-700">
                    <span><span>Emergency SOS (12h)</span></span>
                    {user ? (
                      <ArrowRight className="w-4 h-4 group-hover-arrow" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-red-400 group-hover:text-red-700" />
                    )}
                  </div>
                </Link>

                {/* 3. Confidential Welfare Support */}
                <Link
                  href={getServiceLink("/request?type=welfare")}
                  className="nic-card hover-lift active-press animate-fade-in-up stagger-3 flex flex-col justify-between p-5 border-t-4 border-t-emerald-600 bg-white group"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-2xs group-hover-bounce">
                      <HeartHandshake className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-emerald-700 transition-colors">
                      Welfare Support
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Confidential guidance regarding domestic debt, stress fatigue, or medical assistance directly from your Battalion Welfare Officer.
                    </p>
                  </div>
                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                    <span><span>Request Support</span></span>
                    {user ? (
                      <ArrowRight className="w-4 h-4 group-hover-arrow" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-700" />
                    )}
                  </div>
                </Link>

                {/* 4. Grievance Desk */}
                <Link
                  href={getServiceLink("/request?type=grievance")}
                  className="nic-card hover-lift active-press animate-fade-in-up stagger-4 flex flex-col justify-between p-5 border-t-4 border-t-amber-500 bg-white group"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors shadow-2xs group-hover-bounce">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-amber-800 transition-colors">
                      Grievance Desk
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Formal registration of allowance disputes, hard-area claims, or service grievances with tamper-evident digital receipt generation.
                    </p>
                  </div>
                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-800">
                    <span><span>File Grievance</span></span>
                    {user ? (
                      <ArrowRight className="w-4 h-4 group-hover-arrow" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-800" />
                    )}
                  </div>
                </Link>
              </div>
            </section>

            <section aria-labelledby="public-service-gallery-heading" className="space-y-6 animate-slide-up">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold tracking-widest text-[#ff9933] uppercase font-heading">
                    Public service
                  </span>
                  <h2 id="public-service-gallery-heading" className="text-2xl sm:text-3xl font-bold text-[#0c3866] font-heading">
                    Serving personnel across India
                  </h2>
                </div>
                <p className="max-w-md text-xs text-slate-600">
                  Officially sourced force and public-service imagery used to keep the portal grounded in its national mission.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { src: "/images/crpf_parade_official.jpg", alt: "CRPF personnel at an official parade", label: "Force readiness" },
                  { src: "/images/bsf_parade_official.jpg", alt: "Border Security Force personnel at an official parade", label: "Service across borders" },
                  { src: "/images/amit_shah_capf_chiefs.jpg", alt: "Union leadership with Central Armed Police Forces chiefs", label: "Institutional stewardship" },
                ].map((image) => (
                  <figure key={image.src} className="nic-card overflow-hidden bg-white group">
                    <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                      <img
                        src={image.src}
                        alt={image.alt}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                      />
                    </div>
                    <figcaption className="px-4 py-3 text-xs font-bold text-slate-800">{image.label}</figcaption>
                  </figure>
                ))}
              </div>
            </section>

            {/* ========================================================================= */}
            {/* NEXT-GEN INNOVATIONS (NIC STYLE: `emerging-technology`)                    */}
            {/* ========================================================================= */}
            <section className="space-y-6">
              <div className="text-center space-y-1">
                <span className="text-[11px] font-bold tracking-widest text-[#29136C] uppercase font-heading">
                  Next-Gen Innovations
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
                  Emerging Technologies for Force Welfare
                </h2>
                <p className="text-xs text-slate-600 max-w-xl mx-auto">
                  Architected with clinical safety guardrails, statutory record integrity, and duty rest safeguards.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Innovation 1 */}
                <div className="nic-card hover-lift active-press animate-fade-in-up stagger-1 p-6 bg-white space-y-3 border-t-4 border-t-[#29136C] group">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-[#29136C] flex items-center justify-center font-bold group-hover-bounce">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-[#29136C] transition-colors">
                    {t.innovations.guardrails.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Automatic clinical sanitization compliant with Mental Healthcare Act 2017 (§21 & §115). Converts clinical diagnosis terms into non-stigmatizing operational stress terminology.
                  </p>
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-[#29136C] flex items-center gap-1">
                      <span>MHA Section 21 Compliant</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </span>
                  </div>
                </div>

                {/* Innovation 2 */}
                <div className="nic-card hover-lift active-press animate-fade-in-up stagger-2 p-6 bg-white space-y-3 border-t-4 border-t-emerald-600 group">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold group-hover-bounce">
                    <Scale className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-emerald-700 transition-colors">
                    {t.innovations.uro.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Mixed-integer shift optimization enforcing strict trade compatibility (GD ↔ GD, Armorer ↔ Armorer), rolling 8-hour rest barriers, and unit fairness caps.
                  </p>
                  <div className="pt-2">
                    <Link href="/what-if" className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1">
                      <span>Explore Tactical Roster Engine</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover-arrow" />
                    </Link>
                  </div>
                </div>

                {/* Innovation 3 */}
                <div className="nic-card hover-lift active-press animate-fade-in-up stagger-3 p-6 bg-white space-y-3 border-t-4 border-t-amber-600 group">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold group-hover-bounce">
                    <Database className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-amber-800 transition-colors">
                    Cryptographic Audit Ledger
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    SHA-256 block hash chaining for all administrative actions. Meets Section 63 of Bharatiya Sakshya Adhiniyam 2023 for Court of Inquiry electronic record admissibility.
                  </p>
                  <div className="pt-2">
                    <Link href={getServiceLink("/admin")} className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1">
                      <span>Verify Ledger Integrity (SHA-256)</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover-arrow" />
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* ========================================================================= */}
            {/* NATIONAL READINESS & IMPACT METRICS STRIP                                 */}
            {/* ========================================================================= */}
            <section className="bg-[#0c3866] text-white rounded-xl p-8 shadow-lg border-b-4 border-[#ff9933] hover-lift transition-all">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div className="space-y-1 hover-scale transition-transform duration-200 cursor-default p-2 rounded-lg hover:bg-white/5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#ff9933] font-mono block">
                    3,25,000+
                  </span>
                  <span className="text-xs text-slate-200 font-semibold block">
                    Frontline Jawans Covered
                  </span>
                  <span className="text-[10px] text-slate-400">Across 5 Tactical Sectors</span>
                </div>

                <div className="space-y-1 border-l border-white/20 hover-scale transition-transform duration-200 cursor-default p-2 rounded-lg hover:bg-white/5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono block">
                    99.4%
                  </span>
                  <span className="text-xs text-slate-200 font-semibold block">
                    Statutory SLA Compliance
                  </span>
                  <span className="text-[10px] text-slate-400">&lt;12h Emergency Review</span>
                </div>

                <div className="space-y-1 border-l border-white/20 hover-scale transition-transform duration-200 cursor-default p-2 rounded-lg hover:bg-white/5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono block">
                    0
                  </span>
                  <span className="text-xs text-slate-200 font-semibold block">
                    Automated Denials
                  </span>
                  <span className="text-[10px] text-slate-400">100% Human Sign-Off</span>
                </div>

                <div className="space-y-1 border-l border-white/20 hover-scale transition-transform duration-200 cursor-default p-2 rounded-lg hover:bg-white/5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#ff9933] font-mono block">
                    24x7
                  </span>
                  <span className="text-xs text-slate-200 font-semibold block">
                    Button Phone IVR
                  </span>
                  <span className="text-[10px] text-slate-400">Hindi & English Access</span>
                </div>
              </div>
            </section>

            {/* ========================================================================= */}
            {/* HELPLINE OUTREACH BANNER (BUTTON PHONE SIMULATOR)                         */}
            {/* ========================================================================= */}
            <section id="helpline" className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6 hover-lift transition-all">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-xs">
                    <PhoneCall className="w-4 h-4 animate-bounce" />
                  </span>
                  <h3 className="text-base font-bold text-amber-950 font-heading">
                    Prahari Helpline (IVR) · No Smartphone Required
                  </h3>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Troopers at remote pickets and border outposts can call anytime from any simple button phone to request emergency callbacks or report fatigue in Hindi and English.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  onClick={() => setShowVani(true)}
                  className="px-5 py-2.5 bg-[#0c3866] hover:bg-[#072648] text-white text-xs font-bold rounded-md shadow-md flex items-center gap-2 hover-scale active-press hover-glow-navy"
                >
                  <PhoneCall className="w-4 h-4 text-[#ff9933] animate-pulse" />
                  <span>Launch Phone Simulator</span>
                </button>
              </div>
            </section>
          </div>
      {/* Global Interactive Phone Simulator */}
      {showVani && (
        <PrahariVaniSimulator isOpen={showVani} onClose={() => setShowVani(false)} />
      )}
    </div>
  );
}
