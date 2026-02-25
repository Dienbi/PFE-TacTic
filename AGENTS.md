# Repository Context for Jules

## Project Overview

**TacTic** is an AI-powered HR management platform with three services:

| Service     | Stack                          | Port |
| ----------- | ------------------------------ | ---- |
| Backend API | Laravel 10 (PHP 8.2)           | 8000 |
| Frontend    | React 18 + TypeScript          | 3000 |
| AI Service  | FastAPI + PyTorch (Python 3.9) | 8001 |

---

## Architecture

```
frontend/          React + TypeScript SPA (Create React App)
backend/           Laravel REST API (JWT auth, PostgreSQL)
ai-service/        FastAPI AI microservice (PyTorch models)
docker/            Docker Compose config (optional)
```

The frontend calls the Laravel backend at `http://127.0.0.1:8000/api`.
The Laravel backend proxies AI requests to the Python service at `http://127.0.0.1:8001`.
The frontend never calls the Python service directly.

---

## Database

- **Engine:** PostgreSQL running on port **5433** (not the default 5432)
- **Database name:** `tactic_db`
- **User:** `postgres` / **Password:** `admin`
- **Migrations:** `backend/database/migrations/`
- **Seeders:** `backend/database/seeders/FullDataSeeder.php` — 50 employees, 6 months of attendance, payroll, leaves

**Key tables:** `utilisateurs`, `pointages`, `conges`, `paies`, `equipes`, `postes`, `affectations`, `competences`, `utilisateur_competence`, `job_posts`, `job_applications`, `ai_recommendations`

**Rules:**

- Do not modify existing migration files; always create new ones.
- Soft deletes (`deleted_at`) are used on `utilisateurs`.
- All monetary amounts (salaries, payroll) are stored as `decimal(10,2)`.
- `duree_travail` in `pointages` is `decimal(4,2) NOT NULL DEFAULT 0` — never insert `null`.

---

## Backend (Laravel)

- **Auth:** JWT via `php-open-source-saver/jwt-auth`. Token field in response is `access_token`.
- **Roles:** `RH`, `chef_equipe`, `employe` — enforced via `role:` middleware on routes.
- **Cache:** Uses `file` driver (Redis is not available in dev). `CACHE_DRIVER=file` in `.env`.
- **API prefix:** All routes are under `/api/` — defined in `backend/routes/api.php`.
- **Route ordering:** Static routes (e.g. `/train/status`) must be declared **before** parameterized routes (e.g. `/train/{model}`) in the same group.
- **AI proxy:** `app/Services/AIService.php` forwards requests to the Python service. Timeout is 120s for reads, 300s for training.
- **Config:** AI service URL is in `config/services.php` → `services.ai.url` (env: `AI_SERVICE_URL`).

**Rules:**

- Always use `response()->json()` for API responses.
- Use repository pattern: controllers → services → repositories.
- Do not use `DB::raw()` without sanitizing input.
- Use `php artisan make:migration` for schema changes, never edit existing migration files.
- CORS is configured in `config/cors.php` — allowed origins: `http://localhost:3000`, `http://127.0.0.1:3000`.

---

## Frontend (React + TypeScript)

- **API client:** `frontend/src/api/client.ts` (Axios, base URL `http://127.0.0.1:8000/api`).
- **Auth token:** Stored in `localStorage` as `token`. Header: `Authorization: Bearer <token>`.
- **AI API client:** `frontend/src/api/aiApi.ts` — all AI calls go through Laravel proxy (`/ai/...`).
- **Routing:** React Router v6, protected routes by role.
- **UI:** Custom CSS (no Tailwind). Icons via `lucide-react`.

**Module structure:**

```
src/auth/          Login, register, JWT handling
src/dashboard/rh/  RH Dashboard with AI components
src/attendance/    Pointage (check-in/out)
src/leave/         Congé management
src/payroll/       Paie management
src/jobmatching/   Job posts, applications, AI matching
src/shared/        Sidebar, Navbar, reusable hooks
```

**Rules:**

- Always use `async/await` with try/catch in API calls.
- Use optional chaining (`?.`) when accessing nested API response fields.
- TypeScript interfaces must match actual API response field names exactly — the backend uses `snake_case`.
- Never call `http://localhost:8001` directly from the frontend; always go through the Laravel proxy at `/api/ai/...`.
- `npm start` runs the dev server; `npm run build` for production.

---

## AI Service (Python / FastAPI)

- **Entry point:** `ai-service/app/main.py`
- **Models directory:** `ai-service/app/models/` (PyTorch model classes + Pydantic schemas)
- **Services:** `ai-service/app/services/` (training, prediction, scheduler)
- **Trained model files:** saved to `ai-service/trained_models/` (`.pt` files, gitignored)
- **DB connection:** Uses SQLAlchemy with `DATABASE_URL` from `.env` → `postgresql://postgres:admin@127.0.0.1:5433/tactic_db`
- **Scheduler:** APScheduler retrain every Sunday at 02:00.

**Models:**
| Model | Type | Purpose |
|-------|------|---------|
| `attendance_lstm.pt` | LSTM (PyTorch) | 7-day absence risk prediction |
| `performance_ffn.pt` | FFN (PyTorch) | Employee performance score 0-100 |
| `matching_nn.pt` | NN (PyTorch) | Candidate–job matching score |

**API routes (prefix `/api`):**

- `GET /api/predictions/attendance` — all employees, sorted by risk
- `GET /api/predictions/attendance/{user_id}` — single employee
- `GET /api/predictions/performance` — all employees, sorted by score
- `GET /api/predictions/performance/{user_id}` — single employee
- `GET /api/predictions/dashboard-kpis` — aggregated KPIs
- `POST /api/match` — candidate matching `{"job_post_id": int}`
- `POST /api/train/{model}` — train `attendance|performance|matching|all`
- `GET /api/train/status` — training status
- `GET /health` — health check

**Route ordering rule:** `/all` and `/status` routes must be declared **before** `/{user_id}` and `/{model}` in FastAPI routers.

**Rules:**

- Always use `PYTHONPATH=C:\PFE_TACTIC\ai-service` when running uvicorn (the `app` package root).
- Use Python 3.9 interpreter: `C:\Users\dhiab\AppData\Local\Programs\Python\Python39\python.exe`.
- Start command: `$env:PYTHONPATH="C:\PFE_TACTIC\ai-service"; $env:DATABASE_URL="postgresql://postgres:admin@127.0.0.1:5433/tactic_db"; python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001`
- Do not use `--reload` flag in production (causes subprocess torch import failures on Windows).
- Pydantic v2 is used — use `model_config = ConfigDict(protected_namespaces=())` to suppress `model_` field warnings.

---

## Response Field Naming Convention

The Python service returns fields with these names — always match them exactly in TypeScript interfaces:

| Python field        | TypeScript field    | Description                |
| ------------------- | ------------------- | -------------------------- |
| `utilisateur_id`    | `utilisateur_id`    | Employee primary key       |
| `nom`               | `nom`               | Last name                  |
| `prenom`            | `prenom`            | First name                 |
| `matricule`         | `matricule`         | Employee ID (EMP00001)     |
| `performance_score` | `performance_score` | Score 0–100                |
| `avg_absence_risk`  | `avg_absence_risk`  | Risk 0.0–1.0               |
| `risk_level`        | `risk_level`        | `low\|medium\|high`        |
| `score`             | `score`             | Match score 0–100          |
| `recommendations`   | `recommendations`   | Array inside MatchResponse |

---

## Running the Full Stack

```powershell
# 1. PostgreSQL must be running on port 5433

# 2. Laravel backend
cd C:\PFE_TACTIC\backend
php artisan serve --host=127.0.0.1 --port=8000

# 3. Python AI service
$env:PYTHONPATH = "C:\PFE_TACTIC\ai-service"
$env:DATABASE_URL = "postgresql://postgres:admin@127.0.0.1:5433/tactic_db"
C:\Users\dhiab\AppData\Local\Programs\Python\Python39\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001

# 4. React frontend
cd C:\PFE_TACTIC\frontend
npm start
```

---

## Seeding

```powershell
cd C:\PFE_TACTIC\backend
php artisan db:seed
```

Creates: 50 employees (roles: RH, chef_equipe, employe), 7,350 attendance records, 212 leave requests, 300 payroll records, 3 job posts, 19 applications.

Default credentials: `admin@tactic.com` / `password` (role: RH)

---

## Known Issues / Gotchas

- **Redis not available in dev** — `CACHE_DRIVER` must be `file`, not `redis`.
- **PowerShell** — use `;` not `&&` to chain commands.
- **FastAPI route ordering** — `/all` and `/status` must come before `/{param}` in the same router.
- **Laravel route ordering** — same rule: static routes before parameterized ones.
- **`torch` subprocess issue on Windows** — do not use `uvicorn --reload`; it spawns a subprocess that loses PATH and cannot import torch.
- **Match endpoint** — returns `MatchResponse` object; extract `.recommendations` array, not the root response.
