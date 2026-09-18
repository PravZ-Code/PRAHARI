"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { GovernmentFooter } from "@/components/GovernmentFooter";
import { PortalFooter } from "@/components/PortalFooter";

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

export const FooterSwitch: React.FC = () => {
  const pathname = usePathname();
  const isPortal = PORTAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  if (isPortal) {
    return <PortalFooter />;
  }

  return <GovernmentFooter />;
};
