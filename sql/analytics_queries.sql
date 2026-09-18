-- =============================================================================
-- PayFlow — Payroll Onboarding & Reconciliation Operations Dashboard
-- Analytics Suite (ANSI SQL)
--
-- Schema mirrors /data/*.csv (loadable into any warehouse: Postgres, Snowflake,
-- BigQuery, DuckDB, SQL Server). All figures are synthetic and illustrative.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SCHEMA — DDL
-- -----------------------------------------------------------------------------

CREATE TABLE customers (
    customer_id             VARCHAR(10)     PRIMARY KEY,
    company_name            VARCHAR(120)    NOT NULL,
    industry                VARCHAR(60)     NOT NULL,
    employee_count          INTEGER         NOT NULL,
    onboarding_start_date   DATE            NOT NULL,
    target_closure_date     DATE            NOT NULL,
    current_stage           VARCHAR(30)     NOT NULL,
    status                  VARCHAR(20)     NOT NULL
);

CREATE TABLE employees (
    employee_id             VARCHAR(10)     NOT NULL,
    customer_id             VARCHAR(10)     NOT NULL REFERENCES customers (customer_id),
    name                    VARCHAR(120)    NOT NULL,
    department               VARCHAR(60)     NOT NULL,
    basic_pay                NUMERIC(12, 2)  NOT NULL,
    hra                      NUMERIC(12, 2)  NOT NULL,
    special_allowance        NUMERIC(12, 2)  NOT NULL,
    overtime_pay              NUMERIC(12, 2)  NOT NULL DEFAULT 0,
    bonus                     NUMERIC(12, 2)  NOT NULL DEFAULT 0,
    bank_account_no           VARCHAR(20),
    pan_number                VARCHAR(10),
    uan_number                VARCHAR(12),
    attendance_days           INTEGER         NOT NULL,
    lop_days                  INTEGER         NOT NULL DEFAULT 0
    -- NOTE: employee_id is intentionally NOT declared PRIMARY KEY here.
    -- The synthetic dataset embeds duplicate employee_id rows on purpose so
    -- the exception-detection query below (#4 / duplicate check) has real
    -- rows to catch — a common real-world onboarding-data defect.
);

CREATE TABLE tasks (
    task_id                  VARCHAR(10)     PRIMARY KEY,
    customer_id               VARCHAR(10)     NOT NULL REFERENCES customers (customer_id),
    task_name                 VARCHAR(80)     NOT NULL,
    owner                      VARCHAR(20)     NOT NULL CHECK (owner IN ('Ops', 'Payroll Ops', 'Customer')),
    due_date                   DATE            NOT NULL,
    status                     VARCHAR(20)     NOT NULL CHECK (status IN ('Completed', 'In Progress', 'Pending', 'Blocked'))
);

CREATE TABLE payroll_register (
    employee_id                VARCHAR(10)     NOT NULL REFERENCES employees (employee_id),
    customer_id                 VARCHAR(10)     NOT NULL REFERENCES customers (customer_id),
    gross_earnings               NUMERIC(12, 2)  NOT NULL,
    expected_net_pay              NUMERIC(12, 2)  NOT NULL,
    processed_net_pay             NUMERIC(12, 2)  NOT NULL,
    pf_deduction                   NUMERIC(12, 2)  NOT NULL DEFAULT 0,
    esi_deduction                   NUMERIC(12, 2)  NOT NULL DEFAULT 0,
    pt_deduction                     NUMERIC(12, 2)  NOT NULL DEFAULT 0,
    tds_deduction                     NUMERIC(12, 2)  NOT NULL DEFAULT 0,
    variance                          NUMERIC(12, 2)  NOT NULL
);

-- -----------------------------------------------------------------------------
-- 2. SLA RISK QUERY
-- Customers whose target closure date is within 5 days but task completion
-- is under 70%. Used by Payroll Ops to triage which accounts need same-day
-- escalation before they breach SLA.
-- -----------------------------------------------------------------------------

WITH task_progress AS (
    SELECT
        t.customer_id,
        COUNT(*)                                            AS total_tasks,
        SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) AS completed_tasks,
        SUM(CASE WHEN t.status = 'Blocked' THEN 1 ELSE 0 END)   AS blocked_tasks
    FROM tasks t
    GROUP BY t.customer_id
)
SELECT
    c.customer_id,
    c.company_name,
    c.current_stage,
    c.status,
    c.target_closure_date,
    (c.target_closure_date - CURRENT_DATE)                              AS days_to_target,
    ROUND(100.0 * tp.completed_tasks / NULLIF(tp.total_tasks, 0), 1)    AS completion_pct,
    tp.blocked_tasks
FROM customers c
JOIN task_progress tp ON tp.customer_id = c.customer_id
WHERE c.current_stage <> 'Completed'
  AND (c.target_closure_date - CURRENT_DATE) <= 5
  AND (100.0 * tp.completed_tasks / NULLIF(tp.total_tasks, 0)) < 70
ORDER BY days_to_target ASC, completion_pct ASC;

-- -----------------------------------------------------------------------------
-- 3. VARIANCE BREAKDOWN QUERY
-- Aggregate payroll discrepancies grouped by customer and department, to
-- pinpoint which department within an account is driving reconciliation leaks.
-- -----------------------------------------------------------------------------

SELECT
    c.customer_id,
    c.company_name,
    e.department,
    COUNT(pr.employee_id)                          AS employees_in_scope,
    SUM(pr.expected_net_pay)                        AS total_expected_net,
    SUM(pr.processed_net_pay)                       AS total_processed_net,
    SUM(pr.variance)                                AS total_variance,
    SUM(CASE WHEN pr.variance <> 0 THEN 1 ELSE 0 END) AS employees_with_variance
FROM payroll_register pr
JOIN employees e  ON e.employee_id = pr.employee_id AND e.customer_id = pr.customer_id
JOIN customers c  ON c.customer_id = pr.customer_id
GROUP BY c.customer_id, c.company_name, e.department
HAVING SUM(pr.variance) <> 0
ORDER BY ABS(SUM(pr.variance)) DESC;

-- -----------------------------------------------------------------------------
-- 4. EXCEPTION SEVERITY MATRIX
-- Count of open blockers (Blocked tasks) grouped by customer and owner, to
-- drive daily prioritization of who needs to unblock what.
-- -----------------------------------------------------------------------------

SELECT
    c.customer_id,
    c.company_name,
    t.owner,
    COUNT(*) FILTER (WHERE t.status = 'Blocked')      AS blocked_count,
    COUNT(*) FILTER (WHERE t.status = 'Pending')       AS pending_count,
    COUNT(*) FILTER (WHERE t.status = 'In Progress')   AS in_progress_count,
    COUNT(*)                                            AS total_tasks_owned
FROM tasks t
JOIN customers c ON c.customer_id = t.customer_id
GROUP BY c.customer_id, c.company_name, t.owner
HAVING COUNT(*) FILTER (WHERE t.status = 'Blocked') > 0
ORDER BY blocked_count DESC, c.customer_id;

-- Note: COUNT(*) FILTER (WHERE ...) is standard SQL (Postgres/DuckDB/SQLite).
-- On engines without FILTER (e.g. MySQL, older SQL Server), rewrite as:
--   SUM(CASE WHEN t.status = 'Blocked' THEN 1 ELSE 0 END) AS blocked_count

-- -----------------------------------------------------------------------------
-- 5. BONUS — Duplicate / integrity exception check
-- Surfaces the intentionally-embedded duplicate employee_id defect used to
-- exercise the exception-detection engine (src/lib/payrollEngine.ts and
-- scripts/engine.py implement the same check in application code).
-- -----------------------------------------------------------------------------

SELECT
    employee_id,
    COUNT(*) AS occurrences
FROM employees
GROUP BY employee_id
HAVING COUNT(*) > 1
ORDER BY occurrences DESC;
