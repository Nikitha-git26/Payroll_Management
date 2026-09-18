"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import type { EnrichedAccount } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import StatusBadge from "./StatusBadge";
import ProgressBar from "./ProgressBar";

interface OperationsTableProps {
  accounts: EnrichedAccount[];
  onInspect: (id: string) => void;
}

type SortKey = "id" | "daysRemaining" | "completionPct";

export default function OperationsTable({ accounts, onInspect }: OperationsTableProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("daysRemaining");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = accounts;
    if (q) {
      list = list.filter(
        (a) =>
          a.id.toLowerCase().includes(q) ||
          a.companyName.toLowerCase().includes(q) ||
          a.industry.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortKey === "id") return a.id.localeCompare(b.id);
      if (sortKey === "completionPct") return b.completionPct - a.completionPct;
      return a.daysRemaining - b.daysRemaining;
    });
  }, [accounts, query, sortKey]);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-ink-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company, ID, industry…"
            className="w-full rounded-lg border border-ink-200 bg-ink-50/50 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-500">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Sort by</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-ink-200 bg-white px-2 py-1 text-xs font-medium text-ink-700 outline-none"
          >
            <option value="daysRemaining">Days to closure</option>
            <option value="completionPct">Task completion</option>
            <option value="id">Account ID</option>
          </select>
          <span className="ml-2 tabular-nums text-ink-400">{filtered.length} of {accounts.length}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-500">
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Industry</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Task Completion</th>
              <th className="px-4 py-3 font-medium">SLA Health</th>
              <th className="px-4 py-3 font-medium">Reconciliation</th>
              <th className="px-4 py-3 font-medium">Target Closure</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.id}
                onClick={() => onInspect(a.id)}
                className="cursor-pointer border-b border-ink-50 last:border-0 hover:bg-ink-50/60"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-ink-900">{a.companyName}</div>
                  <div className="text-xs text-ink-400">{a.id} · {a.employeeCount} employees</div>
                </td>
                <td className="px-4 py-3 text-ink-600">{a.industry}</td>
                <td className="px-4 py-3 text-ink-600">{a.stage}</td>
                <td className="px-4 py-3">
                  <StatusBadge value={a.status} />
                </td>
                <td className="px-4 py-3">
                  <ProgressBar value={a.completionPct} className="min-w-[120px]" />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge value={a.slaHealth} />
                </td>
                <td className="px-4 py-3">
                  {a.recon ? <StatusBadge value={a.recon.reconciliationStatus} /> : <span className="text-ink-300">—</span>}
                </td>
                <td className="px-4 py-3 tabular-nums text-ink-600">
                  {formatDate(a.targetDate)}
                  {a.daysRemaining < 0 && a.stage !== "Completed" && (
                    <span className="ml-1.5 text-xs font-medium text-status-critical">
                      ({Math.abs(a.daysRemaining)}d overdue)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspect(a.id);
                    }}
                    className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
                  >
                    Inspect
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-ink-400">
                  No accounts match this search / filter combination.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
