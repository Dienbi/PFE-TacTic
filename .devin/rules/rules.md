TacTic SmartHR — Agent Rules

Stack


Backend: Laravel (PHP) — API + business logic, auth, DB access
Frontend: React (JS/TS) — 3 role-based dashboards: HR, Team Leader, Employee
AI service: Python + FastAPI — separate service, called by Laravel or directly by React
Cache/session/queue: Redis (local dev via WSL, managed/self-hosted in production)
Core working principles


Read before you write. Never assume a file's contents or structure — view it first, every time, even if you think you remember it from earlier in the session.
Measure before and after every performance change. A change without a before/after number is not considered verified. State clearly when you were unable to measure something and had to rely on static analysis instead — don't present an assumption as a measured result.
Smallest change that fixes the measured problem. Don't refactor broadly unless asked. Don't add a new dependency without checking composer.json / package.json / requirements.txt first to see if something equivalent already exists.
Never cache a broken query as a substitute for fixing it. Fix N+1s and missing indexes before adding caching layers on top of them.
State assumptions explicitly when a request is ambiguous, then proceed — don't stall on questions you can reasonably resolve yourself. Exception: see "Always ask" below.


Always ask before proceeding


Any change to logic touching payroll, approvals, or personal employee data — including cache TTLs on this data, since staleness here has business/compliance implications, not just UX.
Any new third-party dependency.
Any destructive database operation (migrations that drop/alter columns, data backfills).
Any change to authentication/session handling.


Conventions


Laravel: API responses go through API Resources, not raw models. Eager-load relations explicitly (with()/load()) — never rely on lazy loading in a loop.
FastAPI: I/O-bound routes must be async def; never do blocking I/O in a synchronous route.
React: data fetching goes through React Query (if installed) — check before adding manual useEffect + fetch patterns.
Redis key naming: dashboard:{role}:{user_id}, ai:{feature}:{scope}, session:{session_id}. Keep this consistent — don't invent new patterns per feature.


Environments


Local dev: Redis via WSL (redis-cli ping to confirm it's up).
Production: Redis is a separate managed/self-hosted instance — connection details come from .env, never hardcoded. Confirm REDIS_HOST/REDIS_URL before assuming local config applies.


Reporting back

For any non-trivial change, report: what you found (specific files/queries), what you changed, before/after measurement if available, and any tradeoff that needs a decision from me rather than you.