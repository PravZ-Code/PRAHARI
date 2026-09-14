"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  Radio,
  RotateCcw,
  X,
  ShieldCheck,
  Headphones,
  Signal,
  BatteryCharging
} from "lucide-react";

interface PrahariVaniSimulatorProps {
  isOpen?: boolean;
  onClose?: () => void;
  isEmbedded?: boolean;
}

// DTMF Frequencies (Hz)
const DTMF_FREQS: Record<string, [number, number]> = {
  "1": [697, 1209],
  "2": [697, 1336],
  "3": [697, 1477],
  "4": [770, 1209],
  "5": [770, 1336],
  "6": [770, 1477],
  "7": [852, 1209],
  "8": [852, 1336],
  "9": [852, 1477],
  "*": [941, 1209],
  "0": [941, 1336],
  "#": [941, 1477],
};

type CallState = "idle" | "calling" | "language_select" | "main_menu" | "callback_queued" | "leave_logged" | "buddy_logged";

export const PrahariVaniSimulator: React.FC<PrahariVaniSimulatorProps> = ({
  isOpen = true,
  onClose,
  isEmbedded = false,
}) => {
  const [callState, setCallState] = useState<CallState>("idle");
  const [language, setLanguage] = useState<"hi" | "en" | "ta">("hi");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastKeyPressed, setLastKeyPressed] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [transcript, setTranscript] = useState<string[]>([
    "[System Ready] PRAHARI Soldier Helpline (Button Phone Simulator).",
    "Click the green CALL button below to try the phone helpline.",
  ]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (callState !== "idle") {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Audio tone generation for DTMF
  const playDtmfTone = (key: string) => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const freqs = DTMF_FREQS[key];
      if (!freqs) return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.frequency.value = freqs[0];
      osc2.frequency.value = freqs[1];

      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.16);
      osc2.stop(ctx.currentTime + 0.16);
    } catch (e) {
      // Ignore audio context block
    }
  };

  const handleStartCall = () => {
    setCallState("calling");
    setTranscript((prev) => [
      ...prev,
      "--- CALL INITIATED: 1800-PRAHARI ---",
      "Connecting to Soldier Welfare Helpline...",
    ]);

    setTimeout(() => {
      setCallState("language_select");
      setTranscript((prev) => [
        ...prev,
        "IVR: 'प्रहरी वाणी में आपका स्वागत है। हिंदी के लिए 1 दबाएं। For English, Press 2. தமிழுக்கு 3-ஐ அழுத்தவும்.'",
      ]);
    }, 1200);
  };

  const handleEndCall = () => {
    setCallState("idle");
    setTranscript((prev) => [
      ...prev,
      `--- CALL TERMINATED (${callDuration}s) ---`,
      "Call logged securely in action history.",
    ]);
  };

  const handleKeyPress = (key: string) => {
    setLastKeyPressed(key);
    playDtmfTone(key);
    setTimeout(() => setLastKeyPressed(null), 250);

    if (callState === "idle") {
      if (key === "1") handleStartCall();
      return;
    }

    if (callState === "language_select") {
      if (key === "1") {
        setLanguage("hi");
        setCallState("main_menu");
        setTranscript((prev) => [
          ...prev,
          "Trooper: [Pressed 1 - Hindi]",
          "IVR: 'मुख्य मेनू: आपातकालीन वेलफेयर कॉलबैक के लिए 3 दबाएं। गोपनीय छुट्टी शिकायत के लिए 4 दबाएं। अनाम साथी सहायता के लिए 5 दबाएं।'",
        ]);
      } else if (key === "2") {
        setLanguage("en");
        setCallState("main_menu");
        setTranscript((prev) => [
          ...prev,
          "Trooper: [Pressed 2 - English]",
          "IVR: 'Main Menu: Press 3 for Emergency Welfare Callback. Press 4 for Confidential Leave Grievance. Press 5 for Anonymous Buddy Check.'",
        ]);
      } else if (key === "3") {
        setLanguage("ta");
        setCallState("main_menu");
        setTranscript((prev) => [
          ...prev,
          "Trooper: [Pressed 3 - Tamil]",
          "IVR: 'முதன்மை மெனு: அவசர நல அழைப்பிற்கு 3 அழுத்தவும். ரகசிய விடுப்பு புகார் அளிக்க 4 அழுத்தவும். சக வீரர் உதவிக்கு 5 அழுத்தவும்.'",
        ]);
      } else {
        setTranscript((prev) => [...prev, `IVR: 'Invalid selection ${key}. Please press 1, 2, or 3.'`]);
      }
      return;
    }

    if (callState === "main_menu") {
      if (key === "3") {
        setCallState("callback_queued");
        if (language === "hi") {
          setTranscript((prev) => [
            ...prev,
            "Soldier: [Pressed 3 - आपातकालीन कॉलबैक]",
            "IVR: 'आपकी आपातकालीन वेलफेयर कॉलबैक दर्ज कर ली गई है। बटालियन वेलफेयर ऑफिसर (BWO) को तुरंत अलर्ट भेज दिया गया है। 15 मिनट के अंदर कॉलबैक किया जाएगा। धन्यवाद।'",
          ]);
        } else if (language === "ta") {
          setTranscript((prev) => [
            ...prev,
            "Soldier: [Pressed 3 - அவசர நல அழைப்பு]",
            "IVR: 'உங்கள் அவசர நல அழைப்பு பதிவு செய்யப்பட்டது. பட்டாலியன் நல அதிகாரிக்கு உடனடி தகவல் அனுப்பப்பட்டது. 15 நிமிடங்களுக்குள் தொடர்பு கொள்ளப்படும். நன்றி.'",
          ]);
        } else {
          setTranscript((prev) => [
            ...prev,
            "Soldier: [Pressed 3 - Emergency Callback]",
            "IVR: 'Emergency Welfare Callback registered. Welfare Officer alerted. You will receive a callback within 15 minutes. Jai Hind.'",
          ]);
        }
      } else if (key === "4") {
        setCallState("leave_logged");
        if (language === "hi") {
          setTranscript((prev) => [
            ...prev,
            "Soldier: [Pressed 4 - गोपनीय छुट्टी शिकायत]",
            "IVR: 'लगातार छुट्टी अस्वीकृति की शिकायत दर्ज की गई (केस संदर्भ #PV-9281)। धारा 65B ऑडिट लेजर में सुरक्षित। कंपनी कमांडर को गोपनीय सिफारिश भेजी जाएगी।'",
          ]);
        } else if (language === "ta") {
          setTranscript((prev) => [
            ...prev,
            "Soldier: [Pressed 4 - ரகசிய விடுப்பு புகார்]",
            "IVR: 'தொடர் விடுப்பு மறுப்பு புகார் பதிவு செய்யப்பட்டது (#PV-9281). தணிக்கைப் பதிவேட்டில் பாதுகாக்கப்பட்டது. கம்பெனி கமாண்டருக்கு ரகசிய பரிந்துரை அனுப்பப்படும்.'",
          ]);
        } else {
          setTranscript((prev) => [
            ...prev,
            "Soldier: [Pressed 4 - Report Leave Issue]",
            "IVR: 'Confidential leave complaint recorded (Case Ref #PV-9281) in secure system logs. Alert sent to Welfare Officer.'",
          ]);
        }
      } else if (key === "5") {
        setCallState("buddy_logged");
        if (language === "hi") {
          setTranscript((prev) => [
            ...prev,
            "Soldier: [Pressed 5 - साथी सहायता]",
            "IVR: 'अनाम साथी सिग्नल रिकॉर्ड किया गया। आपकी पहचान सुरक्षित रखते हुए यूनिट पीयर सपोर्ट मॉनिटरिंग सक्रिय कर दी गई है।'",
          ]);
        } else if (language === "ta") {
          setTranscript((prev) => [
            ...prev,
            "Soldier: [Pressed 5 - சக வீரர் உதவி]",
            "IVR: 'அநாமதேய சக வீரர் சிக்னல் பதிவு செய்யப்பட்டது. உங்கள் அடையாளம் பாதுகாக்கப்பட்டு படைப்பிரிவு உதவி கண்காணிப்பு தொடங்கப்பட்டுள்ளது.'",
          ]);
        } else {
          setTranscript((prev) => [
            ...prev,
            "Soldier: [Pressed 5 - Help a Buddy]",
            "IVR: 'Confidential buddy alert recorded. Unit support team alerted without revealing your identity.'",
          ]);
        }
      } else if (key === "0") {
        setCallState("main_menu");
        setTranscript((prev) => [...prev, "IVR: 'Returning to Main Menu.'"]);
      } else {
        setTranscript((prev) => [...prev, `IVR: 'Invalid input ${key}. Press 3, 4, or 5.'`]);
      }
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen && !isEmbedded) return null;

  const content = (
    <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-slate-100 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* LEFT: Nokia / Rugged Tactical Phone Shell (5 cols) */}
      <div className="md:col-span-5 flex flex-col items-center">
        {/* Tactical Phone Casing */}
        <div className="w-[280px] bg-slate-950 border-4 border-slate-800 rounded-[40px] p-4 shadow-2xl flex flex-col items-center relative ring-1 ring-emerald-500/30">
          {/* Earpiece Speaker Grille */}
          <div className="w-16 h-1.5 bg-slate-800 rounded-full mb-3 shadow-inner" />

          {/* LCD Screen Display (Retro Green / Monochromatic Backlit) */}
          <div className="w-full h-40 bg-[#1a2f23] border-2 border-[#2b4c39] rounded-xl p-2.5 flex flex-col justify-between text-[#85e3a8] font-mono shadow-inner select-none relative overflow-hidden">
            {/* Screen Header Bar */}
            <div className="flex items-center justify-between text-[10px] border-b border-[#2b4c39]/60 pb-1">
              <div className="flex items-center gap-1">
                <Signal className="w-3 h-3 text-[#85e3a8]" />
                <span className="font-bold">ARMY-NET</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{callDuration > 0 ? formatSeconds(callDuration) : "STANDBY"}</span>
                <BatteryCharging className="w-3 h-3 text-[#85e3a8]" />
              </div>
            </div>

            {/* Screen Body State */}
            <div className="flex-1 py-1.5 text-center flex flex-col items-center justify-center space-y-1">
              {callState === "idle" && (
                <>
                  <div className="text-[11px] font-bold tracking-wider uppercase text-[#a9f5c4]">
                    PRAHARI VANI
                  </div>
                  <div className="text-[9px] text-[#85e3a8]/80">IVR GATEWAY (PSTN)</div>
                  <div className="text-[11px] font-bold text-white bg-[#264433] px-2 py-0.5 rounded mt-1">
                    DIAL: 1800-772-4274
                  </div>
                </>
              )}

              {callState === "calling" && (
                <div className="animate-pulse space-y-1">
                  <div className="text-xs font-bold text-white">CONNECTING...</div>
                  <div className="text-[9px]">TRUNK LINE SECURE</div>
                </div>
              )}

              {callState === "language_select" && (
                <div className="space-y-0.5 text-left text-[9px] leading-tight">
                  <div className="text-[#a9f5c4] font-bold">1. HINDI</div>
                  <div className="text-[#a9f5c4] font-bold">2. ENGLISH</div>
                  <div className="text-[#a9f5c4] font-bold">3. TAMIL</div>
                  <div className="text-[8px] text-[#85e3a8]/70 pt-1">PRESS 1, 2, OR 3</div>
                </div>
              )}

              {callState === "main_menu" && (
                <div className="space-y-0.5 text-left text-[9px] leading-tight">
                  <div>3. EMERGENCY CALLBACK</div>
                  <div>4. REPORT LEAVE ISSUE</div>
                  <div>5. HELP A BUDDY</div>
                  <div className="text-[8px] text-[#85e3a8]/70 pt-1">PRESS 3, 4, OR 5</div>
                </div>
              )}

              {callState === "callback_queued" && (
                <div className="space-y-1 text-center">
                  <div className="text-[10px] font-bold text-white">CALLBACK QUEUED</div>
                  <div className="text-[9px] text-emerald-300">OFFICER NOTIFIED</div>
                  <div className="text-[8px]">CALL IN &lt;15 MIN</div>
                </div>
              )}

              {callState === "leave_logged" && (
                <div className="space-y-1 text-center">
                  <div className="text-[10px] font-bold text-white">COMPLAINT FILED</div>
                  <div className="text-[9px]">REF: #PV-9281</div>
                  <div className="text-[8px]">RECORD SAVED</div>
                </div>
              )}

              {callState === "buddy_logged" && (
                <div className="space-y-1 text-center">
                  <div className="text-[10px] font-bold text-white">BUDDY ALERT SENT</div>
                  <div className="text-[9px]">NAME PROTECTED</div>
                  <div className="text-[8px]">SUPPORT ALERTED</div>
                </div>
              )}
            </div>

            {/* Screen Footer */}
            <div className="flex items-center justify-between text-[9px] border-t border-[#2b4c39]/60 pt-1 text-[#85e3a8]/80">
              <span>{language === "hi" ? "भाषा: हिंदी" : language === "ta" ? "மொழி: தமிழ்" : "Lang: EN"}</span>
              <span className="font-bold text-white">
                {lastKeyPressed ? `KEY: [${lastKeyPressed}]` : "PHONE HELPLINE"}
              </span>
            </div>
          </div>

          {/* Call & End Buttons */}
          <div className="w-full grid grid-cols-2 gap-3 my-3">
            <button
              onClick={handleStartCall}
              disabled={callState !== "idle"}
              className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold shadow disabled:opacity-40 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>CALL</span>
            </button>
            <button
              onClick={handleEndCall}
              disabled={callState === "idle"}
              className="bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold shadow disabled:opacity-40 transition-colors"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>END</span>
            </button>
          </div>

          {/* 3x4 Number Keypad Grid */}
          <div className="grid grid-cols-3 gap-2 w-full">
            {[
              { key: "1", sub: "" },
              { key: "2", sub: "ABC" },
              { key: "3", sub: "DEF" },
              { key: "4", sub: "GHI" },
              { key: "5", sub: "JKL" },
              { key: "6", sub: "MNO" },
              { key: "7", sub: "PQRS" },
              { key: "8", sub: "TUV" },
              { key: "9", sub: "WXYZ" },
              { key: "*", sub: "" },
              { key: "0", sub: "+" },
              { key: "#", sub: "" },
            ].map(({ key, sub }) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className={`h-11 rounded-xl font-bold flex flex-col items-center justify-center transition-all active:scale-95 border ${
                  lastKeyPressed === key
                    ? "bg-emerald-500 text-black border-emerald-300 shadow-lg scale-95"
                    : "bg-slate-900 hover:bg-slate-850 text-slate-100 border-slate-800 shadow"
                }`}
              >
                <span className="text-sm leading-none font-black">{key}</span>
                {sub && <span className="text-[7px] text-slate-400 font-mono tracking-wider">{sub}</span>}
              </button>
            ))}
          </div>

          {/* Sound Toggle */}
          <div className="w-full flex items-center justify-between pt-3 text-[10px] text-slate-400">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>DTMF Audio {soundEnabled ? "ON" : "OFF"}</span>
            </button>
            <span className="font-mono text-[9px] text-slate-500">NOKIA 105 MIL-STD</span>
          </div>
        </div>
      </div>

      {/* RIGHT: Live Audio Transcript & System Pipeline Details (7 cols) */}
      <div className="md:col-span-7 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  PRAHARI Soldier Helpline
                </h4>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Phone Helpline for Remote Soldiers (Works on Basic Button Phones without Internet)
              </p>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                aria-label="Close simulator"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Key Value Proposition Callout */}
          <div className="mt-3.5 bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Toll-Free Helpline for Soldiers at Border Outposts
            </span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Soldiers in remote border areas without smartphones or internet can dial the toll-free helpline from any basic button phone to request emergency callbacks, report leave issues, or request buddy support.
            </p>
          </div>

          {/* Live IVR Transcript Box */}
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <Headphones className="w-3.5 h-3.5 text-sky-400" />
                Live Call Transcript
              </span>
              <button
                onClick={() => setTranscript(["Session reset."])}
                className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Clear
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 h-48 overflow-y-auto space-y-1.5 text-xs font-mono">
              {transcript.map((line, idx) => (
                <div
                  key={idx}
                  className={`leading-relaxed ${
                    line.startsWith("IVR:")
                      ? "text-emerald-300"
                      : line.startsWith("Trooper:")
                      ? "text-sky-300 font-bold"
                      : line.startsWith("---")
                      ? "text-amber-400 font-bold"
                      : "text-slate-400"
                  }`}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action instruction guide */}
        <div className="bg-slate-850/80 border border-slate-700/60 rounded-xl p-3 text-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="font-bold text-white block">Try the Interactive Keypad:</span>
            <p className="text-[11px] text-slate-400">
              1. Click <strong>CALL</strong> • 2. Press <strong>1</strong> (Hindi) or <strong>2</strong> (English) • 3. Press <strong>3</strong> for Welfare Callback
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold rounded-lg uppercase tracking-wider">
              HELPLINE READY
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl">{content}</div>
    </div>
  );
};
