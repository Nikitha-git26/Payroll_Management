"use client";

import { useMemo, useState } from "react";
import type { EnrichedAccount } from "@/lib/data";
import Navbar, { type QuickFilter } from "./Navbar";
import KpiRibbon from "./KpiRibbon";
import OperationsTable from "./OperationsTable";
import InspectDrawer from "./InspectDrawer";
import OnboardingFunnelChart from "./charts/OnboardingFunnelChart";
import SlaHorizonChart from "./charts/SlaHorizonChart";
import VarianceBarChart from "./charts/VarianceBarChart";

interface DashboardProps {
  accounts: EnrichedAccount[];
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
  funnelData: { stage: string; count: number; order: number }[];
  slaHorizonData: { bucket: string; count: number }[];
  varianceData: { customerId: string; companyName: string; variance: number }[];
}

export default function Dashboard({ accounts, kpis, funnelData, slaHorizonData, varianceData }: DashboardProps) {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [lastRunLabel, setLastRunLabel] = useState("baseline snapshot");
  const [toast, setToast] = useState<string | null>(null);

  const filteredAccounts = useMemo(() => {
    switch (quickFilter) {
      case "At Risk":
        return accounts.filter((a) => a.status === "At Risk");
      case "SLA Breached":
        return accounts.filter((a) => a.slaHealth === "SLA Breach");
      case "Blocked":
        return accounts.filter((a) => a.status === "Blocked" || a.blockedTaskCount > 0);
      default:
        return accounts;
    }
  }, [accounts, quickFilter]);

  const selectedAccount = selectedId ? accounts.find((a) => a.id === selectedId) ?? null : null;

  const totalExceptions = useMemo(() => accounts.reduce((sum, a) => sum + a.exceptions.length, 0), [accounts]);

  function handleRunValidation() {
    setIsValidating(true);
    setToast(null);
    window.setTimeout(() => {
      setIsValidating(false);
      setLastRunLabel("just now");
      setToast(
        `Validation engine complete — ${totalExceptions} exceptions across ${accounts.length} accounts, ${kpis.varianceFlagged} accounts flagged for payroll variance.`
      );
      window.setTimeout(() => setToast(null), 6000);
    }, 1400);
  }

  return (
    <div className="min-h-screen bg-[var(--page-plane)]">
      <Navbar
        quickFilter={quickFilter}
        onQuickFilterChange={setQuickFilter}
        onRunValidation={handleRunValidation}
        isValidating={isValidating}
        lastRunLabel={lastRunLabel}
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <KpiRibbon kpis={kpis} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card p-4">
            <h3 className="mb-1 text-sm font-semibold text-ink-900">Onboarding Funnel</h3>
            <p className="mb-3 text-xs text-ink-500">Accounts at or past each pipeline stage</p>
            <OnboardingFunnelChart data={funnelData} />
          </div>
          <div className="card p-4">
            <h3 className="mb-1 text-sm font-semibold text-ink-900">SLA Horizon</h3>
            <p className="mb-3 text-xs text-ink-500">Active accounts grouped by closure deadline</p>
            <SlaHorizonChart data={slaHorizonData} />
          </div>
          <div className="card p-4">
            <h3 className="mb-1 text-sm font-semibold text-ink-900">Payroll Variance</h3>
            <p className="mb-3 text-xs text-ink-500">Processed vs. expected net, flagged accounts</p>
            <VarianceBarChart data={varianceData} />
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Operations Workbench</h2>
          <OperationsTable accounts={filteredAccounts} onInspect={setSelectedId} />
        </div>
      </main>

      <InspectDrawer account={selectedAccount} onClose={() => setSelectedId(null)} />

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-lg border border-ink-200 bg-white px-4 py-3 text-sm text-ink-800 shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
