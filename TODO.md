# TODO

## Plan: Fix RH Navbar placement + Employees table missing buttons

### Step 1 — Inspect layout/css

- [ ] Identify how Navbar is positioned relative to sidebar and page top.
- [x] Fix Navbar “not in right place at top of the app” (sticky positioning + correct z-index).

### Step 2 — Fix Employees table actions visibility

- [x] Locate why the 3 action buttons are not displayed (likely CSS width/overflow).
- [x] Update `frontend/src/dashboard/rh/employees/Employees.css` (actions column sizing + nowrap).

### Step 3 — Verify

- [ ] Run frontend dev/build to ensure no layout regressions.
- [ ] Manually check /employees page and navbar alignment.
