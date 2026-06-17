# TacTic AI Service

FastAPI microservice that powers HR analytics for the TacTic platform: **attendance risk forecasting**, **employee performance scoring**, and **job–candidate matching**. It reads live data from the shared PostgreSQL database (`tactic_db`) and returns explainable results in French for the RH dashboard and job-matching UI.

The Laravel backend proxies all frontend requests to this service at `http://127.0.0.1:8001`. The React frontend never calls this service directly.

---

## Architecture overview

```
PostgreSQL (tactic_db)
        │
        ▼
  DataPipeline          ← SQLAlchemy queries + Pandas feature engineering
        │
        ├── AttendancePatternEngine   ← live attendance inference
        ├── PerformanceScorer         ← live performance inference
        └── MatchingScorer            ← live matching inference
        │
        ▼
  PredictionService  →  FastAPI routes  →  Laravel /api/ai/*  →  React
```

| Layer | Path | Role |
|-------|------|------|
| API | `app/api/endpoints/` | HTTP routes (predictions, matching, training) |
| Orchestration | `app/services/prediction_service.py` | Coordinates scorers and builds API responses |
| Feature engineering | `app/services/data_pipeline.py` | Loads and aggregates DB data into feature matrices |
| Live inference | `app/services/*_scorer.py`, `attendance_pattern_engine.py` | Interpretable algorithms used at request time |
| ML model definitions | `app/models/*_model.py` | PyTorch architectures (training only; not used in live API) |
| Schemas | `app/models/schemas.py` | Pydantic response contracts |
| Optional NLP | `app/utils/groq_client.py` | Groq LLM skill extraction when job posts lack skill tags |

> **Important:** Live API responses are produced by **interpretable rule-based scorers**, not by loading `.pt` weights. PyTorch models exist for optional offline training; the `/api/train/*` endpoints are currently disabled.

---

## 1. Attendance model

### Role

Analyse each employee’s **attendance patterns** over the last 6 months and forecast absence risk for the **next 7 business days**. Outputs include:

- Per-day absence probability and risk level (`low` / `medium` / `high`)
- Detected patterns (e.g. recurring Monday absences, declining attendance)
- `alert_dates` for HR preventive action
- French `recommendation` text (e.g. contact employee before a risky date)

Laravel can broadcast `PredictedAbsenceAlert` events to RH when upcoming alert dates are detected.

### Live implementation

| Component | File |
|-----------|------|
| Inference engine | `app/services/attendance_pattern_engine.py` |
| Feature aggregation | `app/services/data_pipeline.py` → `build_attendance_features()`, `build_leave_features()` |
| API entry | `GET /api/predictions/attendance/all`, `GET /api/predictions/attendance/{user_id}` |

### Libraries & tools

| Library | Usage |
|---------|--------|
| **Pandas** | Time-series slicing, weekday grouping, presence/absence flags |
| **NumPy** | Averages, clamping, risk aggregation |
| **SQLAlchemy** | Queries on `pointages`, `conges` |
| **Python `datetime`** | 7-day business-day forecast, approved-leave calendar overlay |

### Algorithm (live inference)

**Pattern detection** (rule-based, explainable):

| Signal | Method |
|--------|--------|
| Weekday habit | Absence rate per Mon–Fri; flag if ≥ 40% and ≥ 3 absences on that weekday in last 8 weeks |
| Recent trend | Compare presence rate: last 14 days vs previous 30 days |
| Absence streak | Count consecutive recent absences (last 30 days) |
| Frequent lateness | `late_rate` ≥ 25% (late = after **09:15**, aligned with Laravel) |

**7-day forecast** (per business day):

```
absence_prob = weekday_baseline × 0.5
             + max(0, -recent_trend) × 0.5 × 0.3
             + behavior_penalty × 0.2
             + pattern_boost (0.08 if any pattern detected)
```

- `weekday_baseline` = historical absence rate for that weekday (`dow_0` … `dow_4`)
- `behavior_penalty` combines late rate, early departure, leave frequency, sick-leave ratio, attendance streak bonus
- Approved future `conges` → probability forced to **0.95** (planned leave, not an alert)

**Alert rule:** flag a date when `absence_probability ≥ 0.55`, or when a pattern exists and `≥ 0.40`.

### PyTorch model (dormant — training only)

| Item | Detail |
|------|--------|
| File | `app/models/attendance_model.py` |
| Architecture | **2-layer LSTM** (hidden=64) → FC → Sigmoid |
| Input | `(batch, 30, 7)` — 30-day window, 7 daily features |
| Output | `(batch, 7)` — per-day presence probabilities |
| Features | `was_present`, `hours_norm`, `was_late`, `dow`, `on_leave`, `month_sin`, `month_cos` |
| Training loss | `BCELoss` |
| Saved weights | `trained_models/attendance_lstm.pt` |
| Libraries | **PyTorch**, **NumPy**, **scikit-learn** (metrics during training) |

Not wired to live inference. Kept for future ML-based forecasting if training is re-enabled.

---

## 2. Performance model

### Role

Assign each employee a **performance score from 0 to 100** and a letter grade (**A–F**) based primarily on **attendance behaviour**. Returns:

- `score_factors` — breakdown (presence, punctuality, hours consistency, justified absences)
- `grade_label` — French label (e.g. *Satisfaisant* for grade C)
- `summary` — one-paragraph explanation for non-technical users

When the `performance_reviews` table contains chef/team-leader feedback, scores blend **70% attendance + 30% chef feedback** automatically.

### Live implementation

| Component | File |
|-----------|------|
| Inference engine | `app/services/performance_scorer.py` |
| Features | `app/services/data_pipeline.py` → `build_employee_features()` |
| Chef reviews | `data_pipeline.get_chef_reviews()` (auto-detects `performance_reviews` table) |
| API entry | `GET /api/predictions/performance/all`, `GET /api/predictions/performance/{user_id}` |

### Libraries & tools

| Library | Usage |
|---------|--------|
| **Pandas** | Employee feature rows (presence, late rate, hours, tenure, etc.) |
| **SQLAlchemy** | `pointages`, `conges`, `utilisateur_competence`, `utilisateurs` |

### Algorithm (live inference)

Weighted **attendance composite** (0–100):

| Factor | Weight | Source |
|--------|--------|--------|
| Présence (presence rate) | 45% | `pointages` — share of days with check-in |
| Ponctualité (punctuality) | 30% | Inverse of `late_rate` (after 09:15) |
| Régularité horaire | 15% | Consistency of `duree_travail` vs 8 h target |
| Absences justifiées | 10% | `justified_absence_ratio` from `conges` / `pointages` |

**Grades:**

| Score | Grade | Label (FR) |
|-------|-------|------------|
| ≥ 90 | A | Excellent |
| ≥ 80 | B | Très bien |
| ≥ 65 | C | Satisfaisant |
| ≥ 50 | D | À améliorer |
| < 50 | F | Insuffisant |

Each factor gets a status: `good` (≥ 75), `average` (≥ 50), `poor` (< 50).

### PyTorch model (dormant — training only)

| Item | Detail |
|------|--------|
| File | `app/models/performance_model.py` |
| Architecture | **Feedforward NN** (9 → 64 → 32 → 16 → 1) with BatchNorm, ReLU, Dropout |
| Input | 9 features: presence, hours, late rate, leave stats, skills, tenure, overtime |
| Output | Sigmoid × 100 → score 0–100 |
| Labels | Pseudo-labels: attendance 40% + skills 30% + tenure 20% + overtime 10% |
| Saved weights | `trained_models/performance_ffn.pt` |
| Libraries | **PyTorch**, **scikit-learn** |

---

## 3. Matching model

### Role

Rank **all active employees** against a job post and return the best candidates with:

- Overall match score (0–100)
- `verdict` — *Très bon profil* / *Profil intéressant* / *Profil partiel*
- `reasons[]` — plain French explanations (skills, attendance, tenure, availability)
- `score_breakdown` — contribution per criterion
- `has_applied` — whether the employee already applied via `job_applications`

### Live implementation

| Component | File |
|-----------|------|
| Inference engine | `app/services/matching_scorer.py` |
| Features | `app/services/data_pipeline.py` → `build_matching_features()` |
| Skill details | `prediction_service._build_skill_details()` |
| Optional skill inference | `app/utils/groq_client.py` when `job_post_competence` is empty |
| API entry | `POST /api/match` with `{ "job_post_id": int }` |

### Libraries & tools

| Library | Usage |
|---------|--------|
| **Pandas** | Per-employee feature vectors, skill overlap |
| **SQLAlchemy** | `job_posts`, `job_post_competence`, `utilisateur_competence`, `job_applications` |
| **Groq API** (optional) | Extract required skills from job title/description when none are tagged |

### Algorithm (live inference)

**Weighted multi-criteria score:**

| Criterion | Weight | Computation |
|-----------|--------|-------------|
| Compétences (skills) | 50% | `weighted_skill_match` — level-aware overlap vs `job_post_competence` |
| Assiduité (attendance) | 25% | `presence_rate` from `pointages` |
| Ancienneté (tenure) | 15% | `min(tenure_years / 10, 1)` |
| Disponibilité | 10% | `DISPONIBLE` = 1.0, `AFFECTE` = 0.5, else 0 |

**Skill overlap** (per required competence):

```
weighted_match = min(candidate_level / required_level, 1.0)
skill_overlap_ratio = |overlap| / |required|
```

**Verdict thresholds:** ≥ 70 → *Très bon profil*; ≥ 40 → *Profil intéressant*; else *Profil partiel*.

Reason strings are generated from templates (matched/missing skills, attendance %, tenure, application status).

### PyTorch model (dormant — training only)

| Item | Detail |
|------|--------|
| File | `app/models/matching_model.py` |
| Architecture | **Feedforward NN** (7 → 64 → 32 → 16 → 1) + Sigmoid |
| Input | 7 features: skill overlap, skill gap, weighted match, attendance, leave load, tenure, availability |
| Training labels | Synthetic: skills 50% + attendance 20% + tenure 15% + availability 15% + noise |
| Saved weights | `trained_models/matching_nn.pt` |
| Libraries | **PyTorch**, **scikit-learn** |

---

## Shared infrastructure

### Data sources (PostgreSQL)

| Table | Used by |
|-------|---------|
| `pointages` | Attendance, performance, matching |
| `conges` | Attendance patterns, performance, leave features |
| `utilisateurs` | All models (employee metadata, status, hire date) |
| `utilisateur_competence`, `competences` | Performance (skill count), matching |
| `job_posts`, `job_post_competence` | Matching |
| `job_applications` | Matching (`has_applied` badge) |
| `performance_reviews` | Performance (optional chef feedback blend) |

Default lookback window: **6 months** of attendance and leave data.

### Core stack

| Library | Version (see `requirements.txt`) | Role |
|---------|----------------------------------|------|
| **FastAPI** | 0.115 | HTTP API framework |
| **Uvicorn** | 0.32 | ASGI server |
| **Pydantic** | 2.9 | Request/response validation |
| **SQLAlchemy** | 2.0 | PostgreSQL ORM / raw queries |
| **psycopg2-binary** | 2.9 | PostgreSQL driver |
| **Pandas** | 2.2 | Feature engineering, vectorized aggregations |
| **NumPy** | 2.0 | Numerical operations |
| **PyTorch** | ≥ 2.1 | Offline model training only |
| **scikit-learn** | 1.5 | Training metrics / preprocessing |
| **APScheduler** | 3.10 | Weekly retrain scheduler (orphaned while training API is disabled) |
| **python-dotenv** | 1.0 | Environment configuration |

---

## API endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/health` | Service health check |
| `GET` | `/api/predictions/attendance/all` | All employees — attendance summaries + alerts |
| `GET` | `/api/predictions/attendance/{user_id}` | Single employee — 7-day forecast + patterns |
| `GET` | `/api/predictions/performance/all` | All employees — ranked performance scores |
| `GET` | `/api/predictions/performance/{user_id}` | Single employee performance |
| `GET` | `/api/predictions/dashboard-kpis` | Aggregated KPIs (attendance + performance) |
| `POST` | `/api/match` | Job–candidate recommendations |
| `POST` | `/api/train/{model}` | **Disabled** — returns status message |
| `GET` | `/api/train/status` | **Disabled** — training status stub |

---

## Running the service

### Prerequisites

- Python **3.9**
- PostgreSQL on port **5433**, database `tactic_db`
- Seeded data (`php artisan db:seed` in the Laravel backend)

### Environment

Copy `.env.example` to `.env` and set:

```env
DATABASE_URL=postgresql://postgres:admin@127.0.0.1:5433/tactic_db
ENABLE_SCHEDULER=false
```

Optional Groq skill extraction:

```env
GROQ_API_KEY=your_key_here
```

### Start (Windows PowerShell)

```powershell
$env:PYTHONPATH = "C:\PFE_TACTIC\ai-service"
$env:DATABASE_URL = "postgresql://postgres:admin@127.0.0.1:5433/tactic_db"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

> Do **not** use `--reload` on Windows with PyTorch installed — subprocess import issues can occur.

### Tests

```powershell
$env:PYTHONPATH = "C:\PFE_TACTIC\ai-service"
python -m pytest tests/ -v
```

---

## Design philosophy

The service prioritises **explainability** over black-box ML for production inference:

1. RH users see **why** a score or alert was produced (French labels, factor breakdowns, pattern descriptions).
2. Algorithms use **transparent weights** that can be audited and adjusted without retraining.
3. PyTorch models remain available for **future experimentation** and optional weekly retraining via `app/services/training_service.py` when the training API is re-enabled.

---

## File map

```
ai-service/
├── app/
│   ├── main.py                          # FastAPI entry point
│   ├── api/endpoints/
│   │   ├── predictions.py               # Attendance & performance routes
│   │   ├── matching.py                  # Job matching route
│   │   └── training.py                  # Training routes (disabled)
│   ├── models/
│   │   ├── attendance_model.py          # LSTM (training only)
│   │   ├── performance_model.py         # FFN (training only)
│   │   ├── matching_model.py            # NN (training only)
│   │   └── schemas.py                   # Pydantic API schemas
│   ├── services/
│   │   ├── attendance_pattern_engine.py # Live attendance inference
│   │   ├── performance_scorer.py        # Live performance inference
│   │   ├── matching_scorer.py           # Live matching inference
│   │   ├── prediction_service.py        # Orchestrator
│   │   ├── data_pipeline.py             # Feature engineering
│   │   ├── training_service.py          # Offline training orchestration
│   │   └── scheduler.py                 # APScheduler weekly retrain
│   └── utils/
│       ├── database.py                  # SQLAlchemy session
│       └── groq_client.py               # Optional Groq LLM client
├── trained_models/                      # .pt weights (gitignored)
├── tests/
│   ├── test_api_smoke.py
│   └── test_scorers.py
├── requirements.txt
└── README.md
```
