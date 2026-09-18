"""
PayFlow operations engine.

Ingests the CSV dataset under /data, runs pre-payroll validation checks,
gross-to-net reconciliation, and onboarding progress/SLA classification.
Exports exception_report.csv and reconciliation_report.csv to /data.

This mirrors the logic in src/lib/payrollEngine.ts so the Python/SQL/Excel/
Power BI side of the project and the Next.js dashboard agree on findings.

Usage:
    python scripts/engine.py
"""

from __future__ import annotations

import os
from datetime import date

import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_DIR = os.path.join(ROOT, "data")
REFERENCE_DATE = date(2026, 9, 18)

VARIANCE_TOLERANCE = 100  # rupees; |variance| within this is treated as immaterial


def load_data():
    customers = pd.read_csv(os.path.join(CSV_DIR, "customers.csv"))
    employees = pd.read_csv(os.path.join(CSV_DIR, "employees.csv"), dtype={"pan_number": str, "uan_number": str, "bank_account_no": str})
    tasks = pd.read_csv(os.path.join(CSV_DIR, "onboarding_tasks.csv"))
    payroll_register = pd.read_csv(os.path.join(CSV_DIR, "payroll_register.csv"))
    return customers, employees, tasks, payroll_register


# ---------------------------------------------------------------------------
# 1. Pre-payroll validation / exception detection
# ---------------------------------------------------------------------------

def run_exception_detection(employees: pd.DataFrame) -> pd.DataFrame:
    exceptions = []

    def add(row, exception_type, severity, action):
        exceptions.append(
            {
                "customer_id": row["customer_id"],
                "employee_id": row["employee_id"],
                "exception_type": exception_type,
                "severity": severity,
                "recommended_action": action,
            }
        )

    # Missing / invalid bank details
    for _, row in employees.iterrows():
        bank = str(row["bank_account_no"]) if not pd.isna(row["bank_account_no"]) else ""
        if bank.strip() == "" or bank.lower() == "nan":
            add(row, "Missing Bank Account", "Critical", "Request updated bank mandate from customer before payroll lock.")
        elif not bank.isdigit() or len(bank) < 9:
            add(row, "Invalid Bank Account Format", "Critical", "Re-verify account number with customer HR/finance POC.")

        pan = str(row["pan_number"]) if not pd.isna(row["pan_number"]) else ""
        if pan.strip() == "" or pan.lower() == "nan":
            add(row, "Missing PAN", "High", "Collect PAN copy; required for statutory TDS mapping.")

        uan = str(row["uan_number"]) if not pd.isna(row["uan_number"]) else ""
        if uan.strip() == "" or uan.lower() == "nan":
            add(row, "Missing UAN", "High", "Collect UAN or trigger new UAN generation via EPFO portal.")

        if row["attendance_days"] == 0:
            add(row, "Zero Attendance Days", "Medium", "Confirm attendance feed was received for this employee before payroll run.")

        if row["special_allowance"] < 0:
            add(row, "Negative Allowance Entry", "Critical", "Correct salary structure input; negative earnings block payroll run.")

        if row["basic_pay"] > 0 and row["overtime_pay"] > 0.5 * row["basic_pay"]:
            add(row, "Overtime Outlier (>50% of Basic)", "Medium", "Escalate to customer for overtime approval before disbursal.")

    # Duplicate employee IDs
    dup_ids = employees["employee_id"][employees["employee_id"].duplicated(keep=False)].unique()
    for eid in dup_ids:
        dup_rows = employees[employees["employee_id"] == eid]
        for _, row in dup_rows.iterrows():
            add(row, "Duplicate Employee ID", "Critical", "Reissue a unique employee ID; duplicate IDs will corrupt payroll register keys.")

    return pd.DataFrame(exceptions)


# ---------------------------------------------------------------------------
# 2. Gross-to-net reconciliation
# ---------------------------------------------------------------------------

def run_reconciliation(payroll_register: pd.DataFrame, tolerance: int = VARIANCE_TOLERANCE) -> pd.DataFrame:
    grouped = payroll_register.groupby("customer_id").agg(
        expected_net=("expected_net_pay", "sum"),
        processed_net=("processed_net_pay", "sum"),
    ).reset_index()
    grouped["variance_amount"] = grouped["processed_net"] - grouped["expected_net"]

    def classify(v):
        if abs(v) == 0:
            return "Reconciled"
        if abs(v) <= tolerance:
            return "Under Review"
        return "Unreconciled"

    grouped["reconciliation_status"] = grouped["variance_amount"].apply(classify)
    return grouped.sort_values("customer_id").reset_index(drop=True)


# ---------------------------------------------------------------------------
# 3. Onboarding progress & SLA classification
# ---------------------------------------------------------------------------

def compute_onboarding_progress(customers: pd.DataFrame, tasks: pd.DataFrame) -> pd.DataFrame:
    task_stats = tasks.groupby("customer_id").agg(
        total_tasks=("task_id", "count"),
        completed_tasks=("status", lambda s: (s == "Completed").sum()),
        blocked_tasks=("status", lambda s: (s == "Blocked").sum()),
    ).reset_index()

    merged = customers.merge(task_stats, on="customer_id", how="left")
    merged["completion_percentage"] = (
        merged["completed_tasks"] / merged["total_tasks"] * 100
    ).round(1)

    merged["target_closure_date"] = pd.to_datetime(merged["target_closure_date"])
    merged["days_remaining"] = (merged["target_closure_date"] - pd.Timestamp(REFERENCE_DATE)).dt.days

    def classify_sla(row):
        if row["current_stage"] == "Completed":
            return "Completed"
        if row["blocked_tasks"] > 0:
            return "Blocked"
        if row["days_remaining"] < 0:
            return "SLA Breach"
        if row["days_remaining"] <= 7 and row["completion_percentage"] < 75:
            return "At Risk"
        if row["days_remaining"] <= 14 and row["completion_percentage"] < 50:
            return "At Risk"
        return "On Track"

    merged["computed_status"] = merged.apply(classify_sla, axis=1)
    return merged


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    customers, employees, tasks, payroll_register = load_data()

    exception_report = run_exception_detection(employees)
    reconciliation_report = run_reconciliation(payroll_register)
    progress = compute_onboarding_progress(customers, tasks)

    exception_report.to_csv(os.path.join(CSV_DIR, "exception_report.csv"), index=False)
    reconciliation_report.to_csv(os.path.join(CSV_DIR, "reconciliation_report.csv"), index=False)
    progress[["customer_id", "company_name", "current_stage", "status", "computed_status",
              "completion_percentage", "days_remaining"]].to_csv(
        os.path.join(CSV_DIR, "onboarding_progress.csv"), index=False
    )

    print(f"Exceptions detected: {len(exception_report)}")
    print(exception_report["severity"].value_counts().to_string())
    print()
    print(f"Reconciliation summary: {len(reconciliation_report)} customers")
    print(reconciliation_report["reconciliation_status"].value_counts().to_string())
    print()
    mismatches = (progress["status"] != progress["computed_status"]).sum()
    print(f"Onboarding progress computed for {len(progress)} customers "
          f"({mismatches} differ from seeded status after SLA re-evaluation).")
    print(f"\nReports written to: {CSV_DIR}")


if __name__ == "__main__":
    main()
