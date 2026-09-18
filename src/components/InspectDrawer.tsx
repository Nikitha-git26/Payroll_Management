"use client";

import { useEffect, useState } from "react";
import { AlertOctagon, Ban, Check, CheckCircle2, Clock, Flag, Loader2, X } from "lucide-react";
import type { EnrichedAccount } from "@/lib/data";
import { formatDate, formatINR } from "@/lib/utils";
import { summarizeExceptions } from "@/lib/payrollEngine";
import StatusBadge from "./StatusBadge";
import ProgressBar from "./ProgressBar";
import { severityColor } from "@/lib/chartTheme";

const TASK_STATUS_ICON: Record<string, React.ReactNode> = {
  Completed: <Check className="h-3.5 w-3.5 text-status-good" />,
  "In Progress": <Loader2 className="h-3.5 w-3.5 text-brand-500" />,
  Pending: <Clock className="h-3.5 w-3.5 text-ink-400" />,
  Blocked: <Ban className="h-3.5 w-3.5 text-status-critical" />,
};

type DisbursementDecision = "approved" | "flagged" | null;

export default function InspectDrawer({
  account,
  onClose,
}: {
  account: EnrichedAccount | null;
  onClose: () => void;
}) {
  const [decision, setDecision] = useState<DisbursementDecision>(null);

  // Reset the (client-only, non-persisted) disbursement decision whenever a
  // different account is opened so it never leaks between inspections.
  useEffect(() => {
    setDecision(null);
  }, [account?.id]);

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
  const exceptionGroups = summarizeExceptions(account.exceptions);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-[1px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Inspect ${account.companyName}`}
        className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-ink-100 bg-white px-6 py-5">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-ink-400">{account.id}</div>
            <h2 className="mt-0.5 text-lg font-semibold text-ink-900">{account.companyName}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                Stage: {account.stage}
              </span>
              <StatusBadge value={account.status} />
              <StatusBadge value={account.slaHealth} />
            </div>
            <div className="mt-1.5 text-xs text-ink-500">
              {account.industry} · {account.employeeCount} employees
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 px-6 py-5">
          {/* Pre-payroll validation check */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-ink-900">
              Pre-Payroll Validation Check{" "}
              {account.exceptions.length > 0 && (
                <span className="ml-1 text-xs font-normal text-ink-400">
                  ({account.exceptions.length} flagged)
                </span>
              )}
            </h3>
            {exceptionGroups.length === 0 ? (
              <div className="rounded-lg border border-status-good/30 bg-status-good/5 px-3 py-3 text-sm text-status-good">
                No exceptions detected — employee data passed all pre-payroll validation checks.
              </div>
            ) : (
              <ul className="space-y-2">
                {exceptionGroups.map((g) => (
                  <li key={g.exceptionType} className="rounded-lg border border-ink-100 px-3 py-2.5">
                    <div className="flex items-start gap-2.5">
                      <AlertOctagon
                        className="mt-0.5 h-4 w-4 shrink-0"
                        style={{ color: severityColor(g.severity) }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-ink-900">
                            {g.exceptionType}: {g.employeeCount} employee{g.employeeCount > 1 ? "s" : ""}
                          </span>
                          <StatusBadge value={g.severity} />
                        </div>
                        <p className="mt-1 text-xs text-ink-500">{g.recommendedAction}</p>
                        <p className="mt-1 text-[11px] tabular-nums text-ink-400">
                          {g.employeeIds.join(", ")}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Reconciliation card */}
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
                  label="Net Variance"
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

              <div className="flex gap-2 border-t border-ink-100 pt-3">
                <button
                  onClick={() => setDecision("approved")}
                  disabled={decision === "approved"}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-status-good px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-default disabled:opacity-60"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {decision === "approved" ? "Approved for Disbursement" : "Approve for Disbursement"}
                </button>
                <button
                  onClick={() => setDecision("flagged")}
                  disabled={decision === "flagged"}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-status-critical/40 bg-white px-3 py-2 text-xs font-semibold text-status-critical transition-colors hover:bg-status-critical/5 disabled:cursor-default disabled:opacity-60"
                >
                  <Flag className="h-3.5 w-3.5" />
                  {decision === "flagged" ? "Discrepancy Flagged" : "Flag Discrepancy"}
                </button>
              </div>
              {decision && (
                <p className="text-[11px] text-ink-400">
                  {decision === "approved"
                    ? "Recorded for this session — payroll ops will proceed to disbursement."
                    : "Recorded for this session — account routed back to payroll ops for review."}
                </p>
              )}
            </div>
          </section>

          {/* Onboarding checklist */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-900">Onboarding Checklist</h3>
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
