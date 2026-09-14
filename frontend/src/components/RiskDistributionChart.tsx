import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { RiskLevel } from "@/lib/types";

interface RiskDistributionChartProps {
  distribution: Record<RiskLevel, number>;
}

const COLORS: Record<string, string> = {
  green: "#10b981",
  yellow: "#f59e0b",
  orange: "#f97316",
  red: "#ef4444",
};

export const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({ distribution }) => {
  const data = [
    { name: "Healthy (Green)", key: "green", value: distribution?.green || 0 },
    { name: "Mild Strain (Yellow)", key: "yellow", value: distribution?.yellow || 0 },
    { name: "Elevated Fatigue (Orange)", key: "orange", value: distribution?.orange || 0 },
    { name: "Urgent Attention (Red)", key: "red", value: distribution?.red || 0 },
  ].filter((d) => d.value > 0);

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={`cell-${entry.key}`} fill={COLORS[entry.key]} stroke="#0f172a" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              borderColor: "#334155",
              borderRadius: "0.5rem",
              color: "#f8fafc",
              fontSize: "0.75rem",
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-xs text-slate-300 font-medium">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
