"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { openPolicyModal } from "@/components/PolicyModalHost";

export default function TermsOfServicePage() {
  const router = useRouter();

  useEffect(() => {
    // Open policy modal with terms tab and redirect to homepage with policy param
    openPolicyModal("terms");
    router.replace("/?policy=terms");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-8 text-center text-slate-500 text-xs">
      <div className="animate-pulse">Loading Terms of Service &amp; System Usage Charter...</div>
    </div>
  );
}
