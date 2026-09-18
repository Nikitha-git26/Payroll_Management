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
  const color = isOver ? chartColors.diverging.positive : chartColors.diverging.negative;

  return (
    <div className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs shadow-card">
      <div className="flex items-center gap-1.5 font-medium text-ink-900">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        {d.companyName} <span className="text-ink-400">({d.customerId})</span>
      </div>
      <div className="mt-1 text-ink-600">
        {isOver ? "Surplus" : "Deficit"} —{" "}
        <span className="tabular-nums font-semibold" style={{ color }}>
          {isOver ? "+" : "−"}
          {formatINR(Math.abs(d.variance))}
        </span>
      </div>
      <div className="mt-0.5 text-[11px] text-ink-400">
        Processed net {isOver ? "exceeds" : "falls short of"} expected net for this account
      </div>
    </div>
  );
}

export default function VarianceBarChart({ data }: { data: VarianceDatum[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-80 w-full items-center justify-center text-sm text-ink-500">
        No payroll variance detected — all accounts reconciled.
      </div>
    );
  }

  return (
    <div className="flex h-80 w-full flex-col">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 8 }}>
            <XAxis
              type="number"
              tick={{ fill: chartColors.textSecondary, fontSize: 11 }}
              axisLine={{ stroke: chartColors.baseline }}
              tickLine={false}
              tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="customerId"
              width={48}
              tick={{ fill: chartColors.textSecondary, fontSize: 12 }}
              axisLine={{ stroke: chartColors.baseline }}
              tickLine={false}
            />
            <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="3 3" />
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
      <div className="mt-1 flex items-center justify-center gap-4 text-[11px] text-ink-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: chartColors.diverging.negative }} />
          Deficit (processed &lt; expected)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: chartColors.diverging.positive }} />
          Surplus (processed &gt; expected)
        </span>
      </div>
    </div>
  );
}
