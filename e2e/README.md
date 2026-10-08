# E2E suite

Real Playwright tests against a real running build of the app and a real (but fully disposable) PostgreSQL database. Never run this against the real/dev database.

## What it assumes

By the time `npx playwright test` runs, the application must already be:
1. Built (`npm run build`).
2. Running at `E2E_BASE_URL` (default `http://localhost:3100`) with `DATABASE_URL` pointed at a disposable database that has already been migrated (`prisma migrate deploy`) and seeded (`prisma db seed` then `npm run seed:e2e`).

Playwright's own `globalSetup` (`e2e/global-setup.ts`) only waits for that server to answer `/api/health/ready`, then logs in as each fixture user (`e2e/constants.ts`) and saves their session to `e2e/.auth/*.json` for reuse by every spec — it does not provision any infrastructure itself. `.github/workflows/e2e.yml` does steps 1–2 explicitly, as its own visible CI steps, against a disposable Postgres service container.

## Running locally

```bash
# 1. Create a disposable database (adjust the container name if different)
docker exec imsproejct-db-1 psql -U shanfari -d postgres -c "CREATE DATABASE shanfari_edms_e2e;"

# 2. Migrate + seed it
export E2E_DATABASE_URL="postgresql://shanfari:shanfari_dev_password@localhost:5434/shanfari_edms_e2e?schema=public"
DATABASE_URL="$E2E_DATABASE_URL" npx prisma migrate deploy
DATABASE_URL="$E2E_DATABASE_URL" npx prisma db seed
DATABASE_URL="$E2E_DATABASE_URL" npm run seed:e2e

# 3. Build once, then start against the disposable database on a dedicated port
npm run build
DATABASE_URL="$E2E_DATABASE_URL" npx next start -p 3100 &

# 4. Run the suite
npm run test:e2e

# 5. Stop the server (kill the backgrounded `next start`), then drop the database
docker exec imsproejct-db-1 psql -U shanfari -d postgres -c "DROP DATABASE shanfari_edms_e2e;"
```

## Fixture users (created deterministically, never manually)

| Role | Email | Created by |
|---|---|---|
| Project Administrator | `admin@shanfari.local` | `prisma/seed.ts` |
| Project Member (responsible/assignee in tests) | `e2e-member@shanfari.local` | `prisma/seed-e2e.ts` |
| Project Member (independent verifier in tests) | `e2e-verifier@shanfari.local` | `prisma/seed-e2e.ts` |
| Project Viewer (read-only, used for permission-boundary tests) | `e2e-viewer@shanfari.local` | `prisma/seed-e2e.ts` |

All share the password `ChangeMe123!` (disposable-database-only, never a real credential).

## Structure

- `e2e/constants.ts` — the deterministic IDs/emails above.
- `e2e/global-setup.ts` — waits for the server, captures per-role `storageState`.
- `e2e/helpers/api.ts` — thin, verified wrappers over the real HTTP API for fast, deterministic setup (reading `prisma/schema.prisma`-backed routes directly, not guessed).
- `e2e/helpers/db.ts` — read-only lookups for reference data with no list API (e.g. a `MailType`'s id) — every actual business action still goes through the real API or real UI, never this client.
- `e2e/specs/*.spec.ts` — one file per module, prioritizing business-critical journeys over exhaustive UI coverage (see `docs/TESTING.md`).

## Diagnostics on failure

`playwright.config.ts` sets `trace: "retain-on-failure"`, `screenshot: "only-on-failure"`, `video: "retain-on-failure"` — a failed run leaves a trace/screenshot/video under `test-results/` and an HTML report under `playwright-report/` (`npx playwright show-report`). CI uploads both as workflow artifacts.
