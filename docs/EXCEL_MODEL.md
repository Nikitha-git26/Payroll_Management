# Excel Model — `Payroll_Operations_Tracker.xlsx`

Built by `scripts/build_excel_workbook.py` (openpyxl) from the CSVs in `/data`.
Regenerate any time the dataset changes:

```bash
python scripts/seed_data.py
python scripts/engine.py
python scripts/build_excel_workbook.py
```

All 1,858 formulas were validated for balanced syntax and correct sheet
references (`scripts/build_excel_workbook.py` uses no `XLOOKUP` — `INDEX`/`MATCH`
throughout for portability across Excel versions). Open in Excel and formulas
compute automatically; no macros required.

## Tab layout

| Tab | Contents |
|---|---|
| `01_Customer_Tracker` | 50 accounts + live task-completion %, SLA status, days remaining |
| `02_Employee_Master` | 300 employee records + customer-name lookup |
| `03_Payroll_Register` | Per-employee gross-to-net + department/bank lookups |
| `04_Task_Pipeline` | 450 onboarding tasks + company-name lookup, blocked/pending highlighting |
| `05_Exception_Log` | Pre-payroll validation findings, severity-colored |
| `06_Reconciliation_Summary` | Account-level expected vs. processed net + SUMIFS cross-check |
| `07_KPI_Dashboard` | Roll-up KPI panel referencing every other tab |

## Key formulas (copy-paste ready)

**Task completion % per account** (`01_Customer_Tracker`, col K):
```
=IF(I2=0,0,J2/I2)
```
where `I2 = COUNTIF('04_Task_Pipeline'!$B:$B,A2)` (total tasks) and
`J2 = COUNTIFS('04_Task_Pipeline'!$B:$B,A2,'04_Task_Pipeline'!$F:$F,"Completed")`.

**SLA status** (`01_Customer_Tracker`, col N) — nested `IF`, evaluated in order
(Completed → Blocked → SLA Breach → At Risk on two horizons → On Track):
```
=IF(G2="Completed","Completed",
  IF(L2>0,"Blocked",
    IF(M2<0,"SLA Breach",
      IF(AND(M2<=7,K2<0.75),"At Risk",
        IF(AND(M2<=14,K2<0.5),"At Risk","On Track")))))
```

**Employee → department / bank lookup into the payroll register**
(`03_Payroll_Register`, cols K–L), `INDEX`/`MATCH` in place of `XLOOKUP` for
backward compatibility:
```
=IFERROR(INDEX('02_Employee_Master'!$D:$D,MATCH(A2,'02_Employee_Master'!$A:$A,0)),"")
=IFERROR(INDEX('02_Employee_Master'!$J:$J,MATCH(A2,'02_Employee_Master'!$A:$A,0)),"")
```

**Account-level expected vs. processed payroll** (`06_Reconciliation_Summary`,
cols H–I), cross-checking the seeded summary against a live `SUMIFS` re-aggregation
of the register:
```
=SUMIFS('03_Payroll_Register'!$D:$D,'03_Payroll_Register'!$B:$B,A2)   ' expected net
=SUMIFS('03_Payroll_Register'!$E:$E,'03_Payroll_Register'!$B:$B,A2)   ' processed net
```

**KPI roll-ups** (`07_KPI_Dashboard`):
```
=COUNTIF('01_Customer_Tracker'!$H:$H,"At Risk")
=SUM('06_Reconciliation_Summary'!$F:$F)
=COUNTIF('05_Exception_Log'!$D:$D,"Critical")
```

## Conditional formatting rules

| Sheet | Rule | Fill |
|---|---|---|
| `01_Customer_Tracker` | status = "Blocked" | Red |
| `01_Customer_Tracker` | SLA status = "Blocked" / "SLA Breach" | Red |
| `01_Customer_Tracker` | SLA status = "At Risk" | Yellow |
| `04_Task_Pipeline` | status = "Blocked" | Red |
| `05_Exception_Log` | severity = "Critical" / "High" / "Medium" | Red / Orange / Yellow |
| `06_Reconciliation_Summary` | variance ≠ 0 | Red |
| `06_Reconciliation_Summary` | reconciliation_status = "Unreconciled" | Red |

## Known limitation (by design)

`employee_id` is intentionally **not** a strict primary key in
`02_Employee_Master` — the synthetic dataset embeds duplicate IDs on purpose
(see root README case study), so `INDEX`/`MATCH` lookups resolve to the
*first* matching row. `05_Exception_Log` independently flags every duplicate
via the exception-detection engine, so the defect is never silently lost —
it surfaces as a "Duplicate Employee ID" exception rather than a broken lookup.
