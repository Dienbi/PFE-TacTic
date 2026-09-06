# Refactor Spec: Fiscal Profile Groups → Role Profiles

## 1. Objective

Remove the "fiscal profile group" abstraction, which currently classifies employees by family/social situation (gender, marital status, children count) and is used as a management/assignment layer. Replace it with a **Role Profile** abstraction that classifies employees by job function (Manager, Dev, Janitor, etc.) and drives payroll computation rules (horaire type, salary type, overtime rules).

Family/social attributes (marital status, children counts) are **not removed from the system** — they remain necessary for Tunisian IRPP tax deduction calculation. They are demoted from a standalone "profile group" entity to plain fields on the employee record.

---

## 2. What to Remove

### 2.1 Database tables
- `fiscal_profile_groups`
- `employee_fiscal_profile_assignments`
- `employee_fiscal_profiles` (legacy table — already unused/migrated, safe to drop)

### 2.2 Backend code
- `FiscalProfileGroupController`
- `EmployeeFiscalProfileAssignmentController`
- `FiscalProfileGroupService`
- `FiscalProfileAssignmentService`
- `FiscalProfileGroupRepository`
- `EmployeeFiscalProfileAssignmentRepository`
- `EmployeeFiscalProfileRepository` (legacy)
- `FiscalProfileGroup` model
- `EmployeeFiscalProfileAssignment` model
- `EmployeeFiscalProfile` model (legacy)

### 2.3 API routes to delete
```
GET    /api/fiscal-profile-groups
GET    /api/fiscal-profile-groups/{id}
POST   /api/fiscal-profile-groups
PUT    /api/fiscal-profile-groups/{id}
DELETE /api/fiscal-profile-groups/{id}
GET    /api/fiscal-profile-groups/{id}/employees
GET    /api/fiscal-profile-groups/match
GET    /api/fiscal-profile-groups/search
POST   /api/fiscal-profile-groups/{id}/bulk-assign
GET    /api/employees/{id}/fiscal-profile-history
GET    /api/employees/{id}/fiscal-profile
POST   /api/employees/{id}/fiscal-profile-assign
POST   /api/employees/{id}/fiscal-profile-reassign
GET    /api/employees/fiscal-search
```

### 2.4 Frontend
- `FiscalProfileGroups.tsx`
- `EmployeeFiscalProfile.tsx`
- `src/pages/payroll/fiscal-profile/` (group management pages)
- `FiscalProfileGroup`, `EmployeeFiscalProfileAssignment`, `HeadOfFamilyOverride` interfaces in `fiscalProfile.ts`

### 2.5 AI chatbot intents to remove
- Create fiscal profile group
- Assign employee to fiscal profile group
- Bulk-assign employees to fiscal profile group
- Search/match fiscal profile groups by attributes
- Fetch employees by fiscal profile group

---

## 3. What NOT to Change

These are unaffected — do not touch:

- `FiscalRuleSet` table, model, controller, service, repository (`fiscal_rule_sets`)
- `IrppBracket` table, model, controller logic, repository (`irpp_brackets`)
- `FamilyDeductionRule` table, model, controller logic, repository (`family_deduction_rules`)
- `FiscalRulesManagement.tsx` frontend component
- All `/api/payroll/fiscal-rule-sets/*` routes
- `HeadOfFamilyComputationService` — keep this, just repoint its input source (see §4.2)
- `FiscalProfileAuditService` — keep the service; either repurpose for role profile audit logging or strip out the group-specific log calls (implementer's choice, see §7)
- `Payslip.rule_set_id` relationship to `FiscalRuleSet`

---

## 4. New / Modified Entities

### 4.1 `Employee` (`utilisateurs`) — add fields

| Attribute | Type | Description |
|---|---|---|
| `marital_status` | enum | `single`, `married`, `divorced`, `widowed` |
| `gender` | enum | `male`, `female` |
| `children_count` | integer, default 0 | Number of children |
| `disabled_children_count` | integer, default 0 | Number of disabled children |
| `student_non_scholarship_children_count` | integer, default 0 | Students without scholarship |
| `head_of_family` | boolean, computed | Derived via `HeadOfFamilyComputationService` from gender/marital_status/children_count — recompute on any of those fields changing |
| `role_profile_id` | UUID, FK → `role_profiles` | Current role profile assignment (nullable until assigned) |

### 4.2 `HeadOfFamilyComputationService` — repoint
Change its input from `FiscalProfileGroup` attributes to `Employee` attributes directly. Trigger recomputation of `Employee.head_of_family` in an observer/hook on `Employee` save when `gender`, `marital_status`, or `children_count` change.

### 4.3 `EmployeeFiscalStatusHistory` (new — only if Payslip does not already snapshot fiscal values, see §4.4)

Table: `employee_fiscal_status_history`

| Attribute | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `employee_id` | bigint, FK | Employee reference |
| `marital_status` | enum | Snapshot value |
| `children_count` | integer | Snapshot value |
| `disabled_children_count` | integer | Snapshot value |
| `student_non_scholarship_children_count` | integer | Snapshot value |
| `head_of_family` | boolean | Snapshot value |
| `effective_from` | date | Start of validity |
| `effective_to` | date, nullable | End of validity (null = current) |
| `created_at`, `updated_at` | timestamps | |

Logic: on any change to the employee's fiscal fields, close the current history row (`effective_to` = day before change) and insert a new one. No group/label/dedup concept — plain audit trail.

### 4.4 Decision point — check first
Inspect the `Payslip` model/table. If it already stores the marital status, children counts, etc. **used at calculation time** as columns on the payslip itself (a snapshot, not just a FK), then §4.3 is unnecessary — historical payslips remain accurate regardless of later changes to `Employee`. If `Payslip` only references `FiscalRuleSet` and does not snapshot the family attributes, implement §4.3 and have payslip generation read from `EmployeeFiscalStatusHistory` for the relevant `effective_from`/`effective_to` window, or add the snapshot columns to `Payslip` directly (preferred if feasible — payslips should be immutable snapshots).

### 4.5 `RoleProfile` (new)

Table: `role_profiles`

| Attribute | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | text | e.g. "Manager", "Dev", "Janitor" |
| `horaire_type` | enum | `fixed`, `shift`, `hourly` |
| `salary_type` | enum | `fixed_monthly`, `hourly`, `commission`, `piece_rate` |
| `weekly_hours` | decimal(5,2), nullable | Standard weekly hours (e.g. 40, 48) — relevant for `fixed`/`shift` |
| `overtime_eligible` | boolean | Whether heures supplémentaires apply |
| `overtime_rate_multiplier` | decimal(4,2), nullable | e.g. 1.25, 1.5, 2.0 depending on bracket |
| `base_salary_min` | decimal(12,3), nullable | Grille salariale floor for the role |
| `base_salary_max` | decimal(12,3), nullable | Grille salariale ceiling for the role |
| `cnss_regime` | text, nullable | If the role has a non-default CNSS regime |
| `label` | text | Human-readable label (auto-generated, e.g. "Manager · Fixed Monthly · 48h") |
| `created_at`, `updated_at` | timestamps | |

Unique constraint on the combination of `name` (or on `[horaire_type, salary_type, weekly_hours, overtime_eligible]` if you want dedup on structural attributes rather than name — recommend keying on `name` since role names are the natural unique identifier here, unlike the old fiscal groups which had no natural name).

### 4.6 `RoleProfileAllowance` (new, optional but recommended)

Table: `role_profile_allowances`

| Attribute | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `role_profile_id` | UUID, FK | Reference to `role_profiles` |
| `allowance_type` | enum | `transport`, `meal`, `housing`, `other` |
| `amount` | decimal(12,3) | Fixed amount, or... |
| `is_percentage` | boolean | ...percentage of base salary if true |
| `created_at`, `updated_at` | timestamps | |

### 4.7 `EmployeeRoleAssignment` (new)

Table: `employee_role_assignments`

| Attribute | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `employee_id` | bigint, FK → `utilisateurs` | |
| `role_profile_id` | UUID, FK → `role_profiles` | |
| `effective_from` | date | Assignment start |
| `effective_to` | date, nullable | Assignment end (null = current) |
| `assigned_by` | bigint, FK → `utilisateurs` | Who made the assignment |
| `assigned_at` | timestamp | |
| `source_change_request_id` | UUID, nullable | For future integration, mirrors old field |
| `created_at`, `updated_at` | timestamps | |

Index: `[employee_id, effective_from, effective_to]`

Same time-bound assignment pattern as the old `EmployeeFiscalProfileAssignment` — this part of the design was fine, it's just pointed at the wrong grouping key today.

---

## 5. Entity Relationships (new state)

```
RoleProfile
 ├── hasMany → RoleProfileAllowance (role_profile_id)
 └── hasMany → EmployeeRoleAssignment (role_profile_id)

EmployeeRoleAssignment
 ├── belongsTo → Utilisateur (employee_id)
 ├── belongsTo → RoleProfile (role_profile_id)
 └── belongsTo → Utilisateur (assigned_by)

Utilisateur (Employee)
 ├── belongsTo → RoleProfile (role_profile_id) [current/denormalized pointer]
 ├── hasMany → EmployeeRoleAssignment (employee_id) [history]
 ├── hasMany → EmployeeFiscalStatusHistory (employee_id) [if implemented, see §4.4]
 └── hasMany → Payslip (employee_id)

FiscalRuleSet, IrppBracket, FamilyDeductionRule — unchanged, unrelated to RoleProfile
```

---

## 6. New Logic & Scenarios for Role Profiles

### 6.1 Create a role profile
- HR (or AI chatbot on HR's behalf) defines: name, horaire_type, salary_type, weekly_hours, overtime rules, base salary range, allowances.
- Auto-generate `label` from name + horaire_type + salary_type (mirrors old `FiscalProfileGroupService` label logic, minus the family-attribute-specific wording).
- Dedup check on `name`.

### 6.2 Assign employee to role profile
- Single assignment: `POST /api/employees/{id}/role-assign` — creates `EmployeeRoleAssignment` with `effective_from`, closes any prior open assignment (`effective_to` = day before new `effective_from`), updates `Employee.role_profile_id` pointer.
- Bulk assignment: `POST /api/role-profiles/{id}/bulk-assign` — same logic across an employee ID list, typically driven by the AI chatbot (e.g. "assign all employees with title 'Developer' to the Dev profile").
- Reassignment (role change/promotion): `POST /api/employees/{id}/role-reassign` — closes current assignment, opens new one under new profile.

### 6.3 AI chatbot — new intents
- "Create a role profile for X" → creates `RoleProfile`
- "Assign [employee/employees] to [role profile]" → single or bulk assign
- "Which role profile is [employee] in" → current profile lookup
- "Show me all [role name]s" / "fetch employees in [role profile]" → query `EmployeeRoleAssignment` where `effective_to IS NULL` and `role_profile_id = X`
- "How many married employees with 2+ children do we have" → now a **plain filtered query** on `Employee.marital_status`/`children_count` fields, not a profile-management action — no group is created or referenced, it's just a read query intent

### 6.4 Payroll/payslip calculation flow (updated pipeline)
1. **Gross salary** = computed from `Employee.role_profile_id → RoleProfile` (horaire_type, salary_type, overtime_eligible/rate, base salary, allowances from `RoleProfileAllowance`)
2. **CNSS** = computed from `FiscalRuleSet.cnss_employee_rate` / ceiling — unchanged
3. **Taxable income** = gross − CNSS − professional expense deduction (from `FiscalRuleSet`)
4. **IRPP deduction** = looked up from `FamilyDeductionRule` (active `FiscalRuleSet`) using `Employee.marital_status`, `head_of_family`, `children_count`, `disabled_children_count`, `student_non_scholarship_children_count` (or from `EmployeeFiscalStatusHistory` snapshot for the payslip's period, per §4.4)
5. **IRPP** = progressive calculation via `IrppBracket` on (taxable income − deduction) — unchanged
6. **Net salary** = taxable income − IRPP

### 6.5 Example scenario (end to end)
- HR creates `RoleProfile` "Dev" — fixed_monthly, 40h/week, overtime_eligible=true, multiplier 1.25, base range 1800–3500 TND, transport allowance 150 TND.
- HR (via chatbot) bulk-assigns 12 employees with job title "Developer" to "Dev" profile.
- Employee Ahmed (married, 2 children) is in the "Dev" profile.
- Payslip generation for Ahmed: gross computed from "Dev" profile rules (base salary + allowance + any overtime hours logged that month) → IRPP deduction pulled from `FamilyDeductionRule` using Ahmed's `marital_status=married`, `children_count=2` (read directly off `Employee`, no group lookup) → net salary computed.
- If Ahmed gets promoted to "Team Lead": HR reassigns him via `role-reassign` — old `EmployeeRoleAssignment` closes, new one opens under "Team Lead" `RoleProfile`. His fiscal fields (marital status, children) are untouched by this — the two are fully independent now.

---

## 7. Migration Steps (execution order)

1. Add new fields to `Employee`/`utilisateurs`: `marital_status`, `gender`, `children_count`, `disabled_children_count`, `student_non_scholarship_children_count`, `head_of_family`, `role_profile_id`.
2. Write a one-time migration script: for each employee, find their current (`effective_to IS NULL`) `EmployeeFiscalProfileAssignment` → `FiscalProfileGroup`, copy its attributes onto the new `Employee` fields.
3. Check `Payslip` structure per §4.4; implement `EmployeeFiscalStatusHistory` and backfill from the old assignment history only if payslips don't already snapshot fiscal values.
4. Create `role_profiles`, `role_profile_allowances`, `employee_role_assignments` tables.
5. Update `HeadOfFamilyComputationService` to read from `Employee` fields; wire it into an `Employee` save observer.
6. Update payslip/payroll calculation code: replace any join through `EmployeeFiscalProfileAssignment → FiscalProfileGroup` with direct reads of `Employee` fiscal fields (or `EmployeeFiscalStatusHistory`); add the new gross-salary computation step sourced from `RoleProfile`.
7. Build `RoleProfile` CRUD (controller/service/repository/model), mirroring the structure of the old `FiscalProfileGroupService` (minus family-attribute-specific label generation and dedup-by-attribute-combination — dedup by `name` instead).
8. Build `EmployeeRoleAssignment` CRUD/assignment logic, mirroring the old `FiscalProfileAssignmentService` (same effective_from/effective_to closure pattern).
9. Update/reuse `FiscalProfileAuditService` (or create `RoleProfileAuditService`) to log role profile creation, updates, and assignments.
10. Update the AI chatbot's intent set per §6.3; remove fiscal-group intents.
11. Update frontend: remove fiscal profile group pages/components; add role profile management pages (list/create/edit `RoleProfile`, assign/reassign employees, view assignment history) — can largely reuse the old `FiscalProfileGroups.tsx` / `EmployeeFiscalProfile.tsx` layouts as a starting template since the assignment UX pattern is the same.
12. Delete deprecated tables, models, controllers, services, repositories, routes, and frontend files listed in §2.
13. Regression test payslip generation end-to-end for a handful of employees across different roles and family situations to confirm gross (role-driven) and net (fiscal-driven) figures are still correct after the split.