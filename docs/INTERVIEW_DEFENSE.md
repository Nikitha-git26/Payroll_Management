# Interview Defense Script

Talking points for presenting PayFlow in a payroll/B2B operations interview
(e.g. RazorpayX Payroll onboarding/ops roles). Kept honest about what this
project is — a synthetic, self-built simulation — and what it isn't.

## "Tell me about this project in one sentence."

> "PayFlow is a synthetic operations dashboard I built to simulate how a B2B
> payroll team tracks 50 customer onboardings end-to-end — from document
> collection through payroll go-live — catching data exceptions and payroll
> reconciliation variances the same way a real ops analyst would, using
> Python, SQL, Excel, and a Next.js dashboard on the same dataset."

## "What was the most challenging operational problem you solved?"

> "Getting the exception-detection and reconciliation logic to agree across
> four different tools. I wrote the same rules — missing PAN, duplicate
> employee IDs, gross-to-net variance — three times: once in Python
> (`scripts/engine.py`) for the CSV/Excel side, once in TypeScript
> (`src/lib/payrollEngine.ts`) for the live dashboard, and once as SQL
> aggregate queries. The hard part wasn't any single implementation, it was
> making sure a defect I seeded in the data got caught by all three and
> produced the same severity and count — that's the kind of cross-system
> consistency a real payroll ops team has to maintain between their
> warehouse, their ops tool, and their spreadsheet reconciliation."

**Example, concretely:** Customer C014 (Alpha Services) had a payroll run
where processed net pay came in below expected net for every employee in one
department — see the case study in the root README. Tracing that from a
single flagged account in the dashboard down to the specific deduction line
in the payroll register is the exact workflow this project models.

## "How did you use Excel vs. SQL vs. Python across the workflow?"

> "Python does the heavy lifting — generating the dataset and running the
> validation/reconciliation engine at scale (300 employees, 450 tasks) — because
> that's what you'd actually run on a real warehouse extract. SQL is what an
> analyst would hand to a BI tool or run ad hoc against the warehouse: the
> `sql/analytics_queries.sql` file has the SLA-risk query, the variance
> breakdown by customer/department, and the exception severity matrix — the
> kind of query I'd write to answer 'which accounts need attention today.'
> Excel is the handoff artifact: `Payroll_Operations_Tracker.xlsx` has live
> `SUMIFS`/`COUNTIFS`/nested-`IF` formulas, not pasted values, because in a
> real ops team the spreadsheet often *is* the shared source of truth that
> customer-facing teams and finance both look at, and it needs to recalculate
> when new data lands. Power BI DAX measures are documented for the
> leadership-dashboard layer on top of the same tables."

## "How does this make you ready for Razorpay's payroll operations?"

> "It's not a substitute for handling real customer accounts and real
> statutory compliance — I'm upfront about that. What it shows is that I
> understand the *shape* of the job: an onboarding pipeline with stages and
> SLAs, pre-payroll data validation before a run, gross-to-net reconciliation
> after a run, and escalation based on severity — and that I can build the
> tooling to support that workflow, not just use it. I built this because I
> wanted to understand where onboarding actually breaks — bad bank details,
> missing PAN, a processing variance nobody caught — before I was ever in the
> seat, so the ramp-up on a real book of customers is about learning your
> specific SOPs and compliance rules, not learning what SLA tracking or
> reconciliation even mean."

## What to say vs. what NOT to say

| Situation | Say | Don't say |
|---|---|---|
| Asked if the data is real | "It's fully synthetic — 50 fictional accounts I generated with a fixed random seed so the numbers are reproducible." | Anything implying real customer or employee data was used. |
| Asked about PF/ESI/PT/TDS logic | "Simplified, illustrative deduction math to make the reconciliation engine testable — not certified statutory calculation logic." | "It calculates real PF/ESI the way Razorpay does" or any claim of compliance accuracy. |
| Asked "have you done this professionally" | "Not yet in a payroll ops seat — this is how I prepared for one, by building the tooling I'd expect to use." | Implying prior payroll operations employment if you haven't had one. |
| Asked about scale | "This models 50 accounts / 300 employees to keep it inspectable end-to-end; the patterns — exception detection, SLA classification, reconciliation — are the same ones that scale to thousands, just with more infrastructure around them." | Claiming the project itself was load-tested or run at production scale. |
| Asked to extend it live | Be willing to actually open `payrollEngine.ts` or the SQL file and walk through the logic. | Avoid the code — if you built it, you should be comfortable in it. |

**General rule:** every claim should be defensible by pointing at a specific
file in this repo. If you can't point at it, don't claim it.
