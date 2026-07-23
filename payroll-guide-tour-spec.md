# Payroll Module – Guided Product Tour Specification

## 1. Objective

Build an in-app guided tour ("Take a Tour" / "?" help button) for the Payroll Management module. When the user clicks the trigger button, an interactive walkthrough starts: it highlights UI elements one at a time and shows a popup (tooltip/popover) next to each element with a short explanation of what it is and how to use it.

The tour must cover every screen listed in Section 4, in the order given, and must be resumable per-screen (i.e. the user can also launch the tour scoped to just the screen they're currently on).

## 2. Recommended Implementation Approach

- Use a step-based tour/onboarding library rather than building highlighting/positioning logic from scratch. Good options compatible with most web stacks:
  - **Shepherd.js** (framework-agnostic, flexible popovers)
  - **Intro.js**
  - **Driver.js** (lightweight, good for spotlight-style highlighting)
  - **react-joyride** (if the frontend is React)
- Target elements via **stable `data-tour="..."` attributes** added directly in the markup, not CSS classes or DOM order, so the tour doesn't break when styling changes.
- Each tour step is defined as a config object: `{ target, title, content, placement, action? }`, stored in a central `payrollTourSteps.js` (or per-module file) so content can be edited without touching component code.

## 3. Core Behavior Requirements

1. **Entry point**: A persistent "Guide me" / "?" button in the payroll module header. Also allow a per-screen "Guide this page" shortcut.
2. **Spotlight + popup**: Dim the background, highlight the target element with a border/glow, and show a popup anchored next to it (auto-flip placement if it would overflow the viewport).
3. **Popup content**: Title (element name), short description (1–3 sentences, plain language, action-oriented — tell the user *what it is* and *what to do*), and navigation controls: `Back`, `Next`, `Skip tour`, step counter (e.g. "3 / 9").
4. **Multi-step flows**: When a step requires an action to reveal the next element (e.g. opening a modal to generate a payslip), the tour must wait for that UI state before advancing, or provide a "Next" that triggers/simulates the navigation itself.
5. **Cross-page navigation**: If a tour step lives on a different route/tab (e.g. moving from Dashboard to Payslip Generation), the tour should auto-navigate the user there and continue.
6. **Exit & resume**: User can close the tour anytime; store progress (localStorage or user preference) so it doesn't force-restart, and always allow manually relaunching from scratch.
7. **First-login auto-trigger (optional)**: Offer to auto-start the tour the first time a user opens the Payroll module, dismissible permanently.
8. **Responsive**: Tour must work on smaller/tablet screens (stack popup below/above target instead of side placement when space is limited).
9. **No blocking of real data actions**: The tour should preferably run against real UI (not a fake demo screen) but must never actually submit/save data during the walkthrough (e.g. clicking "Next" through a "Generate Payslip" step should not create a real payslip unless the user explicitly does it outside tour mode).

## 4. Tour Content — Module by Module

Use this section as the source of truth for step copy. Each bullet below = one tour step (title + description). The agent can refine wording but must preserve the meaning and order.

### 4.1 Dashboard
1. **Welcome** – "Welcome to the Payroll module. This tour will walk you through everything you can do here."
2. **KPIs** – "These cards show your key payroll metrics at a glance (e.g. total payroll cost, employees paid, pending payslips)."
3. **Quick actions** – "Use these shortcuts to jump straight into common tasks like generating a payslip or recording a payment, without navigating through menus."
4. **Recent activity tab** – "This tab shows the latest actions performed in payroll — useful for a quick daily check of what changed."
5. **Payroll modules list** – "This is your main menu into the payroll module: Payslip Generation, Record Payment, End-of-Year Regularization, Fiscal Rules, Rule Import (AI), and Audit Log. Click any item to open it."

### 4.2 Payslip Generation
1. **Overview** – "Here you can view existing payslips or generate new ones for a single employee or in batch."
2. **Existing payslips list** – "Browse and filter all previously generated payslips here."
3. **Generate single payslip** – "Click here to generate a payslip for one employee. It will be created in **Draft** status."
4. **Batch generation** – "Use this option to generate payslips for multiple employees at once, e.g. for the whole company on payday."
5. **Draft status** – "A newly generated payslip starts as **Draft** — it's editable and not yet final."
6. **Confirm payslip** – "Once you're satisfied with the details, click **Confirm** to move the payslip forward."
7. **Lock payslip** – "**Lock** finalizes the payslip completely — it can no longer be edited or deleted after this."
8. **Delete rule** – "Note: a payslip can only be deleted while still in Draft, before it's been validated. After validation, corrections must be made through a corrected version instead."
9. **Link to correction** – "Need to fix a validated payslip? Go to the **Payslip Correction** module (covered next)."

### 4.3 Payslip Correction
1. **Overview** – "This module lets you correct a payslip that has already been validated, without deleting the original record."
2. **Create correction** – "Select a validated payslip and click here to create a corrected version. This generates a **new version** of the payslip."
3. **Superseded marking** – "The original payslip is automatically marked as **Superseded** and kept for record-keeping — it's no longer active but stays visible in the history."
4. **Version history** – "Here you can view the full version history of a payslip: every correction, who made it, and when."

### 4.4 Record Payment
1. **Overview** – "Use this screen to record that an employee has actually been paid."
2. **Payment date** – "Enter the date the payment was made to the employee."
3. **Payment method** – "Select how the payment was made (e.g. bank transfer, check, cash)."
4. **Link to payslip** – "Payments are linked to a specific payslip so you always know what was paid for."

### 4.5 End-of-Year Regularization
1. **Overview** – "At year-end, use this module to recalculate each employee's total payments and taxes for the year and correct any discrepancies."
2. **Recalculation** – "Click here to have the system recalculate the amount an employee *should* have paid in tax over the year, based on their full annual earnings."
3. **Comparison** – "The system automatically compares the recalculated amount to what was actually paid during the year."
4. **Regularization payslip** – "If there's a difference (employee paid too much or too little tax), the system generates a **regularization payslip** to correct it automatically."

### 4.6 Fiscal Rules Management
1. **Overview** – "This is where you define the tax rules used to calculate payslips."
2. **Create rule set** – "Click here to create a new fiscal rule set, e.g. for a given fiscal year."
3. **Tax variables** – "Set the tax variables that apply, such as tax brackets and thresholds."
4. **IRPP value** – "Configure the IRPP (income tax) value used in calculations."
5. **Family deduction** – "Set the family deduction values applied based on employee dependents."
6. **Apply rule set** – "Once configured, apply this rule set so it's used automatically in payslip calculations going forward."

### 4.7 Rule Import (AI)
1. **Overview** – "This tool uses AI to help you keep fiscal rules up to date automatically."
2. **Upload PDF** – "Upload the official PDF document of the Tunisian fiscal law (e.g. the latest finance law)."
3. **AI extraction** – "The AI will read the document and extract the relevant tax values (IRPP brackets, deductions, etc.)."
4. **Comparison to existing rules** – "The system compares the extracted values to your current fiscal rule set and highlights what has changed."
5. **Review & apply** – "Review the detected changes before applying them — nothing updates automatically without your confirmation."

### 4.8 Audit Log
1. **Overview** – "Every action taken in the payroll module is logged here for traceability and compliance."
2. **Log details** – "For each entry you can see **what** action was performed, **who** performed it, and **when** it happened."
3. **Filtering/search** – "Use filters to search the log by user, action type, or date range."

## 5. Content/Style Guidelines for Popup Text

- Keep each description to 1–3 short sentences.
- Always explain **what the element is** and, where relevant, **what happens when you use it**.
- Use plain, non-technical language (the end users are HR staff, not developers).
- Bold key status words (Draft, Confirmed, Locked, Superseded) consistently across the app and the tour for recognizability.
- Avoid marketing tone; be instructional and concise.

## 6. Acceptance Criteria

- [ ] Tour is triggered from a visible "Guide me" button in the payroll module.
- [ ] Every element listed in Section 4 has a corresponding highlighted step with a popup.
- [ ] Tour correctly navigates across screens/tabs where needed.
- [ ] User can skip, go back, or exit at any point.
- [ ] Tour does not create/modify/delete real payroll data.
- [ ] Tour is responsive on tablet/smaller screens.
- [ ] Progress/completion state is remembered per user.