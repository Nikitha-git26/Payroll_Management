export type OnboardingStage =
  | "Customer Created"
  | "Documents"
  | "Employee Upload"
  | "Validation"
  | "Payroll Setup"
  | "Customer Review"
  | "Approval"
  | "Completed";

export const ONBOARDING_STAGES: OnboardingStage[] = [
  "Customer Created",
  "Documents",
  "Employee Upload",
  "Validation",
  "Payroll Setup",
  "Customer Review",
  "Approval",
  "Completed",
];

export type AccountStatus = "On Track" | "At Risk" | "Blocked" | "Completed";

export type SlaHealth = "On Track" | "At Risk" | "Blocked" | "SLA Breach" | "Completed";

export type TaskOwner = "Ops" | "Payroll Ops" | "Customer";

export type TaskStatus = "Completed" | "In Progress" | "Pending" | "Blocked";

export type ReconciliationStatus = "Reconciled" | "Unreconciled" | "Under Review";

export type ExceptionSeverity = "Critical" | "High" | "Medium";

export interface Customer {
  id: string;
  companyName: string;
  industry: string;
  employeeCount: number;
  onboardingDate: string;
  targetDate: string;
  stage: OnboardingStage;
  status: AccountStatus;
}

export interface Employee {
  id: string;
  customerId: string;
  name: string;
  department: string;
  basic: number;
  hra: number;
  allowance: number;
  overtime: number;
  bonus: number;
  bankAccount: string;
  pan: string;
  uan: string;
  lopDays: number;
  attendanceDays: number;
}

export interface Task {
  id: string;
  customerId: string;
  taskName: string;
  owner: TaskOwner;
  dueDate: string;
  status: TaskStatus;
}

export interface ReconciliationRecord {
  customerId: string;
  expectedGross: number;
  expectedNet: number;
  processedNet: number;
  variance: number;
  reconciliationStatus: ReconciliationStatus;
}

export interface ExceptionReport {
  customerId: string;
  employeeId: string;
  exceptionType: string;
  severity: ExceptionSeverity;
  recommendedAction: string;
}

export interface ReconciliationResult {
  expectedNet: number;
  processedNet: number;
  variance: number;
  variancePct: number;
  withinTolerance: boolean;
  status: ReconciliationStatus;
}
