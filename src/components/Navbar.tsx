"use client";

import { ChevronRight, Loader2, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuickFilter = "All" | "At Risk" | "SLA Breached" | "Blocked";

const FILTERS: QuickFilter[] = ["All", "At Risk", "SLA Breached", "Blocked"];

export default function Navbar({
  quickFilter,
  onQuickFilterChange,
  onRunValidation,
  isValidating,
  lastRunLabel,
}: {
  quickFilter: QuickFilter;
  onQuickFilterChange: (f: QuickFilter) => void;
  onRunValidation: () => void;
  isValidating: boolean;
  lastRunLabel: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <span className="font-semibold text-ink-900">PayFlow</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span>Payroll Operations</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-ink-900">Onboarding &amp; Reconciliation Dashboard</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-ink-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-good opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-status-good" />
            </span>
            Live · {lastRunLabel}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-ink-50 p-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => onQuickFilterChange(f)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  quickFilter === f
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-ink-500 hover:text-ink-800"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={onRunValidation}
            disabled={isValidating}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isValidating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PlayCircle className="h-3.5 w-3.5" />
            )}
            {isValidating ? "Running Validation Engine…" : "Run Validation Engine"}
          </button>
        </div>
      </div>
    </header>
  );
}
