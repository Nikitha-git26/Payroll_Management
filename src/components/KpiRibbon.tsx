import { AlertTriangle, Ban, CheckCircle2, IndianRupee, TrendingUp, Users } from "lucide-react";
import { formatLakhs } from "@/lib/utils";

interface KpiRibbonProps {
  kpis: {
    totalAccounts: number;
    onTrack: number;
    atRisk: number;
    blocked: number;
    completed: number;
    reconciled: number;
    varianceFlagged: number;
    totalGross: number;
    totalNetProcessed: number;
  };
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "good" | "warning" | "critical";
}) {
  const toneClasses: Record<string, string> = {
    default: "text-ink-900",
    good: "text-status-good",
    warning: "text-amber-600",
    critical: "text-status-critical",
  };

  return (
    <div className="card flex min-w-[180px] flex-1 flex-col gap-2 p-4">
      <div className="flex items-center gap-2 text-ink-500">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className={`tabular-nums text-2xl font-semibold ${toneClasses[tone]}`}>{value}</div>
      {sub && <div className="text-xs text-ink-500">{sub}</div>}
    </div>
  );
}

export default function KpiRibbon({ kpis }: KpiRibbonProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <KpiCard
        icon={<Users className="h-4 w-4" />}
        label="Total Accounts"
        value={String(kpis.totalAccounts)}
        sub="B2B onboarding pipeline"
      />
      <KpiCard
        icon={<TrendingUp className="h-4 w-4" />}
        label="On Track"
        value={String(kpis.onTrack)}
        tone="good"
        sub={`${kpis.completed} completed`}
      />
      <KpiCard
        icon={<AlertTriangle className="h-4 w-4" />}
        label="At Risk"
        value={String(kpis.atRisk)}
        tone="warning"
      />
      <KpiCard
        icon={<Ban className="h-4 w-4" />}
        label="Blocked"
        value={String(kpis.blocked)}
        tone="critical"
      />
      <KpiCard
        icon={<CheckCircle2 className="h-4 w-4" />}
        label="Reconciled"
        value={`${kpis.reconciled}/${kpis.reconciled + kpis.varianceFlagged}`}
        sub={`${kpis.varianceFlagged} flagged`}
        tone={kpis.varianceFlagged > 0 ? "warning" : "good"}
      />
      <KpiCard
        icon={<IndianRupee className="h-4 w-4" />}
        label="Net Payroll Processing"
        value={formatLakhs(kpis.totalNetProcessed)}
        sub={`Gross ${formatLakhs(kpis.totalGross)}`}
      />
    </div>
  );
}
