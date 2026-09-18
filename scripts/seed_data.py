"""
PayFlow synthetic dataset generator.

Generates ONE consistent synthetic operations dataset and writes it in two
shapes from the same generation pass:
  - JSON  -> src/data/            (consumed by the Next.js dashboard)
  - CSV   -> data/                (consumed by scripts/engine.py, sql/, Excel, Power BI)

All figures are fictional. Statutory deduction logic (PF/ESI/PT/TDS) is a
simplified illustrative simulation, not a certified payroll compliance engine.

Usage:
    python scripts/seed_data.py
"""

from __future__ import annotations

import json
import os
from datetime import date, timedelta

import numpy as np
import pandas as pd

SEED = 42
rng = np.random.default_rng(SEED)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_DIR = os.path.join(ROOT, "src", "data")
CSV_DIR = os.path.join(ROOT, "data")
os.makedirs(JSON_DIR, exist_ok=True)
os.makedirs(CSV_DIR, exist_ok=True)

REFERENCE_DATE = date(2026, 9, 18)

# ---------------------------------------------------------------------------
# Reference lists
# ---------------------------------------------------------------------------

STAGES = [
    "Customer Created",
    "Documents",
    "Employee Upload",
    "Validation",
    "Payroll Setup",
    "Customer Review",
    "Approval",
    "Completed",
]

STATUSES = ["On Track", "At Risk", "Blocked", "Completed"]

INDUSTRIES = [
    "IT Services",
    "E-commerce",
    "Manufacturing",
    "Healthcare",
    "Logistics",
    "FinTech",
    "EdTech",
    "Hospitality",
    "Retail",
    "Media & Entertainment",
]

DEPARTMENTS = ["Engineering", "Sales", "Operations", "Finance", "HR", "Support", "Marketing"]

COMPANY_PREFIXES = [
    "Alpha", "Beacon", "Cedar", "Delta", "Everest", "Falcon", "Granite", "Horizon",
    "Indus", "Jupiter", "Kestrel", "Lumen", "Meridian", "Nimbus", "Orbit", "Pioneer",
    "Quartz", "Redwood", "Summit", "Trident", "Union", "Vertex", "Wavelength", "Xenon",
    "Yarrow", "Zenith", "Anchor", "Bridge", "Crescent", "Dune", "Ember", "Fjord",
    "Glade", "Harbor", "Ironclad", "Juniper", "Knox", "Lattice", "Monarch", "Novo",
    "Onyx", "Prism", "Quill", "Ridge", "Sable", "Thistle", "Umber", "Vantage",
    "Willow", "Zephyr",
]
COMPANY_SUFFIXES = ["Services", "Technologies", "Solutions", "Industries", "Labs", "Group", "Systems", "Works"]

FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Krishna",
    "Ishaan", "Rohan", "Ananya", "Diya", "Saanvi", "Aadhya", "Kiara", "Myra",
    "Pari", "Anika", "Navya", "Riya", "Kabir", "Dhruv", "Yash", "Aryan",
    "Ritvik", "Om", "Shaurya", "Advait", "Neha", "Priya", "Sneha", "Pooja",
    "Meera", "Tanvi", "Nikhil", "Karan", "Varun", "Siddharth", "Rahul", "Amit",
]
LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Reddy", "Iyer", "Nair", "Patel", "Singh",
    "Mehta", "Kapoor", "Joshi", "Chatterjee", "Bhatia", "Desai", "Rao", "Menon",
    "Pillai", "Agarwal", "Kulkarni", "Chauhan",
]

TASK_TEMPLATES = [
    ("Company Info & KYC", "Customer Created", "Customer", 2),
    ("Document Collection", "Documents", "Customer", 5),
    ("Employee Data Upload", "Employee Upload", "Customer", 9),
    ("Bank Details Verification", "Validation", "Ops", 13),
    ("PAN / UAN Verification", "Validation", "Ops", 15),
    ("Attendance & Leave Config", "Payroll Setup", "Payroll Ops", 19),
    ("Salary Structure Mapping", "Payroll Setup", "Payroll Ops", 22),
    ("Pre-run Reconciliation", "Customer Review", "Payroll Ops", 27),
    ("Customer Approval Sign-off", "Approval", "Customer", 31),
]

OWNERS_BY_TASK_STATUS_BIAS = {"Ops": 0.15, "Payroll Ops": 0.15, "Customer": 0.20}


def rand_choice(options, p=None, size=None):
    return rng.choice(options, p=p, size=size)


# ---------------------------------------------------------------------------
# 1. Customers
# ---------------------------------------------------------------------------

def generate_customers(n: int = 50) -> pd.DataFrame:
    used_names = set()
    rows = []
    stage_weights = [0.06, 0.08, 0.10, 0.12, 0.14, 0.12, 0.10, 0.28]  # skew toward Completed

    for i in range(1, n + 1):
        cid = f"C{i:03d}"
        while True:
            name = f"{rand_choice(COMPANY_PREFIXES)} {rand_choice(COMPANY_SUFFIXES)}"
            if name not in used_names:
                used_names.add(name)
                break
        industry = rand_choice(INDUSTRIES)
        employee_count = int(rng.integers(4, 41))
        start_offset = int(rng.integers(10, 75))
        onboarding_start = REFERENCE_DATE - timedelta(days=start_offset)
        cycle_len = int(rng.integers(30, 70))
        target_closure = onboarding_start + timedelta(days=cycle_len)

        stage = rand_choice(STAGES, p=stage_weights)
        stage_idx = STAGES.index(stage)

        if stage == "Completed":
            status = "Completed"
        else:
            days_to_target = (target_closure - REFERENCE_DATE).days
            progress_fraction = stage_idx / (len(STAGES) - 1)
            blocked_roll = rng.random()
            if blocked_roll < 0.12:
                status = "Blocked"
            elif days_to_target < 0 or (days_to_target < 7 and progress_fraction < 0.6):
                status = "At Risk"
            elif days_to_target < 14 and progress_fraction < 0.45:
                status = "At Risk"
            else:
                status = "On Track"

        rows.append(
            {
                "customer_id": cid,
                "company_name": name,
                "industry": industry,
                "employee_count": employee_count,
                "onboarding_start_date": onboarding_start.isoformat(),
                "target_closure_date": target_closure.isoformat(),
                "current_stage": stage,
                "status": status,
            }
        )
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# 2. Employees (with intentional defects)
# ---------------------------------------------------------------------------

def generate_employees(customers: pd.DataFrame, n: int = 300) -> pd.DataFrame:
    rows = []
    cust_ids = customers["customer_id"].tolist()
    # weight employee count roughly by each customer's declared employee_count
    weights = customers["employee_count"].to_numpy(dtype=float)
    weights = weights / weights.sum()

    # Guarantee every customer gets at least one employee, then fill the
    # remainder by weighted random draw so headcount still tracks employee_count.
    assigned_customers = np.empty(n, dtype=object)
    assigned_customers[: len(cust_ids)] = cust_ids
    remaining = n - len(cust_ids)
    if remaining > 0:
        assigned_customers[len(cust_ids):] = rng.choice(cust_ids, p=weights, size=remaining)
    rng.shuffle(assigned_customers)

    for i in range(1, n + 1):
        eid = f"E{i:03d}"
        cid = assigned_customers[i - 1]
        first = rand_choice(FIRST_NAMES)
        last = rand_choice(LAST_NAMES)
        dept = rand_choice(DEPARTMENTS)

        basic = int(rng.integers(15000, 90000))
        hra = round(basic * 0.4)
        allowance = int(rng.integers(1500, 12000))
        overtime = int(rng.integers(0, int(basic * 0.08)))
        bonus = int(rng.integers(0, 6000)) if rng.random() < 0.35 else 0

        bank_account = f"{rng.integers(10**10, 10**12 - 1)}"
        pan = f"{''.join(rng.choice(list('ABCDEFGHIJKLMNOPQRSTUVWXYZ'), 5))}{rng.integers(1000,9999)}{rng.choice(list('ABCDEFGHIJKLMNOPQRSTUVWXYZ'))}"
        uan = f"{rng.integers(10**11, 10**12 - 1)}"

        attendance_days = int(rng.integers(24, 31))
        lop_days = int(rng.integers(0, 3)) if rng.random() < 0.25 else 0

        rows.append(
            {
                "employee_id": eid,
                "customer_id": cid,
                "name": f"{first} {last}",
                "department": dept,
                "basic_pay": basic,
                "hra": hra,
                "special_allowance": allowance,
                "overtime_pay": overtime,
                "bonus": bonus,
                "bank_account_no": bank_account,
                "pan_number": pan,
                "uan_number": uan,
                "attendance_days": attendance_days,
                "lop_days": lop_days,
            }
        )

    df = pd.DataFrame(rows)

    # -----------------------------------------------------------------
    # Inject ~32 intentional operational defects across disjoint rows
    # -----------------------------------------------------------------
    n_rows = len(df)
    all_idx = rng.permutation(n_rows)
    cursor = 0

    def take(k):
        nonlocal cursor
        sel = all_idx[cursor: cursor + k]
        cursor += k
        return sel

    missing_bank_idx = take(6)
    df.loc[missing_bank_idx, "bank_account_no"] = ""

    invalid_bank_idx = take(5)
    df.loc[invalid_bank_idx, "bank_account_no"] = "INVALID00"

    missing_pan_idx = take(6)
    df.loc[missing_pan_idx, "pan_number"] = ""

    missing_uan_idx = take(5)
    df.loc[missing_uan_idx, "uan_number"] = ""

    zero_attendance_idx = take(4)
    df.loc[zero_attendance_idx, "attendance_days"] = 0
    df.loc[zero_attendance_idx, "lop_days"] = 0

    negative_allowance_idx = take(4)
    df.loc[negative_allowance_idx, "special_allowance"] = -1 * df.loc[negative_allowance_idx, "special_allowance"].abs()

    overtime_outlier_idx = take(4)
    df.loc[overtime_outlier_idx, "overtime_pay"] = (df.loc[overtime_outlier_idx, "basic_pay"] * 0.65).round().astype(int)

    # Duplicate employee_id defect: clone 3 rows' IDs onto 3 other rows
    dup_source_idx = take(3)
    dup_target_idx = take(3)
    df.loc[dup_target_idx, "employee_id"] = df.loc[dup_source_idx, "employee_id"].to_numpy()

    return df


# ---------------------------------------------------------------------------
# 3. Onboarding tasks
# ---------------------------------------------------------------------------

def generate_tasks(customers: pd.DataFrame) -> pd.DataFrame:
    rows = []
    task_counter = 1

    for _, cust in customers.iterrows():
        stage_idx = STAGES.index(cust["current_stage"])
        onboarding_start = date.fromisoformat(cust["onboarding_start_date"])
        status = cust["status"]

        for t_idx, (task_name, stage_at, default_owner, day_offset) in enumerate(TASK_TEMPLATES):
            tid = f"T{task_counter:04d}"
            task_counter += 1
            template_stage_idx = STAGES.index(stage_at)
            due_date = onboarding_start + timedelta(days=day_offset)

            if template_stage_idx < stage_idx or cust["current_stage"] == "Completed":
                task_status = "Completed"
            elif template_stage_idx == stage_idx:
                if status == "Blocked" and rng.random() < 0.6:
                    task_status = "Blocked"
                else:
                    task_status = rand_choice(["In Progress", "Completed", "Pending"], p=[0.45, 0.25, 0.30])
            else:
                task_status = "Pending"
                if status == "Blocked" and template_stage_idx == stage_idx + 1 and rng.random() < 0.25:
                    task_status = "Blocked"

            owner = default_owner

            rows.append(
                {
                    "task_id": tid,
                    "customer_id": cust["customer_id"],
                    "task_name": task_name,
                    "owner": owner,
                    "due_date": due_date.isoformat(),
                    "status": task_status,
                }
            )

    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# 4. Payroll register (employee level) + reconciliation summary (customer level)
# ---------------------------------------------------------------------------

def generate_payroll(employees: pd.DataFrame, customers: pd.DataFrame):
    rows = []

    # Pick 7 customers to carry deliberate, noticeable reconciliation variance
    variance_customers = set(rng.choice(customers["customer_id"].tolist(), size=7, replace=False))
    # Each flagged customer gets one of a few "processing glitch" archetypes
    glitch_types = {}
    archetypes = ["missed_bonus", "double_deduction", "rounding_drift", "unapproved_overtime_payout"]
    for i, cid in enumerate(variance_customers):
        glitch_types[cid] = archetypes[i % len(archetypes)]

    for _, emp in employees.iterrows():
        basic = max(emp["basic_pay"], 0)
        hra = emp["hra"]
        allowance = emp["special_allowance"]
        overtime = emp["overtime_pay"]
        bonus = emp["bonus"]

        gross_earnings = basic + hra + max(allowance, 0) + overtime + bonus

        attendance_days = emp["attendance_days"] if emp["attendance_days"] > 0 else 30
        lop_days = emp["lop_days"]
        per_day_basic = basic / 30 if basic > 0 else 0
        lop_deduction = round(per_day_basic * lop_days)

        pf_deduction = round(basic * 0.12)
        esi_deduction = round(gross_earnings * 0.0075) if gross_earnings <= 21000 else 0
        pt_deduction = 200 if gross_earnings > 15000 else 0
        annual_gross = gross_earnings * 12
        tds_deduction = round(gross_earnings * 0.03) if annual_gross > 1_200_000 else 0

        expected_net_pay = gross_earnings - lop_deduction - pf_deduction - esi_deduction - pt_deduction - tds_deduction
        expected_net_pay = max(expected_net_pay, 0)

        processed_net_pay = expected_net_pay
        cid = emp["customer_id"]
        if cid in glitch_types:
            glitch = glitch_types[cid]
            if glitch == "missed_bonus":
                processed_net_pay = expected_net_pay - bonus if bonus > 0 else expected_net_pay - int(rng.integers(500, 1500))
            elif glitch == "double_deduction":
                processed_net_pay = expected_net_pay - pf_deduction
            elif glitch == "rounding_drift":
                processed_net_pay = expected_net_pay - int(rng.integers(20, 90))
            elif glitch == "unapproved_overtime_payout":
                processed_net_pay = expected_net_pay + overtime

        variance = processed_net_pay - expected_net_pay

        rows.append(
            {
                "employee_id": emp["employee_id"],
                "customer_id": cid,
                "gross_earnings": int(gross_earnings),
                "expected_net_pay": int(expected_net_pay),
                "processed_net_pay": int(processed_net_pay),
                "pf_deduction": int(pf_deduction),
                "esi_deduction": int(esi_deduction),
                "pt_deduction": int(pt_deduction),
                "tds_deduction": int(tds_deduction),
                "variance": int(variance),
            }
        )

    payroll_register = pd.DataFrame(rows)

    # Customer-level reconciliation summary
    summary_rows = []
    for cid, grp in payroll_register.groupby("customer_id"):
        expected_gross = int((grp["gross_earnings"]).sum())
        expected_net = int(grp["expected_net_pay"].sum())
        processed_net = int(grp["processed_net_pay"].sum())
        variance = processed_net - expected_net

        if abs(variance) == 0:
            recon_status = "Reconciled"
        elif abs(variance) <= 500:
            recon_status = "Under Review"
        else:
            recon_status = "Unreconciled"

        summary_rows.append(
            {
                "customer_id": cid,
                "expected_gross": expected_gross,
                "expected_net": expected_net,
                "processed_net": processed_net,
                "variance": int(variance),
                "reconciliation_status": recon_status,
            }
        )

    reconciliation = pd.DataFrame(summary_rows).sort_values("customer_id").reset_index(drop=True)
    return payroll_register, reconciliation


# ---------------------------------------------------------------------------
# Writers
# ---------------------------------------------------------------------------

def write_csvs(customers, employees, tasks, payroll_register, reconciliation):
    customers.to_csv(os.path.join(CSV_DIR, "customers.csv"), index=False)
    employees.to_csv(os.path.join(CSV_DIR, "employees.csv"), index=False)
    tasks.to_csv(os.path.join(CSV_DIR, "onboarding_tasks.csv"), index=False)
    payroll_register.to_csv(os.path.join(CSV_DIR, "payroll_register.csv"), index=False)
    reconciliation.to_csv(os.path.join(CSV_DIR, "payroll_reconciliation.csv"), index=False)


def write_json(customers, employees, tasks, reconciliation):
    customers_json = [
        {
            "id": r.customer_id,
            "companyName": r.company_name,
            "industry": r.industry,
            "employeeCount": int(r.employee_count),
            "onboardingDate": r.onboarding_start_date,
            "targetDate": r.target_closure_date,
            "stage": r.current_stage,
            "status": r.status,
        }
        for r in customers.itertuples()
    ]

    employees_json = [
        {
            "id": r.employee_id,
            "customerId": r.customer_id,
            "name": r.name,
            "department": r.department,
            "basic": int(r.basic_pay),
            "hra": int(r.hra),
            "allowance": int(r.special_allowance),
            "overtime": int(r.overtime_pay),
            "bonus": int(r.bonus),
            "bankAccount": r.bank_account_no,
            "pan": r.pan_number,
            "uan": r.uan_number,
            "lopDays": int(r.lop_days),
            "attendanceDays": int(r.attendance_days),
        }
        for r in employees.itertuples()
    ]

    tasks_json = [
        {
            "id": r.task_id,
            "customerId": r.customer_id,
            "taskName": r.task_name,
            "owner": r.owner,
            "dueDate": r.due_date,
            "status": r.status,
        }
        for r in tasks.itertuples()
    ]

    reconciliation_json = [
        {
            "customerId": r.customer_id,
            "expectedGross": int(r.expected_gross),
            "expectedNet": int(r.expected_net),
            "processedNet": int(r.processed_net),
            "variance": int(r.variance),
            "reconciliationStatus": r.reconciliation_status,
        }
        for r in reconciliation.itertuples()
    ]

    with open(os.path.join(JSON_DIR, "customers.json"), "w") as f:
        json.dump(customers_json, f, indent=2)
    with open(os.path.join(JSON_DIR, "employees.json"), "w") as f:
        json.dump(employees_json, f, indent=2)
    with open(os.path.join(JSON_DIR, "onboarding_tasks.json"), "w") as f:
        json.dump(tasks_json, f, indent=2)
    with open(os.path.join(JSON_DIR, "payroll_reconciliation.json"), "w") as f:
        json.dump(reconciliation_json, f, indent=2)


def main():
    customers = generate_customers(50)
    employees = generate_employees(customers, 300)
    tasks = generate_tasks(customers)
    payroll_register, reconciliation = generate_payroll(employees, customers)

    write_csvs(customers, employees, tasks, payroll_register, reconciliation)
    write_json(customers, employees, tasks, reconciliation)

    print(f"customers:      {len(customers)} rows")
    print(f"employees:      {len(employees)} rows")
    print(f"tasks:          {len(tasks)} rows")
    print(f"payroll_reg:    {len(payroll_register)} rows")
    print(f"reconciliation: {len(reconciliation)} rows "
          f"({(reconciliation['reconciliation_status'] != 'Reconciled').sum()} flagged)")
    print(f"\nJSON written to: {JSON_DIR}")
    print(f"CSV written to:  {CSV_DIR}")


if __name__ == "__main__":
    main()
