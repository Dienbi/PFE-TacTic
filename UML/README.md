# UML Diagrams — TacTic HR Platform

PlantUML source files aligned with the LaTeX report chapters. Export PNG images into `Report/images/` using the filenames referenced in each chapter.

## Release 1 — Sprint 1 & 2 (`chap_03.tex`)

| File | Description | Report image target |
|------|-------------|---------------------|
| `release1/use-case.puml` | Release 1 use case diagram | `images/release1 use case.jpg` |
| `release1/authenticate-sequence.puml` | Authenticate | `images/authentication sequence.jpg` |
| `release1/modify-account-sequence.puml` | Modify Account | `images/modify profile.jpg` |
| `release1/check-in-sequence.puml` | Check In | `images/check in sequence.drawio.png` |
| `release1/check-attendance-sequence.puml` | Check Attendance | `images/check-attendance.drawio.png` |

## Release 2 — Sprint 3 & 4 (`chap_04.tex`)

| File | Description | Report image target |
|------|-------------|---------------------|
| `release2/use-case.puml` | Release 2 use case diagram | `images/release2 use case.jpg` |
| `release2/leave-request-sequence.puml` | Request Leave | `images/leave request sequence.drawio.png` |
| `release2/approve-leave-sequence.puml` | Approve Leave Request | `images/approve leave sequence.drawio.png` |
| `release2/generate-payroll-sequence.puml` | Generate Payroll | `images/generate payroll sequence.drawio.png` |
| `release2/view-payslip-sequence.puml` | View and Download Payslip | `images/view payslip sequence.drawio.png` |

## Release 3 — Sprint 5 & 6 (`chap_05.tex`)

| File | Description | Report image target |
|------|-------------|---------------------|
| `release3/use-case.puml` | Release 3 use case diagram | `images/release3 use case.jpg` |
| `release3/create-job-request-sequence.puml` | Create Job Post Request | `images/create job request sequence.drawio.png` |
| `release3/apply-job-sequence.puml` | Apply to Job Post | `images/apply job sequence.drawio.png` |
| `release3/ai-match-sequence.puml` | AI Match Candidates | `images/ai match sequence.drawio.png` |
| `release3/ai-dashboard-sequence.puml` | Consult AI KPI Dashboard | `images/ai dashboard sequence.drawio.png` |
| `release3/attendance-risk-sequence.puml` | View Attendance Risk Predictions | `images/attendance risk sequence.drawio.png` |

## Legacy — Sprint 3 only (`sprint3/`)

The `sprint3/` folder contains earlier Sprint 3-only diagrams. Equivalent leave diagrams also exist under `release2/`.

## Export

```powershell
# Option A — PlantUML JAR (requires Java)
Invoke-WebRequest -Uri "https://github.com/plantuml/plantuml/releases/download/v1.2024.8/plantuml-1.2024.8.jar" -OutFile "UML/plantuml.jar"
cd UML
java -jar plantuml.jar -tpng release1/*.puml release2/*.puml release3/*.puml

# Option B — node-plantuml via npx
cd UML/release3
npx --yes node-plantuml -o . *.puml
```

Copy or rename generated PNG files into `Report/images/` to match the paths in `chap_03.tex`, `chap_04.tex`, and `chap_05.tex`.
