# Development

## Setup

See the README's [Getting started](../README.md#getting-started) section — this document covers the things that aren't there.

## Day-to-day commands

```bash
npm run dev             # dev server (Turbopack — do not add --webpack here, see below)
npm run lint             # ESLint (flat config, eslint.config.mjs)
npm run typecheck        # tsc --noEmit
npm run test             # Unit tests (Vitest), one-shot (alias: npm run test:unit)
npm run test:watch       # Unit tests, watch mode
npm run test:coverage    # Unit tests with coverage (thresholds enforced)
npm run test:e2e         # E2E tests (Playwright) — see e2e/README.md for required setup first
npx prisma studio        # Browse the dev database
npx prisma migrate dev   # Create + apply a new migration (dev only)
```

## A real, previously-made mistake worth not repeating

`next dev` (Turbopack, the default) is the correct, fast way to run the dev server. `next dev --webpack` was, for a while during this project's history, used out of habit for dev mode too — this was wrong and made every route feel noticeably slower to first-compile. **`--webpack` is only appropriate for `next build`** (used throughout this project's QA/engineering-hardening passes specifically to get a real, isolated production server running against a disposable test database on a second port, because Next only allows one `next dev` instance per project directory at a time). Do not add `--webpack` to the `dev` script.

## Testing against a disposable database (never the real one)

For anything that writes data as part of a test — lifecycle/regression testing, a new migration, anything destructive:

```bash
docker exec <postgres-container> psql -U shanfari -d postgres -c "CREATE DATABASE some_disposable_name;"
DATABASE_URL="postgresql://shanfari:shanfari_dev_password@localhost:5434/some_disposable_name?schema=public" npx prisma migrate deploy
DATABASE_URL="postgresql://shanfari:shanfari_dev_password@localhost:5434/some_disposable_name?schema=public" npx prisma db seed
```

Then run a production build + start (or point a second dev-adjacent process at it) with that same `DATABASE_URL` override, exercise whatever you need to, and drop the database when done:

```bash
docker exec <postgres-container> psql -U shanfari -d postgres -c "DROP DATABASE some_disposable_name;"
```

**Never run `prisma migrate reset` against the real database. Never delete real business/demo data for the sake of a test.** This exact workflow is what every QA pass referenced in [TEST_RESULTS.md](TEST_RESULTS.md) used.

## Conventions

- Business logic and authorization live in `src/lib/services/**`, not in route handlers or React components (see [ARCHITECTURE.md](ARCHITECTURE.md)).
- A new protected route always: authenticates → `assertProjectMember` → `requirePermission` (or delegates that to the service it calls) → calls a service → maps the service's typed error class to an HTTP status (see [API.md](API.md)).
- A new status-lifecycle field gets an ordered array (`XXX_STATUS_ORDER`) plus a forward-distance guard (`toIdx > fromIdx + 1` rejected, with a documented exception for reopening from a terminal state) — this is the pattern that FIELD-001 (see [TEST_RESULTS.md](TEST_RESULTS.md)) was a bug for *not* having, and it's now consistent across Field Issues, Punch Items, HSE Corrective Actions, and HSE Emergency Events. Not every entity needs this — HSE Incidents deliberately doesn't, and that's documented in the code itself, not assumed.
- Configurable vocabularies (a type list the project should be able to extend) are a `FieldLookup`/`DocumentType`-style row-based table, not a hardcoded array or a second admin screen per list.
- File uploads always go through `saveUploadedFile()`/`readStoredFile()` (`src/lib/storage/`) — never a direct `fs` call elsewhere, so the path-safety hardening in [SECURITY.md](SECURITY.md) actually covers every caller, regardless of which storage driver is active.

## Before committing a change to a service or route handler

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

All four are what CI (`.github/workflows/ci.yml`) runs on every push/PR — running them locally first is strictly faster than waiting on CI to tell you the same thing.
