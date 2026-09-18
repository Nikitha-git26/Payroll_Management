# Power BI Dashboard — DAX Measures & Wireframe

Source tables: import `data/customers.csv`, `data/employees.csv`,
`data/onboarding_tasks.csv`, `data/payroll_register.csv`,
`data/payroll_reconciliation.csv`, `data/exception_report.csv` into Power BI
Desktop (Get Data → Text/CSV), or point Power Query at `Payroll_Operations_Tracker.xlsx`.
Relationships: `customers[customer_id]` (1) → `employees[customer_id]`,
`onboarding_tasks[customer_id]`, `payroll_register[customer_id]`,
`payroll_reconciliation[customer_id]`, `exception_report[customer_id]` (many).

## Core DAX measures

```dax
Task Completion % =
DIVIDE(
    CALCULATE(COUNTROWS(onboarding_tasks), onboarding_tasks[status] = "Completed"),
    COUNTROWS(onboarding_tasks)
)
```

```dax
At-Risk Customer Count =
CALCULATE(
    DISTINCTCOUNT(customers[customer_id]),
    customers[status] = "At Risk"
)
```

```dax
Total Payroll Variance =
SUMX(
    payroll_reconciliation,
    payroll_reconciliation[processed_net] - payroll_reconciliation[expected_net]
)
```

```dax
SLA Breach Rate % =
VAR ActiveAccounts =
    CALCULATE(DISTINCTCOUNT(customers[customer_id]), customers[current_stage] <> "Completed")
VAR BreachedAccounts =
    CALCULATE(
        DISTINCTCOUNT(customers[customer_id]),
        customers[current_stage] <> "Completed",
        customers[target_closure_date] < TODAY()
    )
RETURN
    DIVIDE(BreachedAccounts, ActiveAccounts)
```

Supporting measures used by the visuals below:

```dax
Reconciled Accounts =
CALCULATE(
    DISTINCTCOUNT(payroll_reconciliation[customer_id]),
    payroll_reconciliation[reconciliation_status] = "Reconciled"
)

Critical Exceptions =
CALCULATE(COUNTROWS(exception_report), exception_report[severity] = "Critical")

Days To Closure =
DATEDIFF(TODAY(), MIN(customers[target_closure_date]), DAY)

Closures Next 7 Days =
CALCULATE(
    DISTINCTCOUNT(customers[customer_id]),
    customers[current_stage] <> "Completed",
    customers[target_closure_date] >= TODAY(),
    customers[target_closure_date] <= TODAY() + 7
)
```

## 1-page dashboard layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  PayFlow · Payroll Operations                          [Industry ▾] [Stage ▾] │
├──────────────────────────────────────────────────────────────────────────┤
│  KPI RIBBON                                                                │
│  [Total Accounts: 50] [Task Completion %: 68%] [At-Risk: 14]              │
│  [SLA Breach Rate: 22%] [Total Variance: ₹-4.8K]                          │
├───────────────────────────┬───────────────────────┬────────────────────┤
│  Visual 1                 │  Visual 2              │  Visual 3           │
│  Onboarding Funnel         │  Account Health         │  Exceptions by      │
│  (stage drop-off, funnel   │  Distribution           │  Category           │
│  chart, 8 stages)           │  (donut: On Track /    │  (bar: Missing PAN, │
│                             │  At Risk / Blocked /   │  Missing Bank,      │
│                             │  Completed)             │  Duplicate ID, …)   │
├───────────────────────────┴───────────────────────┴────────────────────┤
│  Visual 4 — Expected Closures Matrix                                     │
│  Rows: Customer   Columns: Next 7 / Next 14 / Next 30 days               │
│  Values: count of accounts whose target_closure_date falls in each band  │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Visual 1 (Funnel):** `customers[current_stage]` on category axis, ordered by
  the pipeline sequence via a `Stage Order` calculated column; count of
  `customer_id` at-or-past each stage.
- **Visual 2 (Donut):** `customers[status]` as legend, count of `customer_id`
  as values.
- **Visual 3 (Bar):** `exception_report[exception_type]` as category, count of
  rows as value, colored by `severity`.
- **Visual 4 (Matrix):** conditional formatting (icon set) on the day-band
  columns to flag <7-day closures in red.

## Notes

- All PF/ESI/PT/TDS figures feeding `Total Payroll Variance` are simplified
  illustrative simulations (see root [README.md](../README.md) disclaimer) —
  not certified statutory calculations.
- `.pbix` is a binary Power BI Desktop file and isn't produced by this
  text-based pipeline; the measures and layout above are written so anyone
  with Power BI Desktop can reproduce the dashboard from the CSVs in `/data`
  in under 10 minutes.
