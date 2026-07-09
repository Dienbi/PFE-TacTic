---
name: performance-audit
description: Diagnoses and fixes slow load times, sluggish dashboards, or general performance complaints in the TacTic SmartHR app (Laravel backend, React frontend, FastAPI AI service, Redis cache). Use this skill whenever the user reports something is "slow", "takes a long time to load", "laggy", or asks to "improve performance", "optimize", or "speed up" any part of the app — even if they don't explicitly ask for a full audit. Also use it proactively before adding caching, prefetching, or query changes, to make sure the fix targets a measured bottleneck rather than a guess. Covers N+1 query detection, Redis caching patterns, AI service offloading, and frontend fetch/render optimization.
---

# Performance Audit — TacTic SmartHR

A repeatable procedure for diagnosing and fixing performance problems across the Laravel/React/FastAPI/Redis stack. Follow the phases in order. Do not skip Phase 0/1 to jump to fixes — unverified fixes are how performance work becomes guesswork.

## Core rule

**Analyze → Measure → Fix the biggest verified bottleneck → Re-measure → Repeat.**
Never apply a fix you can't justify with evidence from the actual code or a profiling result taken in this session. If you cannot run/measure something in this environment, say so explicitly and fall back to static analysis rather than presenting an assumption as a measured result.

## Phase 0 — Discovery

1. Identify which part of the app is affected (specific dashboard, specific page, specific action) — don't assume it's the same bottleneck as last time this skill ran.
2. Map the request path end to end for the affected feature:
   `User action → React fetch/render → Laravel route → Controller → Model queries / FastAPI call → Response → React render`
3. Check what caching/optimization already exists before adding more: grep for `Cache::` in Laravel, `React.lazy`/`useQuery` in React, `redis_client` in FastAPI, existing Jobs/Observers/Listeners.
4. Summarize the trace and current state before proposing any fix.

## Phase 1 — Baseline measurement

- **Laravel:** query count + response time for the affected route (Debugbar if installed, else temporary `DB::enableQueryLog()` / timers, removed after).
- **FastAPI:** endpoint latency (existing logs, or temporary timing middleware).
- **React:** fetch waterfall and time-to-render (`performance.now()` markers, or static analysis of the fetch code if the app can't be run here).

Record these numbers. Every fix reports before/after against this baseline.

## Phase 2 — Laravel fixes (apply in order, re-measure after step 1)

1. **N+1 queries** — check every relation accessed in a loop; add `with()`/`load()`. Usually the highest-leverage single fix.
2. **Missing indexes** — cross-reference `WHERE`/`ORDER BY`/join columns against migrations.
3. **Redis response caching**, keyed by role/user (`dashboard:{role}:{user_id}`), sensible TTL. Ask before setting TTLs on payroll/approval/personal data — don't default silently.
4. **Cache invalidation via Observers** for data where staleness would be user-visible/confusing.
5. **Move non-critical side effects to Jobs** (queue) — don't block the response on things not needed for the response itself.
6. **Cache-warming on relevant events** (e.g. `Login`), dispatched `afterResponse()`.

Don't cache a query you haven't fixed — that hides the problem instead of solving it.

## Phase 3 — FastAPI / AI service fixes

1. For each AI call in the critical path: does it need to be real-time, or can it be pre-computed on a schedule and read from Redis?
2. Pre-computable → scheduled job (Celery beat / APScheduler, check what's already available before adding a new one) writes to Redis; the request-path endpoint only reads.
3. Genuinely on-demand → background task pattern returning a job reference; frontend polls or uses a WebSocket, never blocks on inference.
4. Cache repeated identical queries by hashing input parameters.
5. Confirm I/O-bound routes are `async def` — a blocking `def` route stalls the whole worker.

## Phase 4 — React fixes

1. Data fetching via React Query (or equivalent already in use) instead of manual `useEffect` + `fetch` — check what's already there first.
2. Confirm code-splitting is actually working (check build output, not just that `React.lazy` is present in source).
3. Skeleton states matching the real layout, not generic spinners — cheap, always worth doing.
4. Virtualize long lists only if row counts in real usage justify it.
5. Check whether fetch calls that could run in parallel are accidentally sequential.

## Phase 5 — Bootstrap pattern (login-to-first-render, or equivalent "first paint after action")

If the slow point is "first meaningful render after an action" (e.g. after login): fold the first payload into the action's response itself (e.g. Laravel login response includes a cached `bootstrap` payload for that user), and seed the frontend's query cache with it immediately so first render doesn't wait on a second round trip.

## Phase 6 — Verification

1. Re-run Phase 1 measurements the same way.
2. Report a before/after table: query count, response time, time-to-render.
3. Check Redis `keyspace_hits` vs `keyspace_misses` to confirm caching is actually being hit.
4. Confirm queue workers are actually running — cache-warming/background jobs silently no-op otherwise.
5. Flag any data-freshness tradeoff introduced, and get explicit sign-off if it touches sensitive data.

## Reporting format

For each phase: what was found (specific files/queries), what was changed, before/after numbers where available, and any tradeoff needing a decision.