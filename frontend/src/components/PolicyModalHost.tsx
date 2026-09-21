"use client";

import React, { useState, useEffect } from "react";
import { PolicyModal, PolicyTab } from "./PolicyModal";

export const openPolicyModal = (tab: PolicyTab = "terms") => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("prahari_open_policy", { detail: { tab } }));
  }
};

export const PolicyModalHost: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<PolicyTab>("terms");

  useEffect(() => {
    // Check URL parameters on mount
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const policyParam = params.get("policy");
      if (policyParam && ["terms", "privacy", "confidentiality", "guidelines"].includes(policyParam)) {
        setTab(policyParam as PolicyTab);
        setIsOpen(true);
      }
    }

    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab?: PolicyTab }>;
      if (customEvent.detail?.tab) {
        setTab(customEvent.detail.tab);
      }
      setIsOpen(true);
    };

    window.addEventListener("prahari_open_policy", handleOpen);
    return () => window.removeEventListener("prahari_open_policy", handleOpen);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // If URL had ?policy=..., clean it up without reload
    if (typeof window !== "undefined" && window.location.search.includes("policy=")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("policy");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }
  };

  return (
    <PolicyModal
      isOpen={isOpen}
      onClose={handleClose}
      initialTab={tab}
    />
  );
};
