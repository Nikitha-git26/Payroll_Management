"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartColors } from "@/lib/chartTheme";

interface SlaDatum {
  bucket: string;
  count: number;
}

const BUCKET_COLOR: Record<string, string> = {
  Overdue: chartColors.status.critical,
  "< 7 days": chartColors.status.serious,
  "7–14 days": chartColors.status.warning,
  "> 14 days": chartColors.status.good,
};

function SlaTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as SlaDatum;
  return (
    <div className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs shadow-card">
      <div className="font-medium text-ink-900">{d.bucket}</div>
      <div className="mt-1 text-ink-600">
        <span className="tabular-nums font-semibold text-ink-900">{d.count}</span> active accounts
      </div>
    </div>
  );
}

export default function SlaHorizonChart({ data }: { data: SlaDatum[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 4 }}>
          <XAxis
            dataKey="bucket"
            tick={{ fill: chartColors.textSecondary, fontSize: 12 }}
            axisLine={{ stroke: chartColors.baseline }}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip content={<SlaTooltip />} cursor={{ fill: chartColors.gridline, opacity: 0.4 }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={64} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.bucket} fill={BUCKET_COLOR[d.bucket] ?? chartColors.muted} />
            ))}
            <LabelList
              dataKey="count"
              position="top"
              style={{ fill: chartColors.textPrimary, fontSize: 13, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
