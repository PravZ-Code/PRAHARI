"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { openPolicyModal } from "@/components/PolicyModalHost";

export default function PrivacyPolicyPage() {
  const router = useRouter();

  useEffect(() => {
    // Open policy modal with privacy tab and redirect to homepage with policy param
    openPolicyModal("privacy");
    router.replace("/?policy=privacy");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-8 text-center text-slate-500 text-xs">
      <div className="animate-pulse">Loading Statutory Privacy Policy &amp; DPDP Charter...</div>
    </div>
  );
}
