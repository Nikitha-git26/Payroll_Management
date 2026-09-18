"use client";

import { useEffect } from "react";
import { AlertOctagon, Ban, Check, Clock, Loader2, X } from "lucide-react";
import type { EnrichedAccount } from "@/lib/data";
import { formatDate, formatINR } from "@/lib/utils";
import StatusBadge from "./StatusBadge";
import ProgressBar from "./ProgressBar";
import { severityColor } from "@/lib/chartTheme";

const TASK_STATUS_ICON: Record<string, React.ReactNode> = {
  Completed: <Check className="h-3.5 w-3.5 text-status-good" />,
  "In Progress": <Loader2 className="h-3.5 w-3.5 text-brand-500" />,
  Pending: <Clock className="h-3.5 w-3.5 text-ink-400" />,
  Blocked: <Ban className="h-3.5 w-3.5 text-status-critical" />,
};

export default function InspectDrawer({
  account,
  onClose,
}: {
  account: EnrichedAccount | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!account) return null;

  const recon = account.recon;
  const expectedGross = recon?.expectedGross ?? 0;
  const expectedNet = recon?.expectedNet ?? 0;
  const processedNet = recon?.processedNet ?? 0;
  const variance = recon?.variance ?? 0;
  const totalDeductions = expectedGross - expectedNet;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-ink-100 bg-white px-6 py-5">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-ink-400">{account.id}</div>
            <h2 className="mt-0.5 text-lg font-semibold text-ink-900">{account.companyName}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge value={account.status} />
              <StatusBadge value={account.slaHealth} />
              <span className="text-xs text-ink-500">{account.industry} · {account.employeeCount} employees</span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 px-6 py-5">
          {/* Task checklist */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-900">Task Completion Checklist</h3>
              <ProgressBar value={account.completionPct} className="w-32" />
            </div>
            <ul className="divide-y divide-ink-50 rounded-lg border border-ink-100">
              {account.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2.5">
                    {TASK_STATUS_ICON[t.status]}
                    <span className="text-ink-800">{t.taskName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-ink-400">
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 font-medium text-ink-600">{t.owner}</span>
                    <span className="tabular-nums">{formatDate(t.dueDate)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Exceptions */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-ink-900">
              Detected Exceptions{" "}
              {account.exceptions.length > 0 && (
                <span className="ml-1 text-xs font-normal text-ink-400">({account.exceptions.length})</span>
              )}
            </h3>
            {account.exceptions.length === 0 ? (
              <div className="rounded-lg border border-status-good/30 bg-status-good/5 px-3 py-3 text-sm text-status-good">
                No exceptions detected — employee data passed all pre-payroll validation checks.
              </div>
            ) : (
              <ul className="space-y-2">
                {account.exceptions.map((exc, i) => (
                  <li key={i} className="rounded-lg border border-ink-100 px-3 py-2.5">
                    <div className="flex items-start gap-2.5">
                      <AlertOctagon
                        className="mt-0.5 h-4 w-4 shrink-0"
                        style={{ color: severityColor(exc.severity) }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-ink-900">{exc.exceptionType}</span>
                          <StatusBadge value={exc.severity} />
                          <span className="text-xs text-ink-400">{exc.employeeId}</span>
                        </div>
                        <p className="mt-1 text-xs text-ink-500">{exc.recommendedAction}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Gross-to-net card */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-ink-900">Gross-to-Net Payroll Reconciliation</h3>
            <div className="card space-y-2.5 p-4 text-sm">
              <Row label="Expected Gross" value={formatINR(expectedGross)} />
              <Row label="Statutory + Structural Deductions" value={`− ${formatINR(totalDeductions)}`} muted />
              <div className="border-t border-dashed border-ink-200" />
              <Row label="Expected Net Payroll" value={formatINR(expectedNet)} strong />
              <Row label="Processed Net Payroll" value={formatINR(processedNet)} strong />
              <div className="border-t border-ink-100 pt-2.5">
                <Row
                  label="Variance"
                  value={`${variance >= 0 ? "+" : ""}${formatINR(variance)}`}
                  strong
                  tone={variance === 0 ? "good" : Math.abs(variance) <= 100 ? "warning" : "critical"}
                />
              </div>
              {recon && (
                <div className="pt-1">
                  <StatusBadge value={recon.reconciliationStatus} />
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
  tone,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
  tone?: "good" | "warning" | "critical";
}) {
  const toneClass =
    tone === "good" ? "text-status-good" : tone === "warning" ? "text-amber-600" : tone === "critical" ? "text-status-critical" : "text-ink-900";
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-xs text-ink-400" : "text-ink-600"}>{label}</span>
      <span className={`tabular-nums ${strong ? "font-semibold" : ""} ${toneClass}`}>{value}</span>
    </div>
  );
}
