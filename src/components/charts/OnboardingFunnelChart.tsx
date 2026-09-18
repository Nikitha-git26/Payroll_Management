"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartColors } from "@/lib/chartTheme";

interface FunnelDatum {
  stage: string;
  count: number;
  order: number;
}

function FunnelTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as FunnelDatum;
  return (
    <div className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs shadow-card">
      <div className="font-medium text-ink-900">{d.stage}</div>
      <div className="mt-1 text-ink-600">
        <span className="tabular-nums font-semibold text-ink-900">{d.count}</span> accounts at or
        past this stage
      </div>
    </div>
  );
}

export default function OnboardingFunnelChart({ data }: { data: FunnelDatum[] }) {
  const total = data[0]?.count || 1;

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, left: 4, bottom: 4 }}>
          <XAxis type="number" hide domain={[0, total]} />
          <YAxis
            type="category"
            dataKey="stage"
            width={120}
            tick={{ fill: chartColors.textSecondary, fontSize: 12 }}
            axisLine={{ stroke: chartColors.baseline }}
            tickLine={false}
          />
          <Tooltip content={<FunnelTooltip />} cursor={{ fill: chartColors.gridline, opacity: 0.4 }} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.stage} fill={chartColors.sequential[d.order]} />
            ))}
            <LabelList
              dataKey="count"
              position="right"
              style={{ fill: chartColors.textPrimary, fontSize: 12, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
