"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { GovernmentHeader } from "@/components/GovernmentHeader";
import { PortalHeader } from "@/components/PortalHeader";

const PORTAL_PREFIXES = [
  "/commander",
  "/welfare",
  "/admin",
  "/approvals",
  "/what-if",
  "/safety-net",
  "/recovery",
  "/portal",
  "/request",
  "/track",
  "/emergency",
];

export const HeaderSwitch: React.FC = () => {
  const pathname = usePathname();
  const isPortal = PORTAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  if (isPortal) {
    return <PortalHeader />;
  }

  return <GovernmentHeader />;
};
