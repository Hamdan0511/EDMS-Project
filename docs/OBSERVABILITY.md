# Observability

## What actually exists today

- **Health endpoints:** `GET /api/health/live` (process is up, no dependency checks) and `GET /api/health/ready` (checks `SELECT 1` against the real database, returns `503` on failure without leaking the underlying error). Unit-tested; see [SECURITY.md](SECURITY.md) and [TESTING.md](TESTING.md).
- **Audit trail:** `AuditLog` (`action`, `entityType`, `entityId`, `userId`, `projectId`, `metadata`, timestamp) written by `logAudit()` from nearly every mutating service across every module — this is a business/compliance audit trail (who did what, to what, when), queryable in the database, not a metrics/tracing system.
- **Structured logging abstraction (`src/lib/logger.ts`):** `logger.info`/`.warn`/`.error(event, context)` writes a single JSON line (`level`, `event`, `timestamp`, `context`) to stdout/stderr. Its one real job: `context` is recursively redacted before it's ever serialized — any key matching `password|token|cookie|secret|authorization|credential` (case-insensitive, at any nesting depth, including inside arrays) is replaced with `"[REDACTED]"`, so a caller passing a whole request body through by accident can never leak a credential into logs. Unit-tested (`src/lib/logger.test.ts`), including the exact nested/array/deep-recursion cases. Wired into the two highest-value real sites so far: `/api/auth/login` (logs `LOGIN_FAILED` with the reason — unknown email / inactive account / wrong password — and `LOGIN_SUCCEEDED`, never the password itself; this is also a new capability — failed login attempts were not logged anywhere before this pass) and `/api/health/ready` (replaces a raw `console.error`). **Not** retrofitted across the rest of the codebase's existing `console.error` calls — that would be a large, mechanical, low-value refactor on its own; new call sites should use `logger` going forward, following the two examples above.
- **Where logs actually go:** wherever the Node process's stdout/stderr goes — in local dev, the terminal. There is no log shipping configured. Swapping `logger`'s internals to also forward to an external platform is the one place that would need to change — every call site stays the same.
- **`src/instrumentation.ts`** currently does exactly one thing: fails the server fast at startup if `DATABASE_URL` is missing, rather than letting that surface as a confusing error on the first request. This is also the correct, idiomatic place to register a real APM/tracing SDK later (see below) — Next.js calls its `register()` function once per server instance before it accepts requests.

## What does not exist today

- **No metrics** (request latency, error rate, throughput) are collected or exported anywhere.
- **No distributed tracing.**
- **No log aggregation** — logs go to stdout/stderr only; there is no shipping to a log platform.
- **No alerting** on any of the above, because none of the above exists to alert on.
- **No dashboards.**

## If this were deployed for real, a reasonable path

1. Point the orchestrator's liveness/readiness probes at `/api/health/live`/`/api/health/ready` (already real and tested).
2. Add a real APM/tracing SDK's initialization inside `src/instrumentation.ts`'s `register()` function — this is exactly what that hook is for, and it's already in place as the integration point.
3. Ship stdout/stderr (where `logger` already writes structured JSON) to a log aggregation platform at the infrastructure level — this requires no code change, only deployment configuration.
4. If/when a real log platform is in place, change `logger.ts`'s internal `write()` to also forward there (e.g. an SDK call) — every existing call site stays identical, by design.
5. Build dashboards/alerts on top of whatever metrics backend is chosen, once one exists.

None of the above is implemented in this repository today — this is a plan for what's missing, not a status report of what's running.
