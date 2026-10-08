# Production Deployment

**Current reality: this system has never been deployed to production.** It runs today only as a local development instance (`npm run dev`) against a single-container Docker Postgres (`docker-compose.yml`) and local-disk file storage. This document is deliberately honest about the gap between that and an actual production deployment, not a description of infrastructure that exists.

## What already works, and would carry over as-is

- `npm run build && npm run start` produces and runs a real Next.js production build — verified repeatedly across this pass (see [TEST_RESULTS.md](TEST_RESULTS.md)).
- Security headers, health endpoints, self-hosted fonts (no Google Fonts build-time dependency), and the RBAC/session model are all already production-shaped — see [SECURITY.md](SECURITY.md).
- `.env.example` documents the one required runtime variable (`DATABASE_URL`); `src/instrumentation.ts` fails the server fast at startup if it's missing, rather than surfacing a confusing error on the first request.

## What's genuinely missing before this could run against real company data

1. **File storage defaults to local disk, and that's still what's actually used today.** `src/lib/storage/` is now a real driver-based abstraction (`StorageDriver` interface in `types.ts`, `local-driver.ts`, `s3-driver.ts`, selected via `STORAGE_DRIVER` — see `.env.example`). The S3-compatible driver is code-complete and unit-tested against a mocked client (100% statement coverage), but has **not been exercised against a real bucket** — no cloud account is provisioned in this environment, and no real document has been uploaded to an external service as part of this work. Switching a real deployment to object storage means setting `STORAGE_DRIVER=s3` plus the `S3_*` variables and verifying against a real bucket for the first time — that verification step has not happened yet.
2. **No managed database.** The dev Postgres is a single Docker container with a named volume, not a managed instance with automated backups, point-in-time recovery, or high availability — see [PRODUCTION_DATABASE.md](PRODUCTION_DATABASE.md) and [BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md).
3. **No real observability stack** — see [OBSERVABILITY.md](OBSERVABILITY.md).
4. **No distributed rate limiting** — anything added would need a shared store (Redis or similar), which this deployment doesn't have.
5. **CSP still allows `'unsafe-inline'`** for scripts/styles — a deliberate tradeoff, not an oversight: nonce-based CSP would require forcing this app's statically-generated marketing pages into dynamic rendering, or running two separate CSP enforcement paths. See [SECURITY.md](SECURITY.md) for the full reasoning.
6. **No real TLS termination configured here** — `Strict-Transport-Security` is sent in production mode, but actually terminating HTTPS is the responsibility of whatever's in front of this (a reverse proxy/load balancer), which doesn't exist in this repo.
7. **Oracle Aconex integration does not exist.** See the README's [Relationship to Oracle Aconex](../README.md#relationship-to-oracle-aconex) section — this system runs entirely standalone today.

## If this were to be deployed for real, a reasonable path

1. Provision a managed Postgres instance (see [PRODUCTION_DATABASE.md](PRODUCTION_DATABASE.md)) and point `DATABASE_URL` at it.
2. Provision a real S3-compatible bucket, set `STORAGE_DRIVER=s3` and the `S3_*` variables, and verify the already-implemented driver against it for the first time (upload, download, delete) before trusting it with real documents.
3. Run `npx prisma migrate deploy` (never `migrate dev`, never `migrate reset`) as part of the deploy step, against the real database, with a backup taken immediately before.
4. Put a reverse proxy / load balancer in front that terminates TLS and forwards to `npm run start`'s listening port.
5. Point the orchestrator's liveness/readiness probes at `/api/health/live` and `/api/health/ready` respectively (see [OBSERVABILITY.md](OBSERVABILITY.md)).
6. Add real log aggregation and alerting in front of `src/lib/logger.ts` (already structured JSON, already redacts sensitive fields — see [OBSERVABILITY.md](OBSERVABILITY.md)), and forward its `write()` to that platform.
7. If stricter CSP becomes a real requirement, revisit the architecture conflict documented in [SECURITY.md](SECURITY.md) (nonces vs. static marketing pages) rather than bolting on a nonce without resolving it.

None of the above is implemented in this repository today — this section is a plan, not a status report.

## Production deployment configuration/examples (reference only — nothing below is deployed)

A sketch of what wiring the real path above together might look like, so a future deploy isn't starting from a blank page. This is an **example for reference**, not infrastructure-as-code that's been run:

```yaml
# Illustrative only — not a file in this repo, not applied anywhere.
# A managed Postgres and a real S3-compatible bucket would be provisioned
# through whatever provider is chosen (their console/CLI/Terraform — not
# shown here, since this repo doesn't commit to a specific provider).
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: ${DATABASE_URL}          # managed Postgres connection string
      STORAGE_DRIVER: s3
      S3_BUCKET: ${S3_BUCKET}
      S3_REGION: ${S3_REGION}
      S3_ACCESS_KEY_ID: ${S3_ACCESS_KEY_ID}
      S3_SECRET_ACCESS_KEY: ${S3_SECRET_ACCESS_KEY}
      NODE_ENV: production
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health/ready"]
      interval: 30s
    # A reverse proxy (not shown) would sit in front of this, terminating
    # TLS and forwarding to port 3000 — see item 4 above.
```

Every environment variable referenced above is real and already documented in `.env.example` — this just shows them assembled into one place. Provisioning the managed Postgres instance, the S3 bucket, and the reverse proxy itself is explicitly out of scope here (and out of scope for this repository in general — it's provider-specific infrastructure, not application code).
