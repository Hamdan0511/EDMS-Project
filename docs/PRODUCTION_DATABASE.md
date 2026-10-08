# Production Database

## Current reality

Development and every QA pass against this project uses a single `postgres:16-alpine` Docker container (`docker-compose.yml`), with one named Docker volume (`shanfari_pgdata`) for persistence and a healthcheck (`pg_isready`). This is appropriate for development. It is **not** a production database setup — there is no replication, no managed backups, and no failover.

## Schema management

- The schema is Prisma-managed (`prisma/schema.prisma`), applied through 34 migrations in `prisma/migrations/`, every one of them additive (new tables/columns/enum values) — never a destructive rename or drop against real data.
- Production/CI applies migrations with `npx prisma migrate deploy` — this only ever applies already-committed, already-reviewed migrations in order. It never generates a new migration and never resets.
- **`npx prisma migrate dev` is a local development command only** — it can prompt to reset the database to resolve drift. It must never be run against a database holding real data.
- **`npx prisma migrate reset` must never be run outside a throwaway/disposable database.** This rule was treated as absolute throughout every QA pass referenced in [TEST_RESULTS.md](TEST_RESULTS.md), and it holds for any future work too.

## Isolated/disposable testing pattern (how this project actually verifies destructive changes safely)

Every QA pass and regression test in this project's history that needed to write data used the same pattern, documented in full in [DEVELOPMENT.md](DEVELOPMENT.md#testing-against-a-disposable-database-never-the-real-one): a second, separate database on the **same** Postgres container, migrated fresh via `migrate deploy`, seeded, exercised, then dropped. The real/dev database is never touched by this process.

## Production-readiness review (performed this pass)

A real review of the schema and query patterns against the running database, not just a read of the Prisma docs:

- **Indexes:** 103 explicit `@@index` declarations and 53 `@@unique` constraints across the schema (every unique business key — document numbers, mail numbers, permission codes, etc. — is DB-enforced, not just checked in application code). One real gap was found and fixed: `getRecentFieldActivity()`/the dashboard "recent activity" queries filter `AuditLog` by `projectId` + an `action` prefix and sort by `createdAt desc`, on every dashboard load — but the existing `@@index([projectId, entityType, entityId])` doesn't help that access pattern at all (it leads with columns these queries don't filter on). Added `@@index([projectId, createdAt])` (migration `20261008141255_audit_log_project_created_at_index`), applied via `prisma migrate deploy` — purely additive, verified present on the real database afterward (`\d "AuditLog"`), zero data touched.
- **Constraints:** every foreign key has an explicit `onDelete` policy (96 across the schema) — e.g. project deletion cascades to its owned records rather than leaving orphaned rows or failing with a raw FK violation.
- **Transactions:** 26 real `prisma.$transaction(...)` usages across the service layer for genuinely multi-step writes that must be atomic — e.g. `submitStepReview()`'s step-completion + workflow-completion + audit-event sequence (see the new unit tests in `src/lib/services/workflow-service.test.ts`), so a crash mid-sequence can't leave a workflow half-completed.
- **Session lookups** (`Session.tokenHash`, checked on *every* authenticated request) are backed by a `@unique` constraint — an indexed point lookup, not a table scan, regardless of how many sessions exist.
- **Connection pooling:** Prisma Client manages its own connection pool per process (default size `num_physical_cpus * 2 + 1`, overridable via `?connection_limit=N` on `DATABASE_URL`). This is fine for a single application instance. It is **not** fine for multiple instances/serverless functions each opening their own pool against the same Postgres — that scenario needs an external pooler (PgBouncer, or a managed Postgres provider's built-in pooling/"transaction mode" endpoint) in front of the database. Not needed today (single dev instance); genuinely needed the moment this runs as more than one instance.
- **Long-running queries / N+1s:** the two biggest fixes already made earlier in this project's history (not this pass) were the HSE dashboard's 26-query sequential waterfall merged into one `Promise.all` batch, and Mail's list query switched from `include` (fetching full related rows) to a scoped `select` — both still in place, both covered by this review rather than re-litigated.
- **Connection failures:** `/api/health/ready` (added this pass) is the one place the app deliberately probes "can I actually reach Postgres right now" — see [OBSERVABILITY.md](OBSERVABILITY.md). Prisma itself retries transient connection errors internally; nothing in this codebase adds a second retry layer on top, which is appropriate — doubling up retry logic tends to make outages worse (retry storms), not better.

## What a real production setup would need

1. A managed Postgres instance (e.g. a cloud provider's managed database service) with automated daily backups and point-in-time recovery — not a single Docker container with a local volume.
2. Connection pooling appropriate to however many application instances are actually running (Prisma's own connection pool is per-process; multiple app instances need either a pooler like PgBouncer or a serverless-friendly Postgres driver).
3. A migration step wired into deployment (`prisma migrate deploy`) that runs before the new application version starts serving traffic, with a database backup taken immediately before it runs.
4. Monitoring on connection count, query latency, and disk usage — none of which exists today (see [OBSERVABILITY.md](OBSERVABILITY.md)).

None of the above is provisioned in this repository today.
