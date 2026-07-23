# SmartHR Payroll — Fiscal Profile Module & AI Chatbot Assistant

**Stack**: Laravel (backend/API), React (frontend), Python + FastAPI (AI microservice)

**Purpose of this document**: Build spec for two connected features:
1. The **Fiscal Profile module** — employee-submitted personal info changes (marital status, children), document verification, HR approval, auto-computed head-of-family status, and grouped fiscal profiles reused across employees.
2. An **AI chatbot assistant** (via the FastAPI service) that lets HR create/assign fiscal profile groups using natural language, always behind an explicit human confirmation step before any write happens.

This module plugs into the existing payroll system (fiscal rule sets, payslips, audit log) already built. Do not duplicate or modify the `fiscal_rule_sets` tables — this module only adds fiscal profile grouping and assignment, which the payslip calculation engine already expects to read from an `employee_fiscal_profile_assignments`-style source.

---

## Part 1 — Fiscal Profile Module

### 1.1 Business Rules (must be enforced in code, not just described)

**Head-of-family is always computed, never manually set.**
```
if gender == 'male' and marital_status in ('married', 'divorced', 'widowed'):
    head_of_family = true
elif gender == 'female' and marital_status in ('divorced', 'widowed') and children_count > 0:
    head_of_family = true
else:
    head_of_family = false
```
Note: divorced/widowed males default to `head_of_family = true`, same as married males — this is a working assumption pending legal confirmation, so keep this rule isolated in one place (a single service method) so it can be corrected easily if wrong.

**Head-of-family can never be directly edited via the standard request or group form.** Only a separate "manual override" action (admin-only, mandatory justification note + document) can force a different value. This must be a distinct, clearly logged code path, not a checkbox on the normal form.

**Document requirements are dynamic per change type** — not one generic upload field:

| Change | Required document type |
|---|---|
| Single → Married | `marriage_certificate` |
| Married → Divorced | `divorce_judgment` |
| Married → Widowed | `death_certificate` |
| Any increase in children_count | `birth_certificate` (one per new child) |
| Claiming disabled_children_count > 0 | `disability_certificate` |
| Claiming student_non_scholarship_children_count > 0 | `school_enrollment_certificate` |
| Any decrease in children_count (any type) | No fixed document type, but always forced to `needs_more_info` status — never auto-eligible for approval regardless of documents present |

**Hard validation gate**: HR cannot approve a change request if any document required for that specific change is missing or has `verified_by_hr = false`. This must be enforced server-side (Laravel policy/validation), not just hidden in the UI — a direct API call to the approve endpoint must also be blocked.

**One active request per employee at a time.** An employee cannot submit a new change request while one is `pending` or `needs_more_info`.

**Children count cannot exceed 4 for the standard child deduction** (per current fiscal rules) — validate against the active `fiscal_rule_sets` family deduction max, don't hardcode 4 in this module.

**Effective date handling**: `claimed_effective_date` cannot be before the employee's hire date or more than a set number of days in the future (configurable, default 0 — no future-dating). If the claimed date falls inside a pay period that already has a `locked` payslip, flag `affects_locked_payslips = true` on approval and surface this clearly to HR — do not silently leave old payslips incorrect. This should link into the existing Corrections/Regularization workflow rather than being handled inside this module.

### 1.2 Data Models (Laravel migrations — table + column spec)

#### `personal_info_change_requests`
```
id                                  UUID, PK
employee_id                         UUID, FK -> employees
requested_marital_status            ENUM(single, married, divorced, widowed), nullable
requested_children_count            INT, nullable
requested_disabled_children_count   INT, nullable
requested_student_children_count    INT, nullable
computed_head_of_family_preview     BOOLEAN         -- read-only, shown to employee before submit
claimed_effective_date              DATE
status                              ENUM(pending, approved, rejected, needs_more_info)
submitted_at                        TIMESTAMP
reviewed_by                         UUID, FK -> users, nullable
reviewed_at                         TIMESTAMP, nullable
review_notes                        TEXT, nullable
affects_locked_payslips             BOOLEAN, default false
created_at / updated_at             TIMESTAMP
```
Indexes: `(employee_id, status)` — needed to enforce the "one active request" rule efficiently.

#### `change_request_documents`
```
id                       UUID, PK
change_request_id        UUID, FK -> personal_info_change_requests
document_type             ENUM(marriage_certificate, divorce_judgment, death_certificate,
                                birth_certificate, disability_certificate, school_enrollment_certificate)
file_path                 TEXT               -- Laravel storage disk path
uploaded_at                TIMESTAMP
verified_by_hr             BOOLEAN, default false
verified_by                UUID, FK -> users, nullable
verification_notes         TEXT, nullable
created_at / updated_at    TIMESTAMP
```

#### `fiscal_profile_groups`
```
id                                        UUID, PK
gender                                    ENUM(male, female)
marital_status                            ENUM(single, married, divorced, widowed)
head_of_family                            BOOLEAN     -- computed once at creation, stored for query performance
children_count                            INT
disabled_children_count                   INT, default 0
student_non_scholarship_children_count    INT, default 0
label                                     TEXT        -- auto-generated, e.g. "Married Male · Head of Family · 2 children"
created_at / updated_at                   TIMESTAMP
```
Unique constraint on: `(gender, marital_status, head_of_family, children_count, disabled_children_count, student_non_scholarship_children_count)` — this is the deduplication key. Always look up before creating.

#### `employee_fiscal_profile_assignments`
```
id                          UUID, PK
employee_id                  UUID, FK -> employees
fiscal_profile_group_id       UUID, FK -> fiscal_profile_groups
effective_from                DATE
effective_to                  DATE, nullable   -- set when superseded
source_change_request_id      UUID, FK -> personal_info_change_requests, nullable
assigned_by                   UUID, FK -> users     -- may be a system/AI-attributed user id for chatbot actions
assigned_at                    TIMESTAMP
created_at / updated_at        TIMESTAMP
```
Index: `(employee_id, effective_from, effective_to)` for fast "what profile applied on date X" lookups from the payslip engine.

#### `head_of_family_overrides` (rare manual exception path)
```
id                    UUID, PK
employee_id            UUID, FK -> employees
overridden_value       BOOLEAN
justification_note     TEXT              -- required, not nullable
document_file_path      TEXT, nullable
approved_by             UUID, FK -> users
approved_at              TIMESTAMP
created_at / updated_at   TIMESTAMP
```

### 1.3 API Endpoints (Laravel)

```
POST   /api/change-requests                  Employee submits a request (+ documents)
GET    /api/change-requests/{id}              View a request
GET    /api/change-requests?status=pending    HR review queue (paginated, filterable)
POST   /api/change-requests/{id}/documents    Upload/attach a document
PATCH  /api/change-requests/{id}/documents/{docId}/verify   HR marks a document verified
POST   /api/change-requests/{id}/approve      HR approves (blocked server-side if docs incomplete)
POST   /api/change-requests/{id}/reject       HR rejects (requires review_notes)

GET    /api/fiscal-profile-groups             List groups
POST   /api/fiscal-profile-groups              Create manually (still checks dedup)
GET    /api/fiscal-profile-groups/{id}/employees   List employees currently assigned

GET    /api/employees/{id}/fiscal-profile-history   Full dated assignment history
POST   /api/employees/{id}/fiscal-profile-overrides  Manual head-of-family override (admin-only)
```

### 1.4 Scenario Flow (build/test in this order)

1. Employee opens self-service form, selects what's changing (marital status and/or children counts).
2. Frontend calls a preview endpoint (or computes client-side using the same rule, mirrored) to show `computed_head_of_family_preview` — read-only display, never an input field.
3. Frontend dynamically shows required document upload fields based on the change-type table in 1.1.
4. Employee submits → `personal_info_change_requests` row created, `status = pending`, documents attached as `change_request_documents`.
5. HR opens review queue, opens each document, marks `verified_by_hr = true` individually.
6. HR attempts to approve:
   - Server checks every required document type for this specific change is present AND verified.
   - If a decrease in any children count is part of the request → force status to `needs_more_info` regardless, requiring an explicit HR note before proceeding.
   - If checks pass, proceed to step 7. If not, return a clear error listing exactly which document is missing/unverified.
7. On approval: compute the full attribute set → call `find_or_create_profile_group` logic → close current `employee_fiscal_profile_assignments` row (`effective_to` = day before `claimed_effective_date`) → create new assignment row.
8. If `claimed_effective_date` falls within a pay period with an existing `locked` payslip, set `affects_locked_payslips = true` and surface a banner/notification pointing HR to the existing Corrections workflow.
9. Write an `audit_log` entry (reuse existing table): action `fiscal_profile.change_approved`, actor = HR user, entity = the change request.

---

## Part 2 — AI Chatbot Assistant (FastAPI service)

### 2.1 Scope for this build

Build **one** primary use case first, fully working, before adding others:

**Bulk create-and-assign**: HR describes a fiscal profile in natural language; the AI parses it, finds/proposes the group, finds matching unassigned/mismatched employees, and — only after explicit confirmation — bulk-assigns them.

Do not build the simulation chatbot (net salary "what-if" questions) in this pass — that's explicitly deferred.

### 2.2 Non-negotiable rule for the whole chatbot

**The AI never writes directly to the database.** Every tool that would create, assign, or modify data must return a *proposed* action back to the Laravel backend / frontend, which displays it to HR for explicit confirmation. Only a separate, explicit "confirm" action (a real button click, translated into its own authenticated API call) actually executes the write. This must be true even for tool calls that look obviously correct to the model — no exceptions, since silent writes here directly affect real employees' fiscal profiles.

### 2.3 Architecture

```
React frontend (chat UI)
        │  user message
        ▼
FastAPI AI service  ──────────────►  Anthropic API (Claude)
        │  parses intent, calls tools (read-only + "propose" tools)
        │
        ├── read tools call Laravel API directly (server-to-server, read-only endpoints)
        └── "propose" tool results are returned to frontend as a structured card,
            NOT written anywhere yet
        │
        ▼
React frontend shows the proposed action + Confirm/Edit/Cancel
        │  HR clicks Confirm
        ▼
React calls Laravel's real write endpoint directly (NOT through the AI service)
        │
        ▼
Laravel executes the write (same code path as the manual UI), writes audit_log
```

Keeping the actual write on a normal authenticated Laravel endpoint (not executed by the AI service) is deliberate — it means the AI service can never be the sole gate between "HR clicked confirm" and "the database changed," and normal Laravel auth/authorization applies exactly as it would for any manual UI action.

### 2.4 Tools the FastAPI service exposes to the model

```python
# Read-only — safe to call freely, no confirmation needed

def find_matching_employees(gender: str | None = None,
                             marital_status: str | None = None,
                             children_count: int | None = None,
                             disabled_children_count: int | None = None,
                             student_children_count: int | None = None,
                             exclude_group_id: str | None = None) -> list[dict]:
    """Calls Laravel GET /api/employees/fiscal-search (read-only endpoint to add).
    Returns employee id, name, current fiscal_profile_group_id/label if any."""

def get_fiscal_profile_group(gender: str, marital_status: str,
                              children_count: int,
                              disabled_children_count: int = 0,
                              student_children_count: int = 0) -> dict | None:
    """Calls Laravel GET /api/fiscal-profile-groups?match=... 
    Returns existing group if found, else None."""

def get_current_family_deduction_limits() -> dict:
    """Calls Laravel GET on the active fiscal_rule_sets to fetch max children count,
    used to validate the HR's request before proposing anything."""


# Propose-only — returns a structured draft, writes NOTHING

def propose_profile_group(gender: str, marital_status: str,
                           children_count: int,
                           disabled_children_count: int = 0,
                           student_children_count: int = 0) -> dict:
    """Computes head_of_family via the fixed rule (see 1.1), checks for an existing
    matching group via get_fiscal_profile_group, and returns either:
      { exists: true, group_id, label }
      or
      { exists: false, proposed: { ...attributes, computed_head_of_family, label } }
    Never creates anything in the database."""

def propose_bulk_assignment(employee_ids: list[str], group: dict,
                             effective_from: str) -> dict:
    """Returns a structured, human-readable proposal: which employees, which group,
    which effective date, and which of them currently have a different active
    assignment (so HR sees exactly what will change). Writes NOTHING."""
```

There is intentionally **no** `create_profile_group` or `bulk_assign_employees` tool exposed to the model at all — the actual write endpoints (`POST /api/fiscal-profile-groups`, a new `POST /api/fiscal-profile-groups/{id}/bulk-assign`) are called directly by the React frontend after HR clicks Confirm, using the exact payload the `propose_*` tool returned, not re-derived by the AI.

### 2.5 System prompt guidance for the model (for the FastAPI service to send)

Key behaviors to encode in the system prompt:
- Always call `propose_profile_group` before describing a group as "creatable" — never assert a group doesn't exist from memory.
- Always call `find_matching_employees` before offering to assign anyone — never assume a count.
- If the HR message implies a head-of-family value that contradicts the fixed computation rule (e.g. "divorced men, not head of family"), do not comply or silently override — respond that this conflicts with the configured rule and ask whether they want the standard computed value applied, or want to initiate a manual override (which requires a justification note and routes to the `head_of_family_overrides` flow, not this chat).
- If children_count or marital_status is ambiguous or unspecified in the request, ask a clarifying question — these fields are part of the group's unique identity, so guessing risks creating a duplicate or wrong group.
- Never state that an action (group creation, assignment) is complete unless a `proposed_*` tool call actually ran and the frontend confirms the subsequent write endpoint succeeded — the AI service has no independent way of knowing a write happened.

### 2.6 Example conversation the implementation should pass as a test case

```
HR: "create a profile for married men with 2 children and assign anyone who matches"

AI: [calls propose_profile_group(gender=male, marital_status=married, children_count=2)]
    → not found, computed head_of_family=true
    [calls find_matching_employees(gender=male, marital_status=married, children_count=2)]
    → 7 employees found

AI replies: "I'll create: Married Male · Head of Family · 2 children.
             7 employees match and don't currently have this profile.
             Want me to list them before assigning, or assign all 7 now?"

HR: "show me the list"
AI: [renders the 7 names + current profile status, from the same tool result already fetched]

HR: "assign them but skip Ahmed Trabelsi"
AI: [calls propose_bulk_assignment(employee_ids=<6 ids, excluding Ahmed>, group=<proposed group>, effective_from=today)]
    → returns structured proposal

AI replies: "Ready to assign 6 employees to Married Male · Head of Family · 2 children,
             effective 2026-07-16. Ahmed Trabelsi excluded. Confirm?"

HR: clicks "Confirm" button in UI (not a typed message)
→ React calls POST /api/fiscal-profile-groups (creates group, or reuses if now exists)
→ React calls POST /api/fiscal-profile-groups/{id}/bulk-assign with the 6 ids + date
→ Laravel writes fiscal_profile_groups + employee_fiscal_profile_assignments rows,
  closes prior assignments, writes audit_log entry: action "fiscal_profile.bulk_assigned_via_ai"
→ React shows success + re-renders chat with a confirmation message
```

### 2.7 Audit logging specific to chatbot actions

Every write that originated from a chat-confirmed action must be tagged distinctly in `audit_log` (e.g. `action = "fiscal_profile.bulk_assigned_via_ai"` vs `"fiscal_profile.bulk_assigned_manual"`), and the `ai_chat_messages` record that produced the proposal should be linked via a foreign key so HR (or an auditor) can trace back from any assignment to the exact chat exchange that led to it.

#### `ai_chat_sessions`
```
id            UUID, PK
user_id        UUID, FK -> users
context_type    ENUM(profile_group_creation)   -- only this value used in this build
created_at / updated_at   TIMESTAMP
```

#### `ai_chat_messages`
```
id                    UUID, PK
session_id             UUID, FK -> ai_chat_sessions
role                    ENUM(user, ai)
content                 TEXT
proposed_action_json    JSONB, nullable
created_at               TIMESTAMP
```

#### `audit_log` addition
Add `source_ai_chat_message_id` (nullable FK) to the existing `audit_log` table, populated only when the triggering action came from a confirmed chat proposal.

---

## Build Order Checklist

- [ ] `personal_info_change_requests` + `change_request_documents` migrations
- [ ] `fiscal_profile_groups` + `employee_fiscal_profile_assignments` + `head_of_family_overrides` migrations
- [ ] Head-of-family computation as an isolated, unit-tested service method
- [ ] Employee self-service request form (React) with dynamic document requirements
- [ ] HR review queue + document verification UI
- [ ] Server-side approval gate (blocks on missing/unverified required documents)
- [ ] Group dedup logic (`find_or_create` pattern) wired into the approval flow
- [ ] Locked-payslip conflict flag on approval, linked to existing Corrections workflow
- [ ] `audit_log` entries for every request submission, approval, rejection, override
- [ ] FastAPI service scaffold with the read-only + propose-only tools (2.4)
- [ ] System prompt implementing 2.5 behaviors
- [ ] React chat UI rendering proposal cards with explicit Confirm/Cancel
- [ ] New Laravel write endpoints for group creation + bulk assignment, called only after chat confirmation
- [ ] `ai_chat_sessions`/`ai_chat_messages` tables + `audit_log.source_ai_chat_message_id` link
- [ ] Test the full example conversation in 2.6 end to end