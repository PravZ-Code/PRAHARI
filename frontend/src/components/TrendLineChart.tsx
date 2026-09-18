import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TrendPoint {
  date: string;
  score?: number;
  risk_score?: number;
}

interface TrendLineChartProps {
  data: TrendPoint[];
  dataKey?: "score" | "risk_score";
  label?: string;
  color?: string;
  yDomain?: [number, number];
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({
  data,
  dataKey = "score",
  label = "Trend",
  color = "#3b82f6",
  yDomain,
}) => {
  const formattedData = (data || []).map((d) => ({
    ...d,
    shortDate: d.date ? d.date.slice(5) : "",
    val: d[dataKey] !== undefined ? d[dataKey] : 0,
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
          <XAxis
            dataKey="shortDate"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            dy={5}
          />
          <YAxis
            stroke="#64748b"
            fontSize={11}
            domain={yDomain || ["auto", "auto"]}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              borderColor: "#334155",
              borderRadius: "0.5rem",
              color: "#f8fafc",
              fontSize: "0.75rem",
            }}
            formatter={(value: any) => [
              dataKey === "risk_score" ? `${(Number(value) * 100).toFixed(0)}%` : value,
              label,
            ]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="val"
            stroke={color}
            strokeWidth={2.5}
            dot={{ fill: color, r: 3 }}
            activeDot={{ r: 6, fill: "#fff", stroke: color, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
