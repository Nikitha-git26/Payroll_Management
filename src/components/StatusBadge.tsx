import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  "On Track": "bg-status-good/10 text-status-good border-status-good/30",
  "At Risk": "bg-status-warning/15 text-amber-700 border-status-warning/40",
  Blocked: "bg-status-critical/10 text-status-critical border-status-critical/30",
  Completed: "bg-status-completed/10 text-status-completed border-status-completed/30",
  Reconciled: "bg-status-good/10 text-status-good border-status-good/30",
  "Under Review": "bg-status-warning/15 text-amber-700 border-status-warning/40",
  Unreconciled: "bg-status-critical/10 text-status-critical border-status-critical/30",
  "SLA Breach": "bg-status-critical/10 text-status-critical border-status-critical/30",
  Critical: "bg-status-critical/10 text-status-critical border-status-critical/30",
  High: "bg-orange-100 text-orange-700 border-orange-300",
  Medium: "bg-status-warning/15 text-amber-700 border-status-warning/40",
};

export default function StatusBadge({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        STYLES[value] ?? "bg-ink-100 text-ink-700 border-ink-200",
        className
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: "currentColor" }}
        aria-hidden
      />
      {value}
    </span>
  );
}
