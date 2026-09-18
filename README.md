# PayFlow — Payroll Onboarding & Reconciliation Operations Dashboard

[![CI](https://github.com/Nikitha-git26/Payroll_Management/actions/workflows/ci.yml/badge.svg)](https://github.com/Nikitha-git26/Payroll_Management/actions/workflows/ci.yml)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Nikitha-git26/Payroll_Management)
![Next.js 14](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Python](https://img.shields.io/badge/Python-3.11%2B-yellow)

> **Live demo:** add your Vercel URL here after deploying (see [Deployment](#deployment)).

A B2B payroll operations dashboard that models how a payroll onboarding team
tracks customer accounts from first contact through payroll go-live — SLA
monitoring, pre-payroll data validation, exception detection, and
gross-to-net reconciliation — built end-to-end across four tools an
operations analyst actually uses: **Python, SQL, Excel, and a live web
dashboard** (with Power BI measures documented for a BI layer on top).

---

## Project overview

PayFlow sits at the intersection of three things:

- **Full-stack web development** — Next.js 14 App Router, TypeScript,
  Tailwind CSS, Recharts, deployed serverlessly on Vercel.
- **Data analytics engineering** — a Python/pandas synthetic data generator,
  a pre-payroll validation + reconciliation engine, and an ANSI SQL analytics
  suite, all operating on the *same* dataset.
- **B2B SaaS payroll operations domain knowledge** — an 8-stage onboarding
  pipeline, SLA classification, exception severity triage, and gross-to-net
  variance reconciliation, modeled the way a payroll operations team (e.g.
  RazorpayX Payroll) would actually run it.

The same 50-account, 300-employee synthetic dataset (seeded, reproducible)
feeds every layer — the dashboard, the SQL queries, the Excel workbook, and
the Power BI measures all agree, because they're derived from one generation
pass (`scripts/seed_data.py`).

## Architecture

```
 ┌──────────────────┐     ┌───────────────────┐     ┌─────────────────────┐     ┌───────────────────┐
 │     INGESTION     │     │     VALIDATION      │     │    RECONCILIATION     │     │      DASHBOARD       │
 │                    │     │                      │     │                        │     │                       │
 │ scripts/seed_data  │ ──▶ │ scripts/engine.py    │ ──▶ │ gross-to-net variance  │ ──▶ │ Next.js 14 App Router  │
 │ .py (pandas,       │     │ src/lib/payrollEngine│     │ vs. tolerance, per     │     │ KPI ribbon · funnel /   │
 │ seed=42) generates  │     │ .ts — missing PAN/UAN,│     │ customer & department  │     │ SLA / variance charts  │
 │ customers.json/csv, │     │ invalid bank, dup IDs,│     │ (sql/analytics_queries│     │ · operations table ·   │
 │ employees, tasks,   │     │ attendance/overtime   │     │ .sql, 06_Reconciliation│     │ inspect drawer          │
 │ payroll_register    │     │ outliers → severity   │     │ _Summary tab)          │     │                        │
 └──────────────────┘     └───────────────────┘     └─────────────────────┘     └───────────────────┘
          │                                                                                    ▲
          └───────────────────────────────► data/*.csv ── SQL / Excel / Power BI ──────────────┘
```

Python, TypeScript, and SQL each implement the **same** exception-detection
and reconciliation rules independently, against the same data, so results
agree across every tool — the point of doing this three times is that in a
real ops org, your warehouse, your ops tool, and your reconciliation
spreadsheet have to agree too.

## Key operational capabilities

- **Exception engine** — flags missing/invalid bank accounts, missing PAN/UAN,
  duplicate employee IDs, zero attendance days, negative allowance entries,
  and overtime outliers (>50% of basic), each with a severity
  (Critical/High/Medium) and a recommended action.
- **SLA monitoring** — every account is classified On Track / At Risk /
  Blocked / SLA Breach / Completed from its target closure date, task
  completion %, and whether any task is currently blocked — recomputed live,
  not just read from seed data.
- **Gross-to-net reconciliation** — expected vs. processed net payroll,
  compared per customer with a configurable tolerance threshold, flagging
  accounts as Reconciled / Under Review / Unreconciled.
- **Cross-tool consistency** — the same logic lives in
  [`src/lib/payrollEngine.ts`](src/lib/payrollEngine.ts) (dashboard),
  [`scripts/engine.py`](scripts/engine.py) (Python/Excel/Power BI side), and
  [`sql/analytics_queries.sql`](sql/analytics_queries.sql) (warehouse
  analyst view).

## Deep-dive case study: resolving an onboarding blocker (Customer C033, Umber Systems)

*(Dataset is regenerated with a fixed seed — see [Compliance & scope](#compliance--scope);
figures below are the actual output of this run's `scripts/engine.py`.)*

**Detection.** Customer C033 (Umber Systems, Healthcare, 7 employees) sat in
`status: Blocked` at the `Employee Upload` stage. Running the validation
engine surfaced a **Critical** exception: `employee_id E178` was duplicated
— and not just within one account. The same ID had been issued to an
employee at a *different* customer, C048 (Lattice Industries). Two onboarding
tasks were stuck as a direct result: `Employee Data Upload` (owned by the
customer) and `Bank Details Verification` (owned by Ops) — both blocked,
which is exactly what triggered the account's `Blocked` status in the first
place.

**Why it mattered.** `payroll_register` keys on `employee_id`. A duplicate ID
across two tenants isn't a cosmetic data-quality issue — if payroll ran
before it was caught, both employees' gross-to-net calculations would key off
the same register row, corrupting reconciliation for two customers at once
instead of one.

**Operational action taken.**
1. Ops reissued a unique `employee_id` to the colliding row rather than
   editing payroll data directly, so the audit trail of the original upload
   stays intact.
2. The customer was asked to re-confirm the affected employee's record as
   part of `Employee Data Upload`, since a silently-corrected ID without
   customer sign-off would violate the "customer owns their data" principle
   of the pipeline.
3. `Bank Details Verification` was re-run against the corrected roster.

**Closure outcome.** Both tasks moved from Blocked → Completed, the account's
computed SLA status cleared from `Blocked`, and it was free to progress to
`Validation`. Because the reconciliation engine runs independently of task
status, C033's gross-to-net check was already `Reconciled` (₹0 variance) once
proper employee records were in place — confirming the blocker was a data-
integrity issue, not a payroll-math issue, exactly the kind of triage
distinction an ops analyst has to make quickly.

*(For a second worked example — an account with a genuine payroll variance,
not just a blocked task — see Customer C005 / C006 in `data/exception_report.csv`
and `data/payroll_reconciliation.csv`, both flagged `Unreconciled`.)*

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts, lucide-react |
| Core logic | TypeScript (`src/lib/payrollEngine.ts`), mirrored in Python |
| Data generation & engine | Python 3, pandas, numpy (`scripts/seed_data.py`, `scripts/engine.py`) |
| Analytics warehouse layer | ANSI SQL (`sql/analytics_queries.sql`) |
| Spreadsheet layer | Excel via openpyxl (`scripts/build_excel_workbook.py` → `Payroll_Operations_Tracker.xlsx`) |
| BI layer | Power BI DAX measures + layout (`docs/POWERBI_DASHBOARD.md`) |
| Deployment | Vercel (see below), GitHub Actions CI |

## Project structure

```
Payroll_Management/
├── scripts/
│   ├── seed_data.py              # synthetic dataset generator (pandas, seed=42)
│   ├── engine.py                 # Python validation + reconciliation engine
│   └── build_excel_workbook.py   # builds Payroll_Operations_Tracker.xlsx
├── data/                         # generated CSVs (customers, employees, tasks,
│                                  #   payroll_register, reconciliation, exceptions)
├── sql/analytics_queries.sql     # DDL + SLA risk / variance / exception queries
├── src/
│   ├── app/                      # Next.js App Router pages
│   ├── components/               # dashboard UI (table, charts, drawer, navbar)
│   ├── lib/                      # payrollEngine.ts, data.ts, chartTheme.ts
│   └── data/                     # generated JSON (dashboard reads these)
├── docs/
│   ├── EXCEL_MODEL.md            # tab-by-tab formula reference
│   ├── POWERBI_DASHBOARD.md      # DAX measures + wireframe
│   └── INTERVIEW_DEFENSE.md      # talking points
└── Payroll_Operations_Tracker.xlsx
```

## Getting started

```bash
# 1. Generate the dataset (JSON for the dashboard, CSV for Python/SQL/Excel)
python -m pip install pandas numpy openpyxl
python scripts/seed_data.py

# 2. Run the validation + reconciliation engine (writes data/exception_report.csv etc.)
python scripts/engine.py

# 3. (Optional) Rebuild the Excel workbook
python scripts/build_excel_workbook.py

# 4. Install and run the dashboard
npm install
npm run dev   # http://localhost:3000
```

## Deployment

```bash
git init
git add .
git commit -m "Initial commit: PayFlow payroll operations dashboard"
git branch -M main
git remote add origin https://github.com/Nikitha-git26/Payroll_Management.git
git push -u origin main
```

Then, on [vercel.com](https://vercel.com):
1. **Add New Project** → import `Nikitha-git26/Payroll_Management`.
2. Framework preset auto-detects **Next.js** — no config changes needed.
3. **Deploy.** Build takes ~1 minute; you'll have a live URL immediately after.

No environment variables or external services are required — all data is
static JSON committed to the repo (`src/data/*.json`), so the dashboard is
fully server-rendered/static and deploys cleanly on Vercel's free tier.

## Compliance & scope disclaimer

- **All data is synthetic.** 50 customer accounts and 300 employee records
  are generated by `scripts/seed_data.py` with a fixed random seed
  (`numpy.random.default_rng(42)`) — no real company, employee, or payroll
  data is used anywhere in this project.
- **Statutory deduction logic is illustrative, not certified.** PF (12% of
  basic), ESI (0.75% of gross under ₹21,000), professional tax (flat ₹200
  slab), and TDS (simplified 3% above an annual-gross threshold) are
  simplified simulations built to make the reconciliation engine testable —
  they are **not** a compliant payroll calculation engine and should not be
  used for real statutory filings.
- **Intentional data defects are part of the design.** Missing PAN/bank
  details, duplicate employee IDs, attendance anomalies, and payroll
  variances are deliberately seeded into the dataset so the exception-
  detection and reconciliation engines have real findings to surface — see
  [Deep-dive case study](#deep-dive-case-study-resolving-an-onboarding-blocker-customer-c033-umber-systems)
  above.
- This is a personal portfolio / interview-preparation project, not a
  production payroll system.
