import React from "react";
import { ShapFactor } from "@/lib/types";
import { formatHumanReadable } from "@/lib/formatters";

interface ShapWaterfallChartProps {
  factors: ShapFactor[] | Record<string, number | { impact?: number; value?: any }>;
  maxFactors?: number;
  minContributionPct?: number;
}

const cleanFactorName = (name: string) => {
  // Matches "[Self-Report] 14-Day Mood Baseline" or "[Wellness] Sleep Quality"
  const match = name.match(/^\[(.*?)\]\s*(.*)$/);
  if (match) {
    return {
      category: match[1].trim(),
      title: formatHumanReadable(match[2].trim()),
    };
  }
  return {
    category: null,
    title: formatHumanReadable(name.trim()),
  };
};

export const ShapWaterfallChart: React.FC<ShapWaterfallChartProps> = ({
  factors,
  maxFactors = 4,
  minContributionPct = 5,
}) => {
  const factorList: ShapFactor[] = React.useMemo(() => {
    if (!factors) return [];
    let list: ShapFactor[] = [];
    if (Array.isArray(factors)) {
      list = [...factors];
    } else if (typeof factors === "object") {
      list = Object.entries(factors).map(([feature, val]) => {
        if (typeof val === "number") {
          return { feature, impact: val };
        } else if (typeof val === "object" && val !== null) {
          return { feature, impact: (val as any).impact ?? 0 };
        }
        return { feature, impact: 0 };
      });
    }

    // Filter out invalid/zero impacts
    const valid = list.filter((f) => f && typeof f.impact === "number");
    if (valid.length === 0) return [];

    const totalAbsImpact = valid.reduce((sum, f) => sum + Math.abs(f.impact || 0), 0) || 1.0;

    // Calculate contribution percentage and sort by descending impact
    const withContrib = valid.map((f) => {
      const impact = f.impact || 0;
      const contribPct = f.contribution_pct ?? Math.round((Math.abs(impact) / totalAbsImpact) * 100);
      return {
        ...f,
        contribution_pct: Math.round(contribPct),
      };
    }).sort((a, b) => (b.contribution_pct ?? 0) - (a.contribution_pct ?? 0));

    // Show only the necessary primary factors (>= 5% contribution, or top 2 minimum)
    const significant = withContrib.filter((f) => (f.contribution_pct ?? 0) >= minContributionPct);
    return (significant.length >= 2 ? significant : withContrib).slice(0, maxFactors);
  }, [factors, maxFactors, minContributionPct]);

  if (!factorList || factorList.length === 0) {
    return (
      <div className="text-xs text-slate-500 italic p-4 text-center">
        No factor details available.
      </div>
    );
  }

  const maxAbsImpact = Math.max(...factorList.map((f) => Math.abs(f.impact || 0.01)), 0.01);

  return (
    <div className="space-y-2 pt-1">
      {factorList.map((factor, idx) => {
        const impact = factor.impact || 0;
        const isPositive = impact >= 0;
        const widthPct = Math.min(100, Math.max(10, Math.round((Math.abs(impact) / maxAbsImpact) * 100)));
        const rawName = factor.display_name || formatHumanReadable(factor.feature);
        const { category, title } = cleanFactorName(rawName);
        const contribPct = factor.contribution_pct ?? 0;

        return (
          <div key={idx} className="space-y-1.5 p-2 rounded-lg bg-slate-50/70 border border-slate-200/60">
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                {category && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-300 shrink-0">
                    {category}
                  </span>
                )}
                <span className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                  {title}
                </span>
              </div>
              <div className="shrink-0">
                <span
                  className={`font-bold px-2 py-0.5 rounded text-xs inline-block ${
                    isPositive
                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  {contribPct}% Impact
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isPositive ? "bg-rose-600" : "bg-emerald-600"
                }`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
