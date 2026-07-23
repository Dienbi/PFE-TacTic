# SmartHR — Tunisian Payroll Module: Technical Specification

**Purpose of this document**: This is a complete build spec for upgrading the payroll module in SmartHR to be a legally-grounded, automated, auditable Tunisian payroll system. It's written to be handed to an AI coding agent as the primary reference for implementation.

**A note on the tax figures used below**: Tunisian CNSS rates, IRPP brackets, and deduction amounts are set by the annual *Loi de Finances* and multiple public sources disagree slightly on the exact current values. The numbers below are drawn consistently from a single source describing the 2025 reform (8-bracket IRPP scale) and are meant as **seed/placeholder data** — accurate enough to build and test against, but they must be verified against the official JORT text or an accountant before this goes into production. The whole point of the architecture below is that these numbers live in configurable, dated tables, not in code, specifically so this correction is a data update, not a rebuild.

---

## 1. Job Description — What We're Building

We are extending an existing HR platform (SmartHR) with a **Payroll module** that:

1. Calculates Tunisian payroll correctly: gross salary → CNSS → taxable base → IRPP (progressive, annualized) → CSS → net.
2. Lets HR generate payslips for one employee or in bulk for all employees.
3. Lets HR configure each employee's base salary and fiscal profile (family situation).
4. Lets HR define custom pay items (bonuses, overtime, allowances) with independent taxable/CNSS-applicable flags.
5. Keeps a locked, versioned history of every payslip — once paid, edits create a new dated version instead of mutating the original.
6. Tracks payments against payslips and exposes payment history per employee.
7. Runs an automated **year-end tax regularization** pass that recomputes true annual IRPP per employee and books any correction.
8. Lets HR import new annual tax rules two ways: a manual form, or **uploading the official Loi de Finances PDF**, which an AI step scans to propose rule changes — always requiring explicit human confirmation before anything is applied, with the source PDF and AI output kept in an audit log.

This is not a generic payroll calculator — it is specifically modeling the Tunisian legal mechanism (CNSS ceiling, forfait de frais professionnels, abattements familiaux, barème progressif annualized to monthly, CSS, minimum d'impôt), and it must remain correct as that law changes every year.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (SmartHR UI)                 │
│  Payroll dashboard · Employee config · Rule review screen ·  │
│  Payslip generation · Payment tracking · History/versions    │
└───────────────────────────┬───────────────────────────────────┘
                             │ REST/GraphQL API
┌───────────────────────────▼───────────────────────────────────┐
│                         Application Layer                     │
│  ─ Payroll Calculation Engine (pure functions, unit-testable) │
│  ─ Rule Management Service (CRUD + versioning of fiscal data) │
│  ─ Payslip Generation Service (single + batch)                │
│  ─ Payment Tracking Service                                   │
│  ─ Year-End Regularization Job (scheduled/batch)               │
│  ─ PDF Ingestion + AI Extraction Service                      │
│  ─ Audit Log Service                                          │
└───────────────────────────┬───────────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────────┐
│                          Data Layer (SQL)                     │
│  fiscal_rule_sets · irpp_brackets · family_deduction_rules ·  │
│  employees · employee_fiscal_profiles · pay_items ·           │
│  payslips · payslip_pay_items · payments · rule_import_logs · │
│  audit_log                                                     │
└─────────────────────────────────────────────────────────────┘
                             │
              ┌──────────────┴───────────────┐
              │  External: AI API (extraction) │
              │  PDF text extraction library    │
              └─────────────────────────────────┘
```

**Key architectural principle: snapshot, don't reference.** When a payslip is generated, the exact fiscal values used (rates, brackets, deductions) are **copied into the payslip record**, not just linked by ID. This guarantees that correcting a rule later, or viewing a payslip from a past year, always shows numbers as they were actually calculated — never recalculated retroactively.

---

## 3. Suggested Tech Stack

Use whatever matches the existing SmartHR stack if one exists; otherwise these are reasonable defaults:

- **Backend**: Node.js (NestJS or Express) or Python (Django/FastAPI) — either is fine, pick based on what the rest of SmartHR uses.
- **Database**: PostgreSQL (needed for solid decimal/numeric handling of currency — never use floating point for money fields; use `NUMERIC(12,3)` for TND amounts, since Tunisian dinar has 3 decimal places/millimes).
- **PDF text extraction**: `pdf-parse` (Node) or `pdfplumber`/`PyMuPDF` (Python).
- **AI extraction step**: Anthropic API (Claude), called with the extracted PDF text + a structured-output prompt returning JSON.
- **Background jobs**: a queue (BullMQ for Node, Celery for Python) for batch payslip generation and the year-end regularization job, since these can be slow for large employee counts.
- **PDF generation for payslips**: a templating + PDF library (e.g. Puppeteer/HTML-to-PDF, or WeasyPrint in Python).
- **Frontend**: match existing SmartHR frontend framework.

---

## 4. Project Setup Instructions (for the AI agent)

1. Create/extend a `payroll` module/domain folder inside the existing SmartHR codebase, isolated from other HR domains (employee records module, leave module, etc.) but able to read basic employee data (name, hire date, contract type) from the existing employee entity.
2. Set up the database migrations for all tables in Section 5 below, in the order listed (respecting foreign key dependencies).
3. Seed the database with **one fiscal_rule_set for 2026** using the placeholder values in Section 6, marked `status = 'confirmed'` so development/testing can proceed immediately.
4. Implement the calculation engine (Section 7) as a standalone, pure, unit-tested module with **zero dependency on the database or HTTP layer** — it should take plain data in and return plain data out, so it can be tested with fixed inputs/outputs independent of everything else.
5. Build outward from the engine: payslip service → API endpoints → frontend screens, in the order given in Section 9 (Scenario Flows).
6. Do not build the AI/PDF import feature until the manual rule-entry form and the calculation engine are fully working and tested — it is the last phase, not the first.

---

## 5. Data Models

### `fiscal_rule_sets`
Represents one version of the year's tax law parameters.

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| year | INT | e.g. 2026 |
| effective_from | DATE | |
| effective_to | DATE, nullable | null = still active |
| status | ENUM(draft, confirmed, superseded) | |
| cnss_employee_rate | NUMERIC(6,4) | e.g. 0.0968 |
| cnss_employer_rate | NUMERIC(6,4) | e.g. 0.1707 |
| cnss_monthly_ceiling | NUMERIC(12,3), nullable | some components are capped; keep nullable/config per component if needed later |
| css_rate | NUMERIC(6,4) | e.g. 0.005 |
| css_exempt_annual_net_threshold | NUMERIC(12,3) | e.g. 5000.000 — below this, exempt from CSS |
| prof_expense_rate | NUMERIC(6,4) | e.g. 0.10 |
| prof_expense_annual_cap | NUMERIC(12,3) | e.g. 2000.000 |
| min_annual_tax | NUMERIC(12,3) | e.g. 45.000 |
| source_pdf_ref | TEXT, nullable | link/path to the uploaded law PDF |
| confirmed_by | UUID FK → users, nullable | |
| confirmed_at | TIMESTAMP, nullable | |
| created_at | TIMESTAMP | |

### `irpp_brackets`
One row per bracket, linked to a rule set.

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| rule_set_id | UUID FK → fiscal_rule_sets | |
| bracket_order | INT | 1, 2, 3... |
| min_annual_amount | NUMERIC(12,3) | inclusive lower bound |
| max_annual_amount | NUMERIC(12,3), nullable | null = no upper bound (top bracket) |
| rate | NUMERIC(6,4) | e.g. 0.15 |

### `family_deduction_rules`
One row per deduction type, linked to a rule set.

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| rule_set_id | UUID FK → fiscal_rule_sets | |
| deduction_type | ENUM(head_of_household, child, disabled_child, student_child_non_scholarship) | |
| annual_amount | NUMERIC(12,3) | |
| max_count | INT, nullable | e.g. 4 for children |

### `employees` (extend existing entity or reference it)
Add/confirm these payroll-relevant fields if not present: `base_salary`, `contract_type`, `hire_date`, `termination_date`, `sector` (for future agricultural-regime support).

### `employee_fiscal_profiles`
Dated history of an employee's family/fiscal situation — never overwrite, always insert new dated rows.

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| employee_id | UUID FK | |
| effective_from | DATE | |
| marital_status | ENUM(single, head_of_household) | |
| children_count | INT | |
| disabled_children_count | INT | |
| student_non_scholarship_children_count | INT | |
| created_at | TIMESTAMP | |

### `pay_items`
Configurable catalog of bonus/overtime/allowance types.

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT | e.g. "Overtime", "Transport Allowance" |
| calculation_type | ENUM(fixed_amount, percentage_of_base, formula) | |
| is_taxable | BOOLEAN | subject to IRPP |
| is_cnss_applicable | BOOLEAN | subject to CNSS — independent flag from is_taxable |
| default_value | NUMERIC(12,3), nullable | |
| active | BOOLEAN | |

### `payslips`
The core record. Immutable once locked.

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| employee_id | UUID FK | |
| pay_period_start | DATE | |
| pay_period_end | DATE | |
| rule_set_id | UUID FK → fiscal_rule_sets | frozen reference, values also copied below |
| base_salary_used | NUMERIC(12,3) | snapshot |
| gross_salary | NUMERIC(12,3) | |
| cnss_employee_amount | NUMERIC(12,3) | |
| cnss_employer_amount | NUMERIC(12,3) | |
| taxable_base_annual | NUMERIC(12,3) | |
| irpp_annual | NUMERIC(12,3) | |
| irpp_monthly | NUMERIC(12,3) | |
| css_amount | NUMERIC(12,3) | |
| net_salary | NUMERIC(12,3) | |
| status | ENUM(draft, validated, locked, superseded) | |
| version | INT | starts at 1 |
| supersedes_payslip_id | UUID, nullable | points to prior version if this is a correction |
| is_regularization_adjustment | BOOLEAN | true for year-end correction entries |
| generated_at | TIMESTAMP | |
| generated_by | UUID FK → users | |

### `payslip_pay_items`
Line items applied to a specific payslip (snapshot of pay_items used, with actual amount).

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| payslip_id | UUID FK | |
| pay_item_id | UUID FK → pay_items | |
| name_snapshot | TEXT | in case the pay_item is renamed later |
| amount | NUMERIC(12,3) | |
| was_taxable | BOOLEAN | snapshot |
| was_cnss_applicable | BOOLEAN | snapshot |

### `payments`

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| payslip_id | UUID FK | |
| method | ENUM(bank_transfer, cash, check) | |
| amount | NUMERIC(12,3) | |
| paid_at | DATE | |
| reference | TEXT, nullable | |
| created_by | UUID FK → users | |

### `rule_import_logs`
Audit trail for AI-assisted rule imports.

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| rule_set_id | UUID FK, nullable | set once confirmed |
| uploaded_pdf_ref | TEXT | |
| ai_raw_output_json | JSONB | full AI response, for audit |
| proposed_changes_json | JSONB | field-by-field diff proposal |
| reviewed_by | UUID FK → users, nullable | |
| review_decisions_json | JSONB, nullable | per-field accept/reject |
| status | ENUM(pending_review, confirmed, rejected) | |
| created_at | TIMESTAMP | |

### `audit_log`
General-purpose append-only log for sensitive actions (rule confirmations, payslip corrections, payment entries).

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| actor_id | UUID FK → users | |
| action | TEXT | e.g. "rule_set.confirmed", "payslip.corrected" |
| entity_type | TEXT | |
| entity_id | UUID | |
| details_json | JSONB | |
| created_at | TIMESTAMP | |

---

## 6. Seed Data — 2026 Placeholder Fiscal Rules

Use these to seed `fiscal_rule_sets`, `irpp_brackets`, and `family_deduction_rules` for development/testing. **Flag clearly in the UI that these are unverified pending confirmation against the official JORT text.**

**fiscal_rule_sets row:**
```
year: 2026
effective_from: 2026-01-01
status: confirmed
cnss_employee_rate: 0.0968
cnss_employer_rate: 0.1707
css_rate: 0.005
css_exempt_annual_net_threshold: 5000.000
prof_expense_rate: 0.10
prof_expense_annual_cap: 2000.000
min_annual_tax: 45.000
```

**irpp_brackets rows (annual taxable base, TND):**
```
1: 0        – 5000     → 0%
2: 5000     – 10000    → 15%
3: 10000    – 20000    → 25%
4: 20000    – 30000    → 30%
5: 30000    – 40000    → 33%
6: 40000    – 50000    → 36%
7: 50000    – 70000    → 38%
8: 70000    – null     → 40%
```

**family_deduction_rules rows:**
```
head_of_household: 300.000/year, max_count: null
child: 100.000/year, max_count: 4
disabled_child: 2000.000/year, max_count: null
student_child_non_scholarship: 1000.000/year, max_count: null
```

---

## 7. Calculation Engine Logic

Implement as a pure function, e.g. `calculatePayslip(input) → result`.

**Input:**
```
{
  baseSalary: number,
  payItems: [{ amount, isTaxable, isCnssApplicable }],
  fiscalProfile: { maritalStatus, childrenCount, disabledChildrenCount, studentChildrenCount },
  ruleSet: { cnssEmployeeRate, cnssEmployerRate, cssRate, cssExemptThreshold,
             profExpenseRate, profExpenseCap, minAnnualTax,
             irppBrackets: [...], familyDeductions: [...] },
  payPeriodMonths: 1  // usually 1 for monthly payslip
}
```

**Steps:**
1. `grossSalary = baseSalary + sum(payItems.amount)`
2. `cnssApplicableGross = baseSalary + sum(payItems where isCnssApplicable).amount`
3. `cnssEmployeeAmount = cnssApplicableGross × ruleSet.cnssEmployeeRate` (apply any component-level ceiling if defined)
4. `cnssEmployerAmount = cnssApplicableGross × ruleSet.cnssEmployerRate`
5. `taxableGross = baseSalary + sum(payItems where isTaxable).amount`
6. `netBeforeTax = taxableGross - cnssEmployeeAmount` *(only subtract CNSS portion that applied to taxable items — in practice CNSS is deductible from taxable income regardless, so simplify to: `netBeforeTax = taxableGross - cnssEmployeeAmount` using the full CNSS employee amount)*
7. Annualize: `annualNetBeforeTax = netBeforeTax × 12` (or × remaining months if mid-year hire/termination — see Section 8 edge cases)
8. `profExpenseDeduction = min(annualNetBeforeTax × ruleSet.profExpenseRate, ruleSet.profExpenseCap)`
9. `familyDeductionTotal = ` sum of applicable family deduction amounts based on fiscalProfile, respecting max_count per type
10. `annualTaxableBase = max(0, annualNetBeforeTax - profExpenseDeduction - familyDeductionTotal)`
11. Apply progressive brackets to `annualTaxableBase`:
    ```
    annualIrpp = 0
    for each bracket in irppBrackets (ordered):
       taxableInBracket = min(annualTaxableBase, bracket.max ?? Infinity) - bracket.min
       if taxableInBracket > 0: annualIrpp += taxableInBracket × bracket.rate
    annualIrpp = max(annualIrpp, ruleSet.minAnnualTax)  // apply floor
    ```
12. `monthlyIrpp = annualIrpp / 12`
13. `cssAmount = (annualNetBeforeTax > ruleSet.cssExemptThreshold) ? (netBeforeTax × ruleSet.cssRate) : 0`
14. `netSalary = grossSalary - cnssEmployeeAmount - monthlyIrpp - cssAmount`
15. Round all currency outputs to 3 decimal places (millimes) using standard rounding, applied consistently — decide once whether rounding happens per-step or only at final output, and document the choice in code comments.

Write unit tests with at least 3 fixed scenarios (low salary, mid salary, high salary with head-of-household + 2 children) and hand-verified expected outputs before trusting the engine.

---

## 8. Edge Cases to Handle Explicitly

- **Mid-year hire/termination**: annualization in step 7 should use actual months worked in the year, not always ×12, or the year-end regularization step must correct for this.
- **Bonus/13th-month payments**: large one-off payments can be annualized separately or added to the month's taxable base — document which approach is chosen, since it affects the employee's monthly net meaningfully.
- **Salary changes mid-year**: the regularization job (Section 9, Phase 6) must use the true sum of actual monthly taxable amounts, not an assumed flat annual figure.
- **Employee with zero/negative computed IRPP**: floor at `minAnnualTax`, never go negative.
- **CNSS ceiling**: if a component of CNSS is capped, apply the cap before computing the rate, not after.

---

## 9. Full Scenario Flow (build and test in this order)

**Scenario A — Set up the year's tax rules (manual form path)**
1. HR opens "Fiscal Rules" screen → "New Rule Set."
2. Fills CNSS rates, CSS rate, professional expense settings, adds/edits bracket rows, adds/edits family deduction rows.
3. Saves as `draft`.
4. HR reviews and clicks "Confirm" → status becomes `confirmed`, `confirmed_by`/`confirmed_at` set, audit log entry created.
5. Only one `confirmed` rule set can be active for a given date range — system prevents overlapping confirmed sets.

**Scenario B — Configure an employee**
1. HR opens employee profile → Payroll tab.
2. Sets `base_salary`.
3. Sets/updates fiscal profile (marital status, children) → creates a new dated `employee_fiscal_profiles` row (never edits the old one).

**Scenario C — Generate a single payslip**
1. HR selects employee + pay period → "Generate Payslip."
2. System finds the `confirmed` rule set effective for that pay period's date.
3. System finds the employee's fiscal profile effective for that pay period's date.
4. System pulls any pay items configured for that employee/period (bonuses, overtime, allowances).
5. Calculation engine runs, result stored as a new `payslips` row with `status = draft`, all rule/profile values snapshotted.
6. HR reviews draft, clicks "Validate" → `status = validated`.

**Scenario D — Generate payslips for all employees (batch)**
1. HR selects pay period → "Generate All."
2. System shows a **pre-run preview**: list of employees, their gross/net vs. last period, flags for anomalies (e.g. salary change >20%, missing fiscal profile).
3. HR confirms → batch job runs Scenario C's logic per employee, queued if the list is large.
4. Summary screen shows success/failure per employee.

**Scenario E — Record a payment**
1. HR opens a validated payslip → "Record Payment."
2. Enters method, amount, date, reference.
3. On save, if payment amount matches net salary, payslip `status` moves to `locked`.

**Scenario F — Correct a locked payslip**
1. HR opens a locked payslip → "Correct."
2. Cannot edit in place. System creates a **new payslip row**, `version = old.version + 1`, `supersedes_payslip_id = old.id`, old row's status becomes `superseded`.
3. HR edits the new draft, validates, re-triggers payment flow if needed.

**Scenario G — Payment history view**
1. HR opens employee → "Payment History" tab.
2. Lists all payslip versions (only latest non-superseded shown by default, older versions visible via "show history"), each linked to its payment record(s), with YTD gross/CNSS/IRPP totals.

**Scenario H — Year-end regularization (batch job)**
1. Scheduled job (or manually triggered by HR) runs per employee at year-end.
2. Pulls all validated/locked payslips for the calendar year.
3. Recomputes true annual taxable base and true annual IRPP using actual totals (not projections).
4. Compares to sum of `irpp_monthly` actually withheld across the year.
5. If different, creates an adjustment payslip line: `is_regularization_adjustment = true`, amount = difference, attached to December (or next January) payslip.
6. Logs the computation inputs/outputs for audit.

**Scenario I — Import new year's rules via PDF (build last)**
1. HR uploads the Loi de Finances PDF.
2. System extracts text, sends to AI extraction service with a structured prompt (see Section 10).
3. AI returns proposed field changes + the source sentence for each.
4. System creates a `rule_import_logs` row (`status = pending_review`) and shows a **diff screen**: current confirmed value vs. proposed value vs. quoted source sentence, per field.
5. HR accepts/rejects each field individually.
6. On submit, accepted fields are used to create a new `fiscal_rule_sets` draft (pre-filled, still editable) → HR still must hit "Confirm" per Scenario A step 4 before it becomes active.
7. `rule_import_logs` updated with `reviewed_by`, `review_decisions_json`, `status = confirmed`, and linked to the resulting `rule_set_id`.

---

## 10. AI Extraction Prompt (for Scenario I)

Suggested structure for the extraction call:

```
System/instructions: You are extracting specific numeric tax parameters from a
Tunisian Loi de Finances legal text. Only extract values you find explicit
textual support for. For each field, return the value AND the exact sentence
(quoted, in original language) that supports it. If a field is not mentioned
in this text, return null for it rather than guessing.

Fields to find: cnss_employee_rate, cnss_employer_rate, css_rate,
prof_expense_rate, prof_expense_annual_cap, min_annual_tax,
irpp_brackets (array of {min, max, rate}),
family_deduction_head_of_household, family_deduction_per_child,
family_deduction_disabled_child, family_deduction_student_child.

Return ONLY valid JSON, no other text, in this shape:
{
  "field_name": { "value": ..., "source_sentence": "...", "confidence": "high|medium|low" },
  ...
}
```

Store the full raw response in `rule_import_logs.ai_raw_output_json` regardless of what gets confirmed, for traceability.

---

## 11. Build Order Summary (checklist for the agent)

- [ ] Database migrations for all tables in Section 5
- [ ] Seed 2026 placeholder rule set (Section 6)
- [ ] Calculation engine + unit tests (Section 7, 8)
- [ ] Manual rule entry form (Scenario A)
- [ ] Employee payroll config screen (Scenario B)
- [ ] Single payslip generation (Scenario C)
- [ ] Batch payslip generation with preview (Scenario D)
- [ ] Payment recording + lock logic (Scenario E)
- [ ] Versioned correction flow (Scenario F)
- [ ] Payment/payslip history views (Scenario G)
- [ ] Year-end regularization batch job (Scenario H)
- [ ] PDF upload + AI extraction + review/confirm flow (Scenario I)
- [ ] Audit log wired into every sensitive action (rule confirm, payslip correction, payment record, rule import)