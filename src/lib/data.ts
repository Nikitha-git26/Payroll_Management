import customersRaw from "@/data/customers.json";
import employeesRaw from "@/data/employees.json";
import tasksRaw from "@/data/onboarding_tasks.json";
import reconciliationRaw from "@/data/payroll_reconciliation.json";

import { calculateTaskCompletion, checkSlaHealth, runExceptionDetection } from "./payrollEngine";
import type {
  Customer,
  Employee,
  ExceptionReport,
  ReconciliationRecord,
  SlaHealth,
  Task,
} from "./types";
import { ONBOARDING_STAGES } from "./types";

export const customers = customersRaw as Customer[];
export const employees = employeesRaw as Employee[];
export const tasks = tasksRaw as Task[];
export const reconciliation = reconciliationRaw as ReconciliationRecord[];

export const REFERENCE_DATE = new Date("2026-09-18T00:00:00");

export interface EnrichedAccount extends Customer {
  tasks: Task[];
  completionPct: number;
  slaHealth: SlaHealth;
  blockedTaskCount: number;
  recon: ReconciliationRecord | undefined;
  employees: Employee[];
  exceptions: ExceptionReport[];
  daysRemaining: number;
}

let cachedAccounts: EnrichedAccount[] | null = null;
let cachedExceptions: ExceptionReport[] | null = null;

export function getAllExceptions(): ExceptionReport[] {
  if (!cachedExceptions) {
    cachedExceptions = runExceptionDetection(employees);
  }
  return cachedExceptions;
}

export function getEnrichedAccounts(): EnrichedAccount[] {
  if (cachedAccounts) return cachedAccounts;

  const allExceptions = getAllExceptions();
  const exceptionsByCustomer = new Map<string, ExceptionReport[]>();
  for (const exc of allExceptions) {
    const list = exceptionsByCustomer.get(exc.customerId) ?? [];
    list.push(exc);
    exceptionsByCustomer.set(exc.customerId, list);
  }

  const tasksByCustomer = new Map<string, Task[]>();
  for (const t of tasks) {
    const list = tasksByCustomer.get(t.customerId) ?? [];
    list.push(t);
    tasksByCustomer.set(t.customerId, list);
  }

  const employeesByCustomer = new Map<string, Employee[]>();
  for (const e of employees) {
    const list = employeesByCustomer.get(e.customerId) ?? [];
    list.push(e);
    employeesByCustomer.set(e.customerId, list);
  }

  const reconByCustomer = new Map(reconciliation.map((r) => [r.customerId, r]));

  cachedAccounts = customers.map((c) => {
    const custTasks = tasksByCustomer.get(c.id) ?? [];
    const completionPct = calculateTaskCompletion(custTasks);
    const blockedTaskCount = custTasks.filter((t) => t.status === "Blocked").length;
    const slaHealth =
      c.stage === "Completed"
        ? "Completed"
        : checkSlaHealth(c.targetDate, completionPct, blockedTaskCount > 0, REFERENCE_DATE);

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysRemaining = Math.ceil(
      (new Date(c.targetDate).getTime() - REFERENCE_DATE.getTime()) / msPerDay
    );

    return {
      ...c,
      tasks: custTasks,
      completionPct,
      slaHealth,
      blockedTaskCount,
      recon: reconByCustomer.get(c.id),
      employees: employeesByCustomer.get(c.id) ?? [],
      exceptions: exceptionsByCustomer.get(c.id) ?? [],
      daysRemaining,
    };
  });

  return cachedAccounts;
}

export function getKpis() {
  const accounts = getEnrichedAccounts();
  const totalAccounts = accounts.length;
  const onTrack = accounts.filter((a) => a.status === "On Track").length;
  const atRisk = accounts.filter((a) => a.status === "At Risk").length;
  const blocked = accounts.filter((a) => a.status === "Blocked").length;
  const completed = accounts.filter((a) => a.status === "Completed").length;

  const reconciled = reconciliation.filter((r) => r.reconciliationStatus === "Reconciled").length;
  const varianceFlagged = reconciliation.filter((r) => r.reconciliationStatus !== "Reconciled").length;

  const totalGross = reconciliation.reduce((sum, r) => sum + r.expectedGross, 0);
  const totalNetProcessed = reconciliation.reduce((sum, r) => sum + r.processedNet, 0);

  return {
    totalAccounts,
    onTrack,
    atRisk,
    blocked,
    completed,
    reconciled,
    varianceFlagged,
    totalGross,
    totalNetProcessed,
  };
}

export function getFunnelData() {
  const accounts = getEnrichedAccounts();
  return ONBOARDING_STAGES.map((stage, idx) => {
    const reachedOrPast = accounts.filter(
      (a) => ONBOARDING_STAGES.indexOf(a.stage) >= idx
    ).length;
    return { stage, count: reachedOrPast, order: idx };
  });
}

export function getSlaHorizonData() {
  const accounts = getEnrichedAccounts().filter((a) => a.stage !== "Completed");
  const lessThan7 = accounts.filter((a) => a.daysRemaining >= 0 && a.daysRemaining < 7).length;
  const between7and14 = accounts.filter((a) => a.daysRemaining >= 7 && a.daysRemaining <= 14).length;
  const beyond14 = accounts.filter((a) => a.daysRemaining > 14).length;
  const overdue = accounts.filter((a) => a.daysRemaining < 0).length;

  return [
    { bucket: "Overdue", count: overdue },
    { bucket: "< 7 days", count: lessThan7 },
    { bucket: "7–14 days", count: between7and14 },
    { bucket: "> 14 days", count: beyond14 },
  ];
}

export function getVarianceChartData() {
  return reconciliation
    .filter((r) => r.variance !== 0)
    .map((r) => {
      const cust = customers.find((c) => c.id === r.customerId);
      return {
        customerId: r.customerId,
        companyName: cust?.companyName ?? r.customerId,
        variance: r.variance,
      };
    })
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
}
