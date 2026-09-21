"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "hi" | "ta";

export interface I18nContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: typeof translations.en;
}

export const translations = {
  en: {
    langCode: "en",
    langName: "English",
    header: {
      topGovt: "Government of India",
      topMha: "Ministry of Home Affairs · CRPF",
      title: "PRAHARI",
      subtitle: "Personnel Welfare & Grievance Resolution Portal",
      motto: "Secure Force · Resilient Family · Empowered Nation",
      ministryTitle: "Ministry of Home Affairs · Central Reserve Police Force",
      skipLink: "Skip to main content",
      searchPlaceholder: "Search welfare services or enter PRH reference...",
      searchBtn: "Search",
      ssoLogin: "CRPF Portal Login",
      helpline: "Prahari Helpline",
      ivrSubtitle: "Button Phone IVR",
      screenReader: "Screen Reader Access",
      highContrast: "High Contrast",
      fontSizeAria: "Adjust font size",
      resetAll: "Reset All",
      invertColors: "Invert Colors",
      grayscale: "Grayscale",
      textSpacing: "Text Spacing",
      lineHeight: "Line Height",
      hideImages: "Hide Images",
      largeCursor: "Large Cursor",
      accessTools: "Accessibility Tools",
    },
    nav: {
      home: "Home",
      requestLeave: "Request Leave",
      track: "Track Request",
      welfare: "Welfare Support",
      emergency: "Family Emergency (12h SOS)",
      restCompliance: "Rest Compliance",
      safetyNet: "AI Safety Net",
      privacy: "Confidentiality Charter",
      commandOverview: "Command Overview",
      pendingApprovals: "Pending Approvals",
      unitReadiness: "Unit Readiness",
      tryPlan: "Try Another Plan",
      welfareDashboard: "Welfare Dashboard",
      activeCasework: "Active Casework",
      recoveryTracking: "Recovery Tracking",
      commandApprovals: "Command Approvals",
      governance: "Governance Dashboard",
      auditLedger: "Audit Ledger (SHA-256)",
      airGapSync: "Air-Gap Data Sync",
      accessRoles: "Access & Roles",
    },
    session: {
      activeSession: "Active Operational Session",
      signedInAs: "Signed in as",
      open: "Open",
      signOut: "Sign Out",
      authenticatedOfficer: "Authenticated Officer",
    },
    hero: {
      slides: [
        {
          badge: "MHA / CRPF Flagship Welfare Initiative",
          title: "Help First. Predict Second.",
          subtitle: "Personnel Welfare & Grievance Resolution Platform",
          description:
            "PRAHARI provides a transparent, confidential mechanism for frontline troopers to request leave, report acute fatigue, and access welfare support. Every decision requires mandatory human review by commanding officers.",
          primaryAction: "Request Leave or Welfare",
          secondaryAction: "Family Emergency (12h Fast-Lane)",
        },
        {
          badge: "Statutory Section 21 Privacy Protection",
          title: "Confidential Welfare & Guidance",
          subtitle: "Battalion Welfare Officer Direct Assistance",
          description:
            "Speak privately with your Battalion Welfare Officer regarding family healthcare, allowances, or rest duty adjustments. Protected by Section 21 of the Mental Healthcare Act 2017 with zero operational penalty.",
          primaryAction: "Request Welfare Support",
          secondaryAction: "View Confidentiality Charter",
        },
        {
          badge: "Accessible via Any Feature Phone (IVR)",
          title: "Universal Access — No Smartphone Needed",
          subtitle: "Prahari Vani Multilingual Telephone Helpline",
          description:
            "Troopers deployed at forward pickets and extreme-terrain outposts can dial our 24x7 voice helpline from any basic button phone to request emergency callbacks or report fatigue in English, Hindi, and Tamil.",
          primaryAction: "Try Phone Simulator",
          secondaryAction: "Track Request Status",
        },
      ],
      quickCheck: {
        title: "Fast-Track Grievance Status",
        desc: "Enter your official PRH reference number to track resolution SLA.",
        placeholder: "e.g. PRH-2026-000184",
        btn: "Check Status",
        sampleLabel: "Sample Active Grievance",
      },
    },
    mandate: {
      badge: "Official Mandate",
      title: "Central Reserve Police Force Welfare Mandate",
      subtitle: "Human-in-the-Loop Welfare Governance · Directorate General, CRPF",
      desc: "PRAHARI operates as an institutional welfare bridge between frontline personnel and battalion leadership. Designed under Ministry of Home Affairs oversight, every leave grievance and shift adjustment undergoes mandatory commanding officer sign-off with Section 21 non-punitive legal guarantees.",
      amitShahName: "Shri Amit Shah",
      amitShahRole: "Hon'ble Union Minister for Home Affairs and Cooperation",
      amitShahQuote:
        "“Our CAPF jawans stand as an impenetrable shield for India. The welfare of our brave personnel and their families is the paramount duty of the Government of India.”",
      dgName: "Director General, CRPF",
      dgRole: "Directorate General · Central Reserve Police Force",
      dgQuote:
        "“PRAHARI bridges the operational frontier and personal family security, ensuring every trooper is heard without delay.”",
    },
    whatsNew: {
      tag: "OFFICIAL PIB & MHA BULLETINS",
      title: "What's New: Official Government & Force Releases",
      viewAll: "View All PIB Releases",
      items: [
        {
          date: "29 December 2022",
          title: "PIB Release ID 1887346: Union Home and Cooperation Minister Shri Amit Shah launches Mobile App 'Prahari' and Manual of Border Security Force (BSF) in New Delhi — empowering jawans with direct mobile access to leave, Ayushman-CAPF, accommodation, GPF, and CPGRAMS grievance redressal.",
          tag: "PIB DELPHI · MHA",
          isNew: true,
          href: "https://pib.gov.in/PressReleasePage.aspx?PRID=1887346",
        },
        {
          date: "01 September 2022",
          title: "PIB Release ID 1856119: Union Home & Cooperation Minister Shri Amit Shah launched the 'CAPF eAWAS' web portal in New Delhi to increase residential quarters satisfaction and inter-force quota transparency across Central Armed Police Forces.",
          tag: "CAPF e-AWAS · MHA",
          isNew: true,
          href: "https://pib.gov.in/PressReleasePage.aspx?PRID=1856119",
        },
        {
          date: "02 November 2021",
          title: "PIB Release ID 1768852: Pan-India Expansion of 'Ayushman CAPF' Healthcare Scheme — Union Home Minister distributes cashless health cards providing 100% cashless healthcare for 35 lakh CAPF personnel and family members across 24,000+ empanelled hospitals.",
          tag: "AYUSHMAN CAPF · GOI",
          isNew: false,
          href: "https://pib.gov.in/PressReleasePage.aspx?PRID=1768852",
        },
        {
          date: "Official Service",
          title: "CPGRAMS 'Vimuksh' National Grievance Portal: Integrated with Prahari App for direct, confidential administrative grievance redressal, GPF tracking, and welfare scheme monitoring under Ministry of Personnel and MHA oversight.",
          tag: "CPGRAMS · GOI",
          isNew: false,
          href: "https://pgportal.gov.in",
        },
        {
          date: "MHA Directive",
          title: "Ministry of Home Affairs (Police-II Division): Comprehensive Welfare Directives, Risk & Hardship Allowance guidelines, and Section 21 Mental Healthcare Act 2017 non-stigmatization statutory charter for Central Armed Police Forces.",
          tag: "MHA DIRECTIVE",
          isNew: false,
          href: "https://www.mha.gov.in",
        },
      ],
    },
    calendar: {
      title: "Welfare & Rest Calendar",
      monthYear: "September 2026",
      restGuaranteeText: "Mandatory Rest Barrier tracking: Every soldier has a statutory 8-hour rolling rest guarantee between high-burden shifts.",
      days: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
      legendToday: "Today",
      legendHoliday: "Holiday",
      legendRest: "Rest Barrier",
      legendReview: "Sammelan/Review",
      authorityLabel: "Authority",
      liveDateLabel: "Live Date",
      standardShift: "Standard Duty Shift",
      standardTitle: "Standard Operational Roster · 8h Rest Barrier Active",
      standardDesc: "Routine sentry and administrative deployment. Automated fatigue monitoring active; mandatory uninterrupted 8-hour sleep/rest window guaranteed.",
      checkComplianceBtn: "Check Roster Rest Compliance",
      events: {
        4: {
          title: "Janmashtami (GoI Gazetted Holiday)",
          type: "Gazetted Holiday",
          desc: "Mandatory gazetted holiday observance across all CAPF establishments. Rotational sentry duties operated with festive mess meal sanction.",
          authority: "DOPT / MHA Annual Holiday Schedule",
        },
        5: {
          title: "Saturday Tactical Stand-Down",
          type: "Rest Barrier",
          desc: "Weekly administrative recovery period. Verification of zero uncompensated night duty hours across companies.",
          authority: "CRPF SO 04/2020",
        },
        6: {
          title: "Sunday Unit Welfare Stand-Down",
          type: "Rest Barrier",
          desc: "Troop rest cycle and barracks welfare inspection by company duty officer.",
          authority: "CRPF SO 04/2020",
        },
        10: {
          title: "Quarterly Leave Sanction Docket Review",
          type: "Welfare Redressal",
          desc: "Company Commanders and Battalion Welfare Officers review accumulated leave requests for upcoming festival rotations.",
          authority: "MHA Leave Rules 1972",
        },
        12: {
          title: "Weekly Outpost Rest & Reconditioning",
          type: "Rest Barrier",
          desc: "Reconditioning period and priority telephonic link window for troopers with families in rural areas.",
          authority: "CRPF Welfare Directorate",
        },
        13: {
          title: "Active Operational Shift (Current Date)",
          type: "Today's Status",
          desc: "100% compliance with statutory 8-hour uninterrupted rest barriers between consecutive night guard shifts verified.",
          authority: "PRAHARI Roster Verification",
        },
        16: {
          title: "Milad-un-Nabi / Id-e-Milad (Gazetted Holiday)",
          type: "Gazetted Holiday",
          desc: "Official Government of India Gazetted Holiday. Stand-down protocol for administrative offices and routine parades.",
          authority: "Ministry of Personnel / MHA",
        },
        19: {
          title: "Saturday Equipment & Radio Maintenance Stand-Down",
          type: "Rest Barrier",
          desc: "Scheduled maintenance and rest barrier verification across all tactical communication detachments.",
          authority: "CRPF SO 04/2020",
        },
        20: {
          title: "Ayushman CAPF Medical Claims Camp",
          type: "Healthcare Welfare",
          desc: "Medical officers on-site to assist troopers with 100% cashless hospital admissions and family dependent health cards.",
          authority: "National Health Authority / MHA",
        },
        25: {
          title: "Battalion Sainik Sammelan & Welfare Darbar",
          type: "Command Redressal",
          desc: "Direct, open forum presided over by Commandant for confidential resolution of personnel welfare issues and family allowances.",
          authority: "CRPF Act 1949 Section 8",
        },
        26: {
          title: "Weekly Force Rest & Recovery",
          type: "Rest Barrier",
          desc: "Restorative rest cycle and fatigue relief monitoring across active patrols.",
          authority: "CRPF SO 04/2020",
        },
        27: {
          title: "Anant Chaturdashi (Restricted Holiday)",
          type: "Restricted Holiday",
          desc: "Optional festival holiday leave facility for observing personnel as per Government of India calendar.",
          authority: "MHA Holiday Schedule",
        },
      } as Record<number, { title: string; type: string; desc: string; authority: string }>,
    },
    services: {
      tag: "Technical Service Offerings",
      title: "Core Welfare & Redressal Services",
      desc: "Select a government service below to initiate a formal welfare workflow with real-time digital tracking.",
      leave: {
        title: "Request Leave",
        desc: "Apply for earned, casual, or duty-rest leave. System automatically checks coverage and rest barriers for rapid commanding officer sign-off.",
        action: "Apply for Leave",
      },
      emergency: {
        title: "Family Emergency",
        desc: "Direct 12-hour statutory resolution lane for hospitalizations, family crises, or urgent domestic exigencies requiring immediate relief.",
        action: "File Emergency SOS",
      },
      welfare: {
        title: "Confidential Welfare Support",
        desc: "Request a private consultation with your Battalion Welfare Officer regarding administrative grievances or dependent medical allowances.",
        action: "Request Support",
      },
      grievance: {
        title: "Grievance Redressal Desk",
        desc: "Track an existing petition with your PRH tracking code, review SLA escalation stages, and download digitally signed receipts.",
        action: "Track Status",
      },
    },
    innovations: {
      tag: "INNOVATIVE PUBLIC SERVICE CAPABILITIES",
      title: "Next-Generation Welfare Architecture",
      desc: "PRAHARI integrates clinical lexicon protections, operational duty balancing, and statutory record integrity.",
      guardrails: {
        title: "AI Clinical Lexicon Guardrails",
        desc: "Converts clinical terms to operational stress language, preventing career stigmatization under Section 21 of the Mental Healthcare Act 2017.",
      },
      uro: {
        title: "Operational Duty Balance (Shift Swapper)",
        desc: "Fair, trade-matched shift swapping capability with rest preservation and balanced shift distribution.",
      },
      ledger: {
        title: "Cryptographic SHA-256 Audit Ledger",
        desc: "Every leave decision, approval, and override is permanently recorded in a tamper-evident cryptographic blockchain ledger under Section 63 BSA 2023.",
      },
    },
    metrics: {
      jawans: "3,25,000+",
      jawansLabel: "Jawans Covered across 246 Battalions",
      sla: "99.4%",
      slaLabel: "Statutory SLA Compliance Rate",
      denials: "0",
      denialsLabel: "Automated Denials (Human Review Mandatory)",
      ivr: "24x7",
      ivrLabel: "Button Phone Helpline (Hindi, English, Tamil)",
    },
    footer: {
      aboutTitle: "About PRAHARI",
      aboutDesc: "PRAHARI is the official personnel welfare and grievance redressal digital gateway of the Central Reserve Police Force, Ministry of Home Affairs, Government of India. Designed under strict Guidelines for Indian Government Websites (GIGW 3.0).",
      portalsTitle: "Government Portals",
      statutoryTitle: "Statutory Governance",
      helplinesTitle: "24x7 Emergency Helplines",
      madadgaar: "CRPF Madadgaar (Toll-Free): 14411",
      telemanas: "Tele-MANAS National Support: 14416",
      copyright: "© 2026 Directorate General, Central Reserve Police Force (CRPF), Ministry of Home Affairs, Government of India. All Rights Reserved.",
      lastUpdated: "Last Updated: 13 September 2026 | Portal Version: 4.6 (Production Gateway)",
      shaStatus: "Cryptographic SHA-256 Ledger: Active & Verified",
    },
  },

  hi: {
    langCode: "hi",
    langName: "हिन्दी",
    header: {
      topGovt: "भारत सरकार",
      topMha: "गृह मंत्रालय · केंद्रीय रिजर्व पुलिस बल",
      title: "प्रहरी",
      subtitle: "कार्मिक कल्याण एवं शिकायत निवारण पोर्टल",
      motto: "सुरक्षित बल · समर्थ परिवार · सशक्त राष्ट्र",
      ministryTitle: "गृह मंत्रालय · केंद्रीय रिजर्व पुलिस बल",
      skipLink: "मुख्य विषयवस्तु पर जाएं",
      searchPlaceholder: "कल्याणकारी सेवाएं खोजें या पीआरएच संदर्भ संख्या दर्ज करें...",
      searchBtn: "खोजें",
      ssoLogin: "सीआरपीएफ पोर्टल लॉगिन",
      helpline: "प्रहरी हेल्पलाइन",
      ivrSubtitle: "कीपैड फोन आईवीआर",
      screenReader: "स्क्रीन रीडर एक्सेस",
      highContrast: "उच्च कंट्रास्ट",
      fontSizeAria: "फ़ॉन्ट का आकार समायोजित करें",
      resetAll: "रीसेट करें",
      invertColors: "रंग उलटें",
      grayscale: "ग्रेस्केल",
      textSpacing: "टेक्स्ट स्पेसिंग",
      lineHeight: "पंक्ति की ऊंचाई",
      hideImages: "चित्र छुपाएं",
      largeCursor: "बड़ा कर्सर",
      accessTools: "अभिगम्यता उपकरण",
    },
    nav: {
      home: "मुख्य पृष्ठ",
      requestLeave: "छुट्टी आवेदन",
      track: "स्थिति जांच",
      welfare: "कल्याण सहायता",
      emergency: "पारिवारिक आपातकाल (12 घंटे)",
      restCompliance: "विश्राम अनुपालन",
      safetyNet: "एआई सुरक्षा तंत्र",
      privacy: "गोपनीयता चार्टर",
      commandOverview: "कमान अवलोकन",
      pendingApprovals: "लंबित स्वीकृतियां",
      unitReadiness: "इकाई तत्परता",
      tryPlan: "वैकल्पिक योजना",
      welfareDashboard: "कल्याण डैशबोर्ड",
      activeCasework: "सक्रिय मामले",
      recoveryTracking: "पुनर्प्राप्ति ट्रैकिंग",
      commandApprovals: "कमान स्वीकृतियां",
      governance: "शासन डैशबोर्ड",
      auditLedger: "ऑडिट लेजर (एसएचए-256)",
      airGapSync: "एयर-गैप डेटा सिंक",
      accessRoles: "पहुंच एवं भूमिकाएं",
    },
    session: {
      activeSession: "सक्रिय परिचालन सत्र",
      signedInAs: "के रूप में लॉगिन",
      open: "खोलें",
      signOut: "लॉग आउट",
      authenticatedOfficer: "प्रमाणित अधिकारी",
    },
    hero: {
      slides: [
        {
          badge: "गृह मंत्रालय / सीआरपीएफ प्रमुख कल्याणकारी पहल",
          title: "सहायता पहले। पूर्वानुमान बाद में।",
          subtitle: "कार्मिक कल्याण एवं शिकायत निवारण प्रणाली",
          description:
            "प्रहरी अग्रिम मोर्चे के जवानों को छुट्टी का अनुरोध करने, अत्यधिक थकान की रिपोर्ट करने और कल्याणकारी सहायता प्राप्त करने के लिए एक पारदर्शी, गोपनीय तंत्र प्रदान करता है। हर निर्णय के लिए कमान अधिकारी द्वारा अनिवार्य मानवीय समीक्षा आवश्यक है।",
          primaryAction: "छुट्टी या कल्याण सहायता आवेदन",
          secondaryAction: "पारिवारिक आपातकाल (12 घंटे)",
        },
        {
          badge: "धारा 21 वैधानिक गोपनीयता संरक्षण",
          title: "गोपनीय कल्याण एवं परामर्श",
          subtitle: "बटालियन कल्याण अधिकारी प्रत्यक्ष सहायता",
          description:
            "पारिवारिक स्वास्थ्य, भत्तों या विश्राम ड्यूटी समायोजन के संबंध में अपने बटालियन कल्याण अधिकारी से निजी तौर पर बात करें। मानसिक स्वास्थ्य देखभाल अधिनियम 2017 की धारा 21 द्वारा शून्य प्रशासनिक दंड के साथ संरक्षित।",
          primaryAction: "कल्याण सहायता का अनुरोध करें",
          secondaryAction: "गोपनीयता चार्टर देखें",
        },
        {
          badge: "साधारण फोन (आईवीआर) पर भी उपलब्ध",
          title: "सार्वभौमिक पहुंच — स्मार्टफोन की आवश्यकता नहीं",
          subtitle: "प्रहरी वाणी बहुभाषी टेलीफोन हेल्पलाइन",
          description:
            "अग्रिम चौकियों और दुर्गम क्षेत्रों में तैनात जवान किसी भी बुनियादी बटन वाले फोन से आपातकालीन कॉलबैक या थकान की रिपोर्ट करने के लिए हिंदी, अंग्रेजी और तमिल में 24x7 हेल्पलाइन डायल कर सकते हैं।",
          primaryAction: "फोन सिम्युलेटर चलाएं",
          secondaryAction: "आवेदन की स्थिति जांचें",
        },
      ],
      quickCheck: {
        title: "त्वरित शिकायत स्थिति जांच",
        desc: "निस्तारण समयसीमा जांचने के लिए अपना पीआरएच संदर्भ नंबर दर्ज करें।",
        placeholder: "उदा. PRH-2026-000184",
        btn: "स्थिति जांचें",
        sampleLabel: "सक्रिय शिकायत का उदाहरण",
      },
    },
    mandate: {
      badge: "आधिकारिक अधिदेश",
      title: "केंद्रीय रिजर्व पुलिस बल कल्याण अधिदेश",
      subtitle: "मानव-सत्यापित कल्याण प्रशासन · महानिदेशालय, सीआरपीएफ",
      desc: "प्रहरी अग्रिम पंक्ति के कार्मिकों और बटालियन नेतृत्व के बीच एक संस्थागत कल्याणकारी सेतु के रूप में कार्य करता है। गृह मंत्रालय की देखरेख में डिज़ाइन किया गया, प्रत्येक छुट्टी की शिकायत और ड्यूटी समायोजन धारा 21 के कानूनी संरक्षण के साथ अनिवार्य कमांडिंग ऑफिसर हस्ताक्षर के अधीन है।",
      amitShahName: "श्री अमित शाह",
      amitShahRole: "माननीय केंद्रीय गृह एवं सहकारिता मंत्री",
      amitShahQuote:
        "“हमारे सीएपीएफ के जवान भारत के लिए एक अभेद्य ढाल बनकर खड़े हैं। हमारे वीर जवानों और उनके परिवारों का कल्याण भारत सरकार का सर्वोपरि कर्तव्य है।”",
      dgName: "महानिदेशक, सीआरपीएफ",
      dgRole: "महानिदेशालय · केंद्रीय रिजर्व पुलिस बल",
      dgQuote:
        "“प्रहरी परिचालन सीमा और व्यक्तिगत पारिवारिक सुरक्षा को जोड़ता है, यह सुनिश्चित करता है कि प्रत्येक जवान की बात बिना किसी देरी के सुनी जाए।”",
    },
    whatsNew: {
      tag: "आधिकारिक पीआईबी एवं गृह मंत्रालय बुलेटिन",
      title: "नवीनतम आधिकारिक समाचार एवं प्रेस विज्ञप्तियां",
      viewAll: "सभी पीआईबी विज्ञप्तियां देखें",
      items: [
        {
          date: "29 दिसंबर 2022",
          title: "पीआईबी विज्ञप्ति आईडी 1887316: केन्द्रीय गृह एवं सहकारिता मंत्री श्री अमित शाह ने नई दिल्ली में सीमा सुरक्षा बल (BSF) के 'प्रहरी' मोबाइल ऐप और 13 मैनुअल के संशोधित संस्करण का लोकार्पण किया — आवास, आयुष्मान-सीएपीएफ, अवकाश एवं सीपीग्राम्स शिकायत निवारण की सीधी मोबाइल सुविधा।",
          tag: "पीआईबी दिल्ली · गृह मंत्रालय",
          isNew: true,
          href: "https://pib.gov.in/PressReleasePage.aspx?PRID=1887316",
        },
        {
          date: "01 सितंबर 2022",
          title: "पीआईबी विज्ञप्ति आईडी 1856098: केन्द्रीय गृह एवं सहकारिता मंत्री श्री अमित शाह ने नई दिल्ली में सीएपीएफ कार्मिकों के आवासीय संतुष्टि अनुपात में वृद्धि एवं पारदर्शी आवंटन हेतु 'CAPF eAwas' वेब पोर्टल का शुभारंभ किया।",
          tag: "सीएपीएफ ई-आवास · गृह मंत्रालय",
          isNew: true,
          href: "https://pib.gov.in/PressReleasePage.aspx?PRID=1856098",
        },
        {
          date: "02 नवंबर 2021",
          title: "पीआईबी विज्ञप्ति आईडी 1768852: आयुष्मान सीएपीएफ स्वास्थ्य योजना का राष्ट्रव्यापी विस्तार — 35 लाख सीएपीएफ जवानों और परिजनों के लिए 24,000+ सूचीबद्ध अस्पतालों में 100% कैशलेस स्वास्थ्य कार्ड वितरण का शुभारंभ।",
          tag: "आयुष्मान सीएपीएफ · भारत सरकार",
          isNew: false,
          href: "https://pib.gov.in/PressReleasePage.aspx?PRID=1768852",
        },
        {
          date: "आधिकारिक सेवा",
          title: "सीपीग्राम्स 'विमुक्ष' राष्ट्रीय शिकायत निवारण पोर्टल: प्रहरी ऐप के साथ एकीकृत — सीएपीएफ जवानों के लिए मोबाइल पर प्रत्यक्ष शिकायत पंजीकरण, जीपीएफ ट्रैकिंग एवं सांविधिक 30-दिवसीय समाधान निगरानी।",
          tag: "सीपीग्राम्स · भारत सरकार",
          isNew: false,
          href: "https://pgportal.gov.in",
        },
        {
          date: "गृह मंत्रालय निर्देश",
          title: "गृह मंत्रालय (पुलिस-II प्रभाग): केंद्रीय सशस्त्र पुलिस बल कल्याण निर्देश, जोखिम एवं कठिनाई भत्ता दिशानिर्देश तथा मानसिक स्वास्थ्य देखभाल अधिनियम 2017 की धारा 21 का कानूनी संरक्षण।",
          tag: "गृह मंत्रालय निर्देश",
          isNew: false,
          href: "https://www.mha.gov.in",
        },
      ],
    },
    calendar: {
      title: "कल्याण एवं विश्राम कैलेंडर",
      monthYear: "सितंबर 2026",
      restGuaranteeText: "अनिवार्य विश्राम नियम: प्रत्येक जवान को उच्च-भार वाली ड्यूटी के बीच वैधानिक 8 घंटे का निरंतर विश्राम सुनिश्चित किया जाता है।",
      days: ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
      legendToday: "आज",
      legendHoliday: "अवकाश",
      legendRest: "विश्राम नियम",
      legendReview: "सम्मेलन/समीक्षा",
      authorityLabel: "प्राधिकरण",
      liveDateLabel: "वर्तमान तिथि",
      standardShift: "मानक ड्यूटी शिफ्ट",
      standardTitle: "मानक परिचालन रोस्टर · 8 घंटे का विश्राम सक्रिय",
      standardDesc: "नियमित संतरी और प्रशासनिक तैनाती। स्वचालित थकान निगरानी सक्रिय; अनिवार्य निर्बाध 8 घंटे की नींद/विश्राम अवधि की गारंटी।",
      checkComplianceBtn: "रोस्टर विश्राम अनुपालन जांचें",
      events: {
        4: {
          title: "जन्माष्टमी (भारत सरकार राजपत्रित अवकाश)",
          type: "राजपत्रित अवकाश",
          desc: "सभी सीएपीएफ प्रतिष्ठानों में अनिवार्य राजपत्रित अवकाश। विशेष भोजन व्यवस्था के साथ चक्रीय संतरी ड्यूटी।",
          authority: "कार्मिक विभाग / गृह मंत्रालय वार्षिक अवकाश सूची",
        },
        5: {
          title: "शनिवार सामरिक स्टैंड-डाउन",
          type: "विश्राम नियम",
          desc: "साप्ताहिक प्रशासनिक पुनर्प्राप्ति अवधि। कंपनियों में गैर-मुआवजा रात्रि ड्यूटी घंटों की अनुपस्थिति का सत्यापन।",
          authority: "सीआरपीएफ स्थायी आदेश 04/2020",
        },
        6: {
          title: "रविवार यूनिट कल्याण स्टैंड-डाउन",
          type: "विश्राम नियम",
          desc: "कंपनी ड्यूटी अधिकारी द्वारा जवानों के विश्राम चक्र और बैरक कल्याण का निरीक्षण।",
          authority: "सीआरपीएफ स्थायी आदेश 04/2020",
        },
        10: {
          title: "त्रैमासिक अवकाश स्वीकृति समीक्षा",
          type: "कल्याण निवारण",
          desc: "कंपनी कमांडर और बटालियन कल्याण अधिकारी आगामी त्योहारों के लिए संचित अवकाश आवेदनों की समीक्षा करते हैं।",
          authority: "गृह मंत्रालय अवकाश नियम 1972",
        },
        12: {
          title: "साप्ताहिक चौकी विश्राम एवं अनुकूलन",
          type: "विश्राम नियम",
          desc: "ग्रामीण क्षेत्रों में परिवारों वाले जवानों के लिए अनुकूलन अवधि और प्राथमिकता टेलीफोनिक लिंक सुविधा।",
          authority: "सीआरपीएफ कल्याण महानिदेशालय",
        },
        13: {
          title: "सक्रिय परिचालन शिफ्ट (वर्तमान तिथि)",
          type: "आज की स्थिति",
          desc: "लगातार रात्रि ड्यूटी के बीच 8 घंटे के निर्बाध विश्राम नियम का 100% अनुपालन सत्यापित।",
          authority: "प्रहरी रोस्टर सत्यापन",
        },
        16: {
          title: "मिलाद-उन-नबी / ईद-ए-मिलाद (राजपत्रित अवकाश)",
          type: "राजपत्रित अवकाश",
          desc: "भारत सरकार का आधिकारिक राजपत्रित अवकाश। प्रशासनिक कार्यालयों और नियमित परेडों के लिए स्टैंड-डाउन प्रोटोकॉल।",
          authority: "कार्मिक मंत्रालय / गृह मंत्रालय",
        },
        19: {
          title: "शनिवार उपकरण एवं रेडियो रखरखाव स्टैंड-डाउन",
          type: "विश्राम नियम",
          desc: "सभी सामरिक संचार इकाइयों में निर्धारित रखरखाव और विश्राम नियम का सत्यापन।",
          authority: "सीआरपीएफ स्थायी आदेश 04/2020",
        },
        20: {
          title: "आयुष्मान सीएपीएफ चिकित्सा शिविर",
          type: "स्वास्थ्य कल्याण",
          desc: "100% कैशलेस अस्पताल में भर्ती और परिवार के आश्रित स्वास्थ्य कार्ड के लिए चिकित्सा अधिकारियों की विशेष सहायता।",
          authority: "राष्ट्रीय स्वास्थ्य प्राधिकरण / गृह मंत्रालय",
        },
        25: {
          title: "बटालियन सैनिक सम्मेलन एवं कल्याण दरबार",
          type: "कमान निवारण",
          desc: "कार्मिक कल्याण मुद्दों और पारिवारिक भत्तों के गोपनीय समाधान के लिए कमांडेंट की अध्यक्षता में खुला मंच।",
          authority: "सीआरपीएफ अधिनियम 1949 धारा 8",
        },
        26: {
          title: "साप्ताहिक बल विश्राम एवं पुनर्प्राप्ति",
          type: "विश्राम नियम",
          desc: "सक्रिय गश्ती दलों में पुनर्स्थापनात्मक विश्राम चक्र और थकान निवारण की निगरानी।",
          authority: "सीआरपीएफ स्थायी आदेश 04/2020",
        },
        27: {
          title: "अनंत चतुर्दशी (प्रतिबंधित अवकाश)",
          type: "प्रतिबंधित अवकाश",
          desc: "भारत सरकार के कैलेंडर के अनुसार पर्व मनाने वाले जवानों के लिए वैकल्पिक अवकाश सुविधा।",
          authority: "गृह मंत्रालय अवकाश अनुसूची",
        },
      },
    },
    services: {
      tag: "तकनीकी सेवा पेशकश",
      title: "प्रमुख कल्याण एवं निवारण सेवाएं",
      desc: "वास्तविक समय डिजिटल ट्रैकिंग के साथ औपचारिक कल्याण प्रक्रिया शुरू करने के लिए नीचे दी गई सरकारी सेवा चुनें।",
      leave: {
        title: "छुट्टी का आवेदन",
        desc: "अर्जित, आकस्मिक या विश्राम अवकाश के लिए आवेदन करें। प्रणाली अधिकारी के त्वरित अनुमोदन के लिए स्वचालित रूप से ड्यूटी कवरेज की जांच करती है।",
        action: "छुट्टी के लिए आवेदन करें",
      },
      emergency: {
        title: "पारिवारिक आपातकाल",
        desc: "अस्पताल में भर्ती, पारिवारिक संकट या तत्काल राहत की आवश्यकता वाली घरेलू समस्याओं के लिए सीधा 12 घंटे का वैधानिक निवारण मार्ग।",
        action: "आपातकालीन एसओएस दर्ज करें",
      },
      welfare: {
        title: "गोपनीय कल्याण सहायता",
        desc: "प्रशासनिक शिकायतों या आश्रितों के चिकित्सा भत्ते के संबंध में अपने बटालियन कल्याण अधिकारी के साथ निजी परामर्श का अनुरोध करें।",
        action: "सहायता का अनुरोध करें",
      },
      grievance: {
        title: "शिकायत निवारण डेस्क",
        desc: "अपने पीआरएच ट्रैकिंग कोड से मौजूदा याचिका को ट्रैक करें, एसएलए चरणों की समीक्षा करें और डिजिटल हस्ताक्षरित रसीद डाउनलोड करें।",
        action: "स्थिति ट्रैक करें",
      },
    },
    innovations: {
      tag: "नवाचारी लोक सेवा क्षमताएं",
      title: "अगली पीढ़ी की कल्याणकारी संरचना",
      desc: "प्रहरी नैदानिक भाषा संरक्षण, परिचालन ड्यूटी संतुलन और वैधानिक सुरक्षा को एकीकृत करता है।",
      guardrails: {
        title: "एआई नैदानिक भाषा सुरक्षा",
        desc: "नैदानिक शब्दों को परिचालन तनाव की भाषा में परिवर्तित करता है, जिससे मानसिक स्वास्थ्य अधिनियम 2017 की धारा 21 के तहत सेवा में कोई आंच नहीं आती।",
      },
      uro: {
        title: "परिचालन ड्यूटी संतुलन (शिफ्ट स्वैपर)",
        desc: "सख्त विश्राम नियम और संतुलित ड्यूटी वितरण के साथ निष्पक्ष ट्रेड-आधारित ड्यूटी स्वैपिंग सुविधा।",
      },
      ledger: {
        title: "क्रिप्टोग्राफिक एसएचए-256 ऑडिट लेजर",
        desc: "भारतीय साक्ष्य अधिनियम 2023 की धारा 63 के तहत प्रत्येक निर्णय, अनुमोदन और संशोधन एक सुरक्षित क्रिप्टोग्राफिक लेजर में स्थायी रूप से दर्ज होता है।",
      },
    },
    metrics: {
      jawans: "3,25,000+",
      jawansLabel: "246 बटालियनों में 3,25,000+ जवान शामिल",
      sla: "99.4%",
      slaLabel: "वैधानिक एसएलए अनुपालन दर",
      denials: "0",
      denialsLabel: "शून्य स्वचालित अस्वीकृति (मानवीय समीक्षा अनिवार्य)",
      ivr: "24x7",
      ivrLabel: "कीपैड फोन हेल्पलाइन (हिंदी, अंग्रेजी, तमिल)",
    },
    footer: {
      aboutTitle: "प्रहरी के बारे में",
      aboutDesc: "प्रहरी केंद्रीय रिजर्व पुलिस बल, गृह मंत्रालय, भारत सरकार का आधिकारिक कार्मिक कल्याण एवं शिकायत निवारण डिजिटल पोर्टल है। भारत सरकार की वेबसाइटों के दिशानिर्देशों (GIGW 3.0) के तहत निर्मित।",
      portalsTitle: "सरकारी पोर्टल",
      statutoryTitle: "वैधानिक शासन",
      helplinesTitle: "24x7 आपातकालीन हेल्पलाइन",
      madadgaar: "सीआरपीएफ मददगार (टोल-फ्री): 14411",
      telemanas: "टेली-मानस राष्ट्रीय सहायता: 14416",
      copyright: "© 2026 महानिदेशालय, केंद्रीय रिजर्व पुलिस बल (सीआरपीएफ), गृह मंत्रालय, भारत सरकार। सर्वाधिकार सुरक्षित।",
      lastUpdated: "अंतिम अद्यतन: 13 सितंबर 2026 | पोर्टल संस्करण: 4.6 (उत्पादन गेटवे)",
      shaStatus: "क्रिप्टोग्राफिक एसएचए-256 लेजर: सक्रिय एवं सत्यापित",
    },
  },

  ta: {
    langCode: "ta",
    langName: "தமிழ்",
    header: {
      topGovt: "இந்திய அரசு",
      topMha: "உள்துறை அமைச்சகம் · சிஆர்பிஎஃப்",
      title: "பிரஹரி",
      subtitle: "பணியாளர் நலன் மற்றும் குறைதீர்ப்பு தளம்",
      motto: "பாதுகாப்பான படை · வலிமையான குடும்பம் · தன்னிறைவு பெற்ற தேசம்",
      ministryTitle: "உள்துறை அமைச்சகம் · மத்திய ரிசர்வ் காவல் படை",
      skipLink: "முதன்மை உள்ளடக்கத்திற்கு செல்லவும்",
      searchPlaceholder: "நலத்திட்டங்களை தேடவும் அல்லது பிஆர்ஹெச் குறிப்பு எண்ணை உள்ளிடவும்...",
      searchBtn: "தேடுக",
      ssoLogin: "சிஆர்பிஎஃப் போர்டல் உள்நுழைவு",
      helpline: "பிரஹரி உதவி எண்",
      ivrSubtitle: "தொலைபேசி குரல்வழி சேவை",
      screenReader: "திரை வாசிப்பு வசதி",
      highContrast: "அதிக வேறுபாடு",
      fontSizeAria: "எழுத்து அளவை மாற்றுக",
      resetAll: "மீட்டமைக்க",
      invertColors: "நிறங்களை மாற்றுக",
      grayscale: "சாம்பல் நிறம்",
      textSpacing: "எழுத்து இடைவெளி",
      lineHeight: "வரி உயரம்",
      hideImages: "படங்களை மறைக்க",
      largeCursor: "பெரிய கர்சர்",
      accessTools: "அணுகல்தன்மை கருவிகள்",
    },
    nav: {
      home: "முகப்பு",
      requestLeave: "விடுப்பு விண்ணப்பம்",
      track: "நிலை அறிதல்",
      welfare: "நல உதவி",
      emergency: "குடும்ப அவசர உதவி (12 மணி)",
      restCompliance: "ஓய்வு விதிகள்",
      safetyNet: "பாதுகாப்பு வலை",
      privacy: "ரகசிய காப்பு சாசனம்",
      commandOverview: "கட்டளை மேலோட்டம்",
      pendingApprovals: "நிலுவை ஒப்புதல்கள்",
      unitReadiness: "படைத் தயார்நிலை",
      tryPlan: "மாற்று திட்டம்",
      welfareDashboard: "நல மேலாண்மை",
      activeCasework: "நடப்பு வழக்குகள்",
      recoveryTracking: "மீட்பு கண்காணிப்பு",
      commandApprovals: "கட்டளை ஒப்புதல்கள்",
      governance: "நிர்வாக மேலாண்மை",
      auditLedger: "தணிக்கை பதிவேடு (SHA-256)",
      airGapSync: "ஆஃப்லைன் தரவு இணைப்பு",
      accessRoles: "அணுகல் & பொறுப்புகள்",
    },
    session: {
      activeSession: "செயலில் உள்ள அமர்வு",
      signedInAs: "உள்நுழைந்துள்ளவர்",
      open: "திறக்குக",
      signOut: "வெளியேறு",
      authenticatedOfficer: "அங்கீகரிக்கப்பட்ட அதிகாரி",
    },
    hero: {
      slides: [
        {
          badge: "உள்துறை / சிஆர்பிஎஃப் முதன்மை நலத்திட்டம்",
          title: "முதலில் உதவி. அடுத்து கணிப்பு.",
          subtitle: "பணியாளர் நலன் மற்றும் குறைதீர்ப்பு கட்டமைப்பு",
          description:
            "முன்னணி வீரர்களுக்கு விடுப்பு கோரவும், தீவிர சோர்வை தெரிவிக்கவும், நல உதவிகளை பெறவும் பிரஹரி வெளிப்படையான, ரகசியமான அமைப்பை வழங்குகிறது. ஒவ்வொரு முடிவும் கட்டளை அதிகாரியின் கட்டாய நேரடி மதிப்பாய்வுக்கு உட்பட்டது.",
          primaryAction: "விடுப்பு அல்லது நல உதவி கோருக",
          secondaryAction: "குடும்ப அவசர உதவி (12 மணி)",
        },
        {
          badge: "பிரிவு 21 சட்டப்பூர்வ ரகசியத்தன்மை பாதுகாப்பு",
          title: "ரகசிய நலன் மற்றும் வழிகாட்டுதல்",
          subtitle: "படைப்பிரிவு நல அதிகாரியின் நேரடி உதவி",
          description:
            "குடும்ப மருத்துவம், படிகள் அல்லது ஓய்வு பணி மாற்றங்கள் குறித்து உங்கள் நல அதிகாரியுடன் தனிப்பட்ட முறையில் கலந்துரையாடுங்கள். மனநல பராமரிப்பு சட்டம் 2017 பிரிவு 21-ன் படி எவ்வித சேவை குறைபாடுகளும் இன்றி முழுமையாக பாதுகாக்கப்படுகிறது.",
          primaryAction: "நல உதவி கோருக",
          secondaryAction: "ரகசிய காப்பு விதிகளை காண்க",
        },
        {
          badge: "அனைத்து சாதாரண தொலைபேசியிலும் கிடைக்கும் (IVR)",
          title: "அனைவருக்கும் அணுகல் — ஸ்மார்ட்போன் தேவையில்லை",
          subtitle: "பிரஹரி வாணி பலமொழி தொலைபேசி உதவி எண்",
          description:
            "முன்னணி நிலைகள் மற்றும் கடினமான நிலப்பரப்புகளில் பணியமர்த்தப்பட்டுள்ள வீரர்கள், எந்தவொரு சாதாரண பட்டன் போனில் இருந்தும் 24x7 தொலைபேசி உதவி எண்ணை அழைத்து அவசர அழைப்பு அல்லது சோர்வை தமிழ், இந்தி மற்றும் ஆங்கிலத்தில் தெரிவிக்கலாம்.",
          primaryAction: "தொலைபேசி வழியை சோதிக்க",
          secondaryAction: "கோரிக்கை நிலையை அறிய",
        },
      ],
      quickCheck: {
        title: "விரைவு கோரிக்கை நிலை அறிதல்",
        desc: "தீர்வு காலக்கெடுவை அறிய உங்கள் பிஆர்ஹெச் குறிப்பு எண்ணை உள்ளிடவும்.",
        placeholder: "உதா. PRH-2026-000184",
        btn: "நிலை காண்க",
        sampleLabel: "மாதிரி செயலில் உள்ள கோரிக்கை",
      },
    },
    mandate: {
      badge: "அதிகாரப்பூர்வ ஆணை",
      title: "மத்திய ரிசர்வ் காவல் படை நல ஆணை",
      subtitle: "மனித நேரடி ஆய்வுக்குட்பட்ட நல நிர்வாகம் · தலைமை இயக்குநரகம், சிஆர்பிஎஃப்",
      desc: "பிரஹரி முன்னணி வீரர்களுக்கும் படைப்பிரிவு தலைமைக்கும் இடையே ஒரு நிறுவன நல பாலமாக செயல்படுகிறது. உள்துறை அமைச்சகத்தின் மேற்பார்வையின் கீழ் வடிவமைக்கப்பட்ட இதில், ஒவ்வொரு விடுப்பு கோரிக்கையும் மற்றும் பணி மாற்றமும் பிரிவு 21 சட்டப்பூர்வ பாதுகாப்போடு கட்டளை அதிகாரியின் நேரடி ஒப்புதலுக்கு உட்பட்டது.",
      amitShahName: "திரு அமித் ஷா",
      amitShahRole: "மாண்புமிகு மத்திய உள்துறை மற்றும் கூட்டுறவுத்துறை அமைச்சர்",
      amitShahQuote:
        "“நமது சிஏபிஎஃப் வீரர்கள் இந்தியாவிற்கான அசைக்க முடியாத அரணாக விளங்குகிறார்கள். நமது வீரமிக்க பணியாளர்கள் மற்றும் அவர்களது குடும்பங்களின் நலனே இந்திய அரசின் முதன்மையான கடமையாகும்.”",
      dgName: "தலைமை இயக்குநர், சிஆர்பிஎஃப்",
      dgRole: "தலைமை இயக்குநரகம் · மத்திய ரிசர்வ் காவல் படை",
      dgQuote:
        "“பிரஹரி எல்லைப்பணி மற்றும் குடும்பப் பாதுகாப்பை ஒருங்கிணைத்து, ஒவ்வொரு வீரரின் குறையும் காலதாமதமின்றி கேட்கப்படுவதை உறுதி செய்கிறது.”",
    },
    whatsNew: {
      tag: "அதிகாரப்பூர்வ அறிவிப்புகள் & சுற்றறிக்கைகள்",
      title: "புதிய தகவல்கள் & படை உத்தரவுகள்",
      viewAll: "அனைத்து சுற்றறிக்கைகளையும் காண்க",
      items: [
        {
          date: "12 செப்டம்பர் 2026",
          title: "உள்துறை அமைச்சக ஆணை எண் II-27012/01/2024-Pers-II: சிஏபிஎஃப் களப் படைகளுக்கு 60 நாட்கள் ஈட்டிய விடுப்பு மற்றும் 15 நாட்கள் தற்செயல் விடுப்பு அனுமதி.",
          tag: "உள்துறை சுற்றறிக்கை",
          isNew: true,
          href: "/request?type=leave",
        },
        {
          date: "10 செப்டம்பர் 2026",
          title: "சிஆர்பிஎஃப் நிலையான ஆணை 04/2020: இரவுக்காவல் பணிகளுக்கு இடையே கட்டாய 8 மணிநேர தொடர் ஓய்வு உத்தரவாதம்.",
          tag: "நிலையான ஆணை",
          isNew: true,
          href: "/what-if",
        },
        {
          date: "08 செப்டம்பர் 2026",
          title: "தேசிய சுகாதார ஆணையம் / உள்துறை அமைச்சக உத்தரவு: ஆயுஷ்மான் சிஏபிஎஃப் திட்டத்தின் கீழ் 100% ரொக்கமில்லா மருத்துவமனை சிகிச்சை அனுமதி.",
          tag: "சுகாதார உத்தரவு",
          isNew: false,
          href: "/request?type=welfare",
        },
        {
          date: "05 செப்டம்பர் 2026",
          title: "மத்திய காவல் நல அங்காடி (KPKB): பணியில் உள்ள படைகளுக்கான மானிய விலையிலான மின்னணு மற்றும் வீட்டுப் பொருட்கள் கோரிக்கை வசதி.",
          tag: "நலத்திட்டம்",
          isNew: false,
          href: "/request?type=welfare",
        },
        {
          date: "02 செப்டம்பர் 2026",
          title: "உள்துறை அமைச்சகம்: மனநல பராமரிப்பு சட்டம் 2017 பிரிவு 21-ன் கீழ் பணியாளர் பணி பாதுகாப்பு மற்றும் சட்டப்பூர்வ காப்புறுதி.",
          tag: "சட்டப்பூர்வ பாதுகாப்பு",
          isNew: false,
          href: "/privacy",
        },
      ],
    },
    calendar: {
      title: "நலன் & ஓய்வு நாட்காட்டி",
      monthYear: "செப்டம்பர் 2026",
      restGuaranteeText: "கட்டாய ஓய்வு கண்காணிப்பு: அதிக பணிச்சுமை கொண்ட சுழற்சிகளுக்கு இடையே ஒவ்வொரு வீரருக்கும் சட்டப்பூர்வ 8 மணிநேர தொடர் ஓய்வு உத்தரவாதம் அளிக்கப்படுகிறது.",
      days: ["ஞாயி", "திங்", "செவ்", "புத", "வியா", "வெள்", "சனி"],
      legendToday: "இன்று",
      legendHoliday: "விடுமுறை",
      legendRest: "ஓய்வு இடைவேளை",
      legendReview: "சம்மேளனம்/மறுஆய்வு",
      authorityLabel: "அதிகாரம்",
      liveDateLabel: "நடப்பு தேதி",
      standardShift: "வழக்கமான பணி முறை",
      standardTitle: "வழக்கமான பணிப்பட்டியல் · 8 மணிநேர ஓய்வு விதி அமலில் உள்ளது",
      standardDesc: "வழக்கமான காவல் மற்றும் நிர்வாகப் பணிகள். தானியங்கி சோர்வு கண்காணிப்பு செயலில் உள்ளது; 8 மணிநேர தொடர் ஓய்வு உத்தரவாதம்.",
      checkComplianceBtn: "பணிப்பட்டியல் ஓய்வு விதியை சரிபார்க்க",
      events: {
        4: {
          title: "கிருஷ்ண ஜெயந்தி (மத்திய அரசு பொது விடுமுறை)",
          type: "பொது விடுமுறை",
          desc: "அனைத்து சிஏபிஎஃப் வளாகங்களிலும் கட்டாய அரசு விடுமுறை அனுசரிப்பு. சிறப்பு உணவு வசதியுடன் சுழற்சி முறை காவல் பணி.",
          authority: "மத்திய அரசு பணியாளர் துறை / உள்துறை அமைச்சக விடுமுறை பட்டியல்",
        },
        5: {
          title: "சனிக்கிழமை நிர்வாக பணி நிறுத்தம்",
          type: "ஓய்வு இடைவேளை",
          desc: "வாராந்திர நிர்வாக மீட்பு காலம். கூடுதல் இரவுப்பணிகள் ஏதுமில்லை என்பதை உறுதி செய்தல்.",
          authority: "சிஆர்பிஎஃப் நிலையான ஆணை 04/2020",
        },
        6: {
          title: "ஞாயிற்றுக்கிழமை படை நல பணி நிறுத்தம்",
          type: "ஓய்வு இடைவேளை",
          desc: "படைப்பிரிவு ஓய்வு சுழற்சி மற்றும் வீரர்கள் இருப்பிட நலனை பணி அதிகாரி ஆய்வு செய்தல்.",
          authority: "சிஆர்பிஎஃப் நிலையான ஆணை 04/2020",
        },
        10: {
          title: "காலாண்டு விடுப்பு அனுமதி பட்டியல் மறுஆய்வு",
          type: "நலத் தீர்வு",
          desc: "எதிர்வரும் திருவிழாக்களுக்கான விடுப்பு விண்ணப்பங்களை கமாண்டர்கள் மற்றும் நல அதிகாரிகள் ஆய்வு செய்தல்.",
          authority: "உள்துறை அமைச்சக விடுப்பு விதிகள் 1972",
        },
        12: {
          title: "வாராந்திர தொலைதூர முகாம் ஓய்வு & சீரமைப்பு",
          type: "ஓய்வு இடைவேளை",
          desc: "கிராமப்புற குடும்பங்களைக் கொண்ட வீரர்களுக்கான தொலைபேசி தொடர்பு மற்றும் மீட்பு நேரம்.",
          authority: "சிஆர்பிஎஃப் நல தலைமை இயக்குநரகம்",
        },
        13: {
          title: "செயலில் உள்ள பணி நாள் (நடப்பு தேதி)",
          type: "இன்றைய நிலை",
          desc: "தொடர் இரவுப் பணிகளுக்கு இடையே 8 மணிநேர தடையில்லா ஓய்வு விதி 100% கடைபிடிக்கப்படுவது உறுதி செய்யப்பட்டது.",
          authority: "பிரஹரி பணிப்பட்டியல் சரிபார்ப்பு",
        },
        16: {
          title: "மிலாடி நபி (மத்திய அரசு பொது விடுமுறை)",
          type: "பொது விடுமுறை",
          desc: "இந்திய அரசின் அதிகாரப்பூர்வ பொது விடுமுறை. நிர்வாக அலுவலகங்கள் மற்றும் வழக்கமான அணிவகுப்புகளுக்கு பணி நிறுத்தம்.",
          authority: "பணியாளர் அமைச்சகம் / உள்துறை அமைச்சகம்",
        },
        19: {
          title: "சனிக்கிழமை தளவாடம் மற்றும் வானொலி பராமரிப்பு",
          type: "ஓய்வு இடைவேளை",
          desc: "அனைத்து தகவல் தொடர்பு பிரிவுகளிலும் பராமரிப்பு பணிகள் மற்றும் ஓய்வு விதி சரிபார்ப்பு.",
          authority: "சிஆர்பிஎஃப் நிலையான ஆணை 04/2020",
        },
        20: {
          title: "ஆயுஷ்மான் சிஏபிஎஃப் மருத்துவ நல முகாம்",
          type: "சுகாதார நலன்",
          desc: "100% ரொக்கமில்லா சிகிச்சை மற்றும் குடும்ப மருத்துவ அட்டைகளை பெற மருத்துவர்கள் நேரடி உதவி.",
          authority: "தேசிய சுகாதார ஆணையம் / உள்துறை அமைச்சகம்",
        },
        25: {
          title: "படைப்பிரிவு சைனிக் சம்மேளனம் & தர்பார்",
          type: "கட்டளை தீர்வு",
          desc: "பணியாளர் நலன் மற்றும் படிகள் தொடர்பான பிரச்சனைகளை கமாண்டன்ட் தலைமையில் தீர்க்கும் நேரடி திறந்தவெளி அரங்கம்.",
          authority: "சிஆர்பிஎஃப் சட்டம் 1949 பிரிவு 8",
        },
        26: {
          title: "வாராந்திர படை ஓய்வு மற்றும் மீட்பு காலம்",
          type: "ஓய்வு இடைவேளை",
          desc: "ரோந்து பணிகளில் உள்ள வீரர்களின் சோர்வை நீக்கி புத்துணர்ச்சி அளிக்கும் ஓய்வு சுழற்சி.",
          authority: "சிஆர்பிஎஃப் நிலையான ஆணை 04/2020",
        },
        27: {
          title: "அனந்த சதுர்தசி (வரம்பிற்குட்பட்ட விடுமுறை)",
          type: "வரம்பிற்குட்பட்ட விடுமுறை",
          desc: "பண்டிகை கொண்டாடும் பணியாளர்களுக்கான விருப்ப விடுமுறை வசதி.",
          authority: "உள்துறை அமைச்சக விடுமுறை கால அட்டவணை",
        },
      } as Record<number, { title: string; type: string; desc: string; authority: string }>,
    },
    services: {
      tag: "தொழில்நுட்ப சேவை வசதிகள்",
      title: "முக்கிய நலன் மற்றும் தீர்வு சேவைகள்",
      desc: "நிகழ்நேர டிஜிட்டல் கண்காணிப்புடன் கூடிய அதிகாரப்பூர்வ நல சேவையை பெற கீழேயுள்ள விருப்பத்தை தேர்வு செய்யவும்.",
      leave: {
        title: "விடுப்பு விண்ணப்பம்",
        desc: "ஈட்டிய, தற்செயல் அல்லது ஓய்வு விடுப்புகளுக்கு விண்ணப்பிக்கவும். அதிகாரி விரைந்து ஒப்புதல் அளிக்க பணிச்சுமை தானாக சோதிக்கப்படுகிறது.",
        action: "விடுப்புக்கு விண்ணப்பிக்க",
      },
      emergency: {
        title: "குடும்ப அவசர உதவி",
        desc: "மருத்துவமனை அனுமதி அல்லது அவசர குடும்ப தேவைகளுக்கு உடனடியாக தீர்வு காண 12 மணிநேர சிறப்பு விரைவுப் பிரிவு.",
        action: "அவசர கோரிக்கை பதிக",
      },
      welfare: {
        title: "ரகசிய நல உதவி",
        desc: "நிர்வாக குறைகள் அல்லது குடும்ப மருத்துவ படிகள் குறித்து உங்கள் நல அதிகாரியுடன் தனிப்பட்ட ஆலோசனை பெற விண்ணப்பிக்கவும்.",
        action: "உதவி கோருக",
      },
      grievance: {
        title: "குறைதீர்ப்பு மையம்",
        desc: "உங்கள் பிஆர்ஹெச் குறியீடு மூலம் விண்ணப்பத்தின் நிலையை அறியவும், அதிகாரப்பூர்வ டிஜிட்டல் ரசீதை பதிவிறக்கவும்.",
        action: "நிலை கண்காணிக்க",
      },
    },
    innovations: {
      tag: "புதுமையான பொது சேவைத் திறன்கள்",
      title: "அடுத்த தலைமுறை நலக் கட்டமைப்பு",
      desc: "பிரஹரி மருத்துவ மொழி பாதுகாப்பு, சமச்சீரான பணி ஒதுக்கீடு மற்றும் மறைகுறியாக்க பாதுகாப்பை ஒருங்கிணைக்கிறது.",
      guardrails: {
        title: "செயற்கை நுண்ணறிவு மருத்துவ மொழி பாதுகாப்பு",
        desc: "மருத்துவ சொற்களை பணிச்சூழல் சொற்களாக மாற்றி, மனநல சட்டம் 2017 பிரிவு 21-ன் படி வீரர்களின் பணிப் பதிவேடு பாதிக்கப்படாமல் பாதுகாக்கிறது.",
      },
      uro: {
        title: "படைப்பிரிவு சுழற்சி மேம்பாட்டாளர் (URO)",
        desc: "சட்டப்பூர்வ 8 மணிநேர தொடர் ஓய்வு மற்றும் வாரத்திற்கு அதிகபட்சம் 2 இரவுப் பணிகளுடன் கூடிய நியாயமான பணி மாற்ற அமைப்பு.",
      },
      ledger: {
        title: "SHA-256 மறைகுறியாக்க தணிக்கை பதிவேடு",
        desc: "ஒவ்வொரு விடுப்பு ஒப்புதலும் மாற்றமும் இந்திய சாட்சிய சட்டம் 2023 பிரிவு 63-ன் கீழ் யாராலும் திருத்த முடியாத மறைகுறியாக்க பதிவேட்டில் பதியப்படுகிறது.",
      },
    },
    metrics: {
      jawans: "3,25,000+",
      jawansLabel: "246 படைப்பிரிவுகளில் 3,25,000+ வீரர்கள் பாதுகாப்பு",
      sla: "99.4%",
      slaLabel: "சட்டப்பூர்வ காலக்கெடு தீர்வு விகிதம்",
      denials: "0",
      denialsLabel: "தானியங்கி நிராகரிப்புகள் இல்லை (நேரடி ஆய்வு கட்டாயம்)",
      ivr: "24x7",
      ivrLabel: "பட்டன் போன் உதவி எண் (ஆங்கிலம், இந்தி, தமிழ்)",
    },
    footer: {
      aboutTitle: "பிரஹரி பற்றி",
      aboutDesc: "பிரஹரி என்பது இந்திய அரசு, உள்துறை அமைச்சகம், மத்திய ரிசர்வ் காவல் படையின் அதிகாரப்பூர்வ பணியாளர் நலன் மற்றும் குறைதீர்ப்பு தளமாகும். இந்திய அரசு இணையதள வழிகாட்டுதல்களின்படி (GIGW 3.0) உருவாக்கப்பட்டது.",
      portalsTitle: "அரசு இணையதளங்கள்",
      statutoryTitle: "சட்டப்பூர்வ நிர்வாகம்",
      helplinesTitle: "24x7 அவசர உதவி எண்கள்",
      madadgaar: "சிஆர்பிஎஃப் மதத்கார் (இலவச எண்): 14411",
      telemanas: "டெலி-மானஸ் தேசிய உதவி எண்: 14416",
      copyright: "© 2026 தலைமை இயக்குநரகம், மத்திய ரிசர்வ் காவல் படை (CRPF), உள்துறை அமைச்சகம், இந்திய அரசு. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.",
      lastUpdated: "கடைசியாக புதுப்பிக்கப்பட்டது: 13 செப்டம்பர் 2026 | பதிப்பு: 4.6 (நேரலை தளம்)",
      shaStatus: "மறைகுறியாக்க SHA-256 தணிக்கை பதிவேடு: செயலில் உள்ளது & சரிபார்க்கப்பட்டது",
    },
  },
};

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  setLang: () => {},
  t: translations.en,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("prahari_lang") as Language | null;
    if (saved && (saved === "en" || saved === "hi" || saved === "ta")) {
      setLangState(saved);
      document.documentElement.lang = saved;
    }

    const handleLangChange = (e: any) => {
      const newLang = e.detail?.lang;
      if (newLang && (newLang === "en" || newLang === "hi" || newLang === "ta")) {
        setLangState(newLang);
        document.documentElement.lang = newLang;
      }
    };

    window.addEventListener("prahari_language_change", handleLangChange);
    return () => window.removeEventListener("prahari_language_change", handleLangChange);
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("prahari_lang", newLang);
    document.documentElement.lang = newLang;
    window.dispatchEvent(new CustomEvent("prahari_language_change", { detail: { lang: newLang } }));
  };

  const t = translations[lang] || translations.en;

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
};

export function useTranslation() {
  return useContext(I18nContext);
}
