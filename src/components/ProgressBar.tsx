import { cn } from "@/lib/utils";

export default function ProgressBar({
  value,
  className,
  colorClass = "bg-brand-600",
}: {
  value: number;
  className?: string;
  colorClass?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-full min-w-[64px] overflow-hidden rounded-full bg-ink-100">
        <div
          className={cn("h-full rounded-full transition-all", colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums text-xs font-medium text-ink-600">{pct.toFixed(0)}%</span>
    </div>
  );
}
