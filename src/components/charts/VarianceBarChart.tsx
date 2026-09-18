"use client";

import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartColors } from "@/lib/chartTheme";
import { formatINR } from "@/lib/utils";

interface VarianceDatum {
  customerId: string;
  companyName: string;
  variance: number;
}

function VarianceTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as VarianceDatum;
  const isOver = d.variance > 0;
  return (
    <div className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs shadow-card">
      <div className="font-medium text-ink-900">
        {d.companyName} <span className="text-ink-400">({d.customerId})</span>
      </div>
      <div className="mt-1 text-ink-600">
        Processed net {isOver ? "exceeds" : "falls short of"} expected by{" "}
        <span className="tabular-nums font-semibold" style={{ color: isOver ? chartColors.diverging.positive : chartColors.diverging.negative }}>
          {formatINR(Math.abs(d.variance))}
        </span>
      </div>
    </div>
  );
}

export default function VarianceBarChart({ data }: { data: VarianceDatum[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 w-full items-center justify-center text-sm text-ink-500">
        No payroll variance detected — all accounts reconciled.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
          <XAxis type="number" tick={{ fill: chartColors.textSecondary, fontSize: 11 }} axisLine={{ stroke: chartColors.baseline }} tickLine={false} />
          <YAxis
            type="category"
            dataKey="customerId"
            width={48}
            tick={{ fill: chartColors.textSecondary, fontSize: 12 }}
            axisLine={{ stroke: chartColors.baseline }}
            tickLine={false}
          />
          <ReferenceLine x={0} stroke={chartColors.baseline} />
          <Tooltip content={<VarianceTooltip />} cursor={{ fill: chartColors.gridline, opacity: 0.4 }} />
          <Bar dataKey="variance" radius={[4, 4, 4, 4]} maxBarSize={16} isAnimationActive={false}>
            {data.map((d) => (
              <Cell
                key={d.customerId}
                fill={d.variance > 0 ? chartColors.diverging.positive : chartColors.diverging.negative}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
