import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { WorkloadTrend } from "@/lib/types";

interface WorkloadBarChartProps {
  data: WorkloadTrend[];
}

export const WorkloadBarChart: React.FC<WorkloadBarChartProps> = ({ data }) => {
  const formatted = (data || []).map((d) => ({
    ...d,
    shortDate: d.date ? d.date.slice(5) : "",
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formatted} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
          <XAxis dataKey="shortDate" stroke="#64748b" fontSize={11} tickLine={false} dy={5} />
          <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
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
            formatter={(val) => <span className="text-xs text-slate-300 capitalize">{val.replace("_", " ")}</span>}
          />
          <Bar dataKey="day_shift_count" name="Day Shifts" stackId="a" fill="#3b82f6" />
          <Bar dataKey="night_shift_count" name="Night Shifts" stackId="a" fill="#8b5cf6" />
          <Bar dataKey="off_count" name="Rest / Off" stackId="a" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
