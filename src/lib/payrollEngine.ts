import type {
  Employee,
  ExceptionReport,
  ExceptionSeverity,
  ReconciliationResult,
  SlaHealth,
  Task,
} from "./types";

/**
 * calculateTaskCompletion
 * Percentage (0-100) of tasks in a Completed state for a given account.
 */
export function calculateTaskCompletion(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  return Math.round((completed / tasks.length) * 1000) / 10;
}

/**
 * checkSlaHealth
 * Classifies an account's SLA health from its target closure date and
 * current task completion percentage. Mirrors the logic used in
 * scripts/engine.py (compute_onboarding_progress) so Python and TypeScript
 * produce the same verdict from the same inputs.
 */
export function checkSlaHealth(
  targetDate: string,
  completionPct: number,
  hasBlockedTask = false,
  referenceDate: Date = new Date()
): SlaHealth {
  if (completionPct >= 100) return "Completed";
  if (hasBlockedTask) return "Blocked";

  const target = new Date(targetDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.ceil((target.getTime() - referenceDate.getTime()) / msPerDay);

  if (daysRemaining < 0) return "SLA Breach";
  if (daysRemaining <= 7 && completionPct < 75) return "At Risk";
  if (daysRemaining <= 14 && completionPct < 50) return "At Risk";
  return "On Track";
}

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === "";
}

/**
 * runExceptionDetection
 * Pre-payroll validation pass over an employee roster. Flags missing bank
 * info, invalid bank account formats, missing statutory identifiers,
 * duplicate employee IDs, attendance anomalies, and outlier earnings.
 * Mirrors scripts/engine.py::run_exception_detection.
 */
export function runExceptionDetection(employees: Employee[]): ExceptionReport[] {
  const reports: ExceptionReport[] = [];

  const idCounts = new Map<string, number>();
  for (const emp of employees) {
    idCounts.set(emp.id, (idCounts.get(emp.id) ?? 0) + 1);
  }

  for (const emp of employees) {
    const bank = emp.bankAccount ?? "";

    if (isBlank(bank)) {
      reports.push({
        customerId: emp.customerId,
        employeeId: emp.id,
        exceptionType: "Missing Bank Account",
        severity: "Critical",
        recommendedAction: "Request updated bank mandate from customer before payroll lock.",
      });
    } else if (!/^\d+$/.test(bank) || bank.length < 9) {
      reports.push({
        customerId: emp.customerId,
        employeeId: emp.id,
        exceptionType: "Invalid Bank Account Format",
        severity: "Critical",
        recommendedAction: "Re-verify account number with customer HR/finance POC.",
      });
    }

    if (isBlank(emp.pan)) {
      reports.push({
        customerId: emp.customerId,
        employeeId: emp.id,
        exceptionType: "Missing PAN",
        severity: "High",
        recommendedAction: "Collect PAN copy; required for statutory TDS mapping.",
      });
    } else if (!PAN_REGEX.test(emp.pan)) {
      reports.push({
        customerId: emp.customerId,
        employeeId: emp.id,
        exceptionType: "Malformed PAN",
        severity: "High",
        recommendedAction: "Re-collect PAN; format does not match AAAAA9999A pattern.",
      });
    }

    if (isBlank(emp.uan)) {
      reports.push({
        customerId: emp.customerId,
        employeeId: emp.id,
        exceptionType: "Missing UAN",
        severity: "High",
        recommendedAction: "Collect UAN or trigger new UAN generation via EPFO portal.",
      });
    }

    if (emp.attendanceDays === 0) {
      reports.push({
        customerId: emp.customerId,
        employeeId: emp.id,
        exceptionType: "Zero Attendance Days",
        severity: "Medium",
        recommendedAction: "Confirm attendance feed was received for this employee before payroll run.",
      });
    }

    if (emp.allowance < 0) {
      reports.push({
        customerId: emp.customerId,
        employeeId: emp.id,
        exceptionType: "Negative Allowance Entry",
        severity: "Critical",
        recommendedAction: "Correct salary structure input; negative earnings block payroll run.",
      });
    }

    if (emp.basic > 0 && emp.overtime > 0.5 * emp.basic) {
      reports.push({
        customerId: emp.customerId,
        employeeId: emp.id,
        exceptionType: "Overtime Outlier (>50% of Basic)",
        severity: "Medium",
        recommendedAction: "Escalate to customer for overtime approval before disbursal.",
      });
    }

    if ((idCounts.get(emp.id) ?? 0) > 1) {
      reports.push({
        customerId: emp.customerId,
        employeeId: emp.id,
        exceptionType: "Duplicate Employee ID",
        severity: "Critical",
        recommendedAction: "Reissue a unique employee ID; duplicate IDs will corrupt payroll register keys.",
      });
    }
  }

  return reports;
}

export interface ExceptionSummary {
  exceptionType: string;
  severity: ExceptionSeverity;
  employeeCount: number;
  employeeIds: string[];
  recommendedAction: string;
}

const SEVERITY_RANK: Record<ExceptionSeverity, number> = { Critical: 0, High: 1, Medium: 2 };

/**
 * summarizeExceptions
 * Groups a flat exception list by type (e.g. "Missing PAN: 2 employees")
 * for account-level review, ranked most-severe first. Each employee is
 * counted once per exception type even if flagged by multiple rows.
 */
export function summarizeExceptions(exceptions: ExceptionReport[]): ExceptionSummary[] {
  const groups = new Map<string, ExceptionSummary>();

  for (const exc of exceptions) {
    const existing = groups.get(exc.exceptionType);
    if (existing) {
      if (!existing.employeeIds.includes(exc.employeeId)) {
        existing.employeeIds.push(exc.employeeId);
        existing.employeeCount = existing.employeeIds.length;
      }
    } else {
      groups.set(exc.exceptionType, {
        exceptionType: exc.exceptionType,
        severity: exc.severity,
        employeeCount: 1,
        employeeIds: [exc.employeeId],
        recommendedAction: exc.recommendedAction,
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

/**
 * reconcilePayroll
 * Compares expected vs. processed net pay for a customer and classifies the
 * result. toleranceThreshold (rupees) allows small rounding drift to be
 * treated as "Under Review" rather than a hard "Unreconciled" flag.
 */
export function reconcilePayroll(
  expectedNet: number,
  processedNet: number,
  toleranceThreshold = 100
): ReconciliationResult {
  const variance = processedNet - expectedNet;
  const variancePct = expectedNet === 0 ? 0 : Math.round((variance / expectedNet) * 10000) / 100;
  const absVariance = Math.abs(variance);

  let status: ReconciliationResult["status"];
  if (absVariance === 0) {
    status = "Reconciled";
  } else if (absVariance <= toleranceThreshold) {
    status = "Under Review";
  } else {
    status = "Unreconciled";
  }

  return {
    expectedNet,
    processedNet,
    variance,
    variancePct,
    withinTolerance: absVariance <= toleranceThreshold,
    status,
  };
}
