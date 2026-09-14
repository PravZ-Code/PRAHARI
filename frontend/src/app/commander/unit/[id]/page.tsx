"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { UnitReadinessDetail, WorkloadTrend } from "@/lib/types";
import { RiskDistributionChart } from "@/components/RiskDistributionChart";
import { TrendLineChart } from "@/components/TrendLineChart";
import { WorkloadBarChart } from "@/components/WorkloadBarChart";
import { ArrowLeft, Shield, Users } from "lucide-react";
import Link from "next/link";
import { isAuthenticated, getStoredUser } from "@/lib/auth";

export default function UnitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const unitId = params?.id as string;

  const [detail, setDetail] = useState<UnitReadinessDetail | null>(null);
  const [workload, setWorkload] = useState<WorkloadTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.replace("/login?redirect=" + encodeURIComponent(window.location.pathname));
      return;
    }
    const user = getStoredUser();
    if (user && user.role !== "commander" && user.role !== "admin") {
      window.location.replace(user.role === "welfare" || user.role === "welfare_officer" ? "/welfare" : "/portal");
      return;
    }
    if (unitId) {
      fetchUnit();
    }
  }, [unitId]);

  const fetchUnit = async () => {
    try {
      const [readinessRes, workloadRes] = await Promise.all([
        api.get(`/commander/unit/${unitId}/readiness`),
        api.get(`/commander/unit/${unitId}/workload-trends?days=14`),
      ]);
      setDetail(readinessRes.data);
      setWorkload(workloadRes.data.trends || []);
    } catch (e: any) {
      console.error(e);
      if (e.response?.status === 401 || e.response?.status === 403) {
        window.location.replace("/login?redirect=" + encodeURIComponent(window.location.pathname));
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading || !detail) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Loading company information...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto min-h-screen">
      <div>
        <Link
          href="/commander"
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Commander Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          <h2 className="text-2xl font-black text-white tracking-wide">{detail.unit_name}</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Shows company readiness and duty shift breakdown.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-defense-800/80 border border-slate-700/80 rounded-2xl p-5">
          <h4 className="font-bold text-white text-sm mb-3">Soldier Health & Stress Breakdown</h4>
          <RiskDistributionChart distribution={detail.risk_distribution} />
        </div>

        <div className="bg-defense-800/80 border border-slate-700/80 rounded-2xl p-5">
          <h4 className="font-bold text-white text-sm mb-3">Troop Readiness Over Time</h4>
          <TrendLineChart data={detail.readiness_trend} dataKey="score" label="Readiness Score" color="#10b981" />
        </div>

        <div className="bg-defense-800/80 border border-slate-700/80 rounded-2xl p-5">
          <h4 className="font-bold text-white text-sm mb-3">Duty Hours & Shift Balance (Past 14 Days)</h4>
          <WorkloadBarChart data={workload} />
        </div>
      </div>
    </div>
  );
}
