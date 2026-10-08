# Changelog

Notable changes, newest first. This is not a full commit log (`git log` is authoritative for that) — it records what changed and why, for things a future reader would otherwise have to reconstruct from a diff.

## 2026-10-08 — Final Completion Pass (HSE/Field E2E depth, Mail unit coverage)

**Testing**
- Added 4 new E2E spec files (`hse-incidents.spec.ts`, `hse-permits.spec.ts`, `field-punch.spec.ts`, `field-itp.spec.ts`), 11 new tests — E2E suite now 32 tests across 10 files. Each follows create → view → update/lifecycle → invalid transition → authorization → audit trail → final state. Notably proves HSE Incidents' intentional forward-skip-allowed design and HSE Permits' explicit allow-list transition map both hold through the real API, and that ITP hold points can only ever release via the real decision endpoint (a direct status write 404s — no such route exists).
- Added 9 new unit tests for `mail-service.ts` (previously zero unit coverage) — recipient-membership validation, file validation ordering, orphaned-attachment cleanup, mail-numbering. Unit suite now 135 tests across 18 files.
- Re-verified the full suite together with real (non-pipe-masked) exit codes: `tsc`, `eslint`, `prisma validate` all 0; 135/135 unit; 32/32 E2E against a freshly recreated disposable database; production build clean; `npm audit --audit-level=critical` passing.

**Production infrastructure**
- Added `npm run typecheck` script (`tsc --noEmit`) for convention consistency.
- Documented a real, previously-unflagged gap: file-integrity checksums exist for Management System documents/certificates only, not for Documents/Mail/HSE/Field attachments — found during a storage-architecture review, documented rather than fixed under an unrelated mandate (see `SECURITY.md`).
- Reviewed CSP again for a safe incremental tightening; found none (13 components use real inline `style={{}}` attributes, so `'unsafe-inline'` on `style-src` is still load-bearing) — documented, not changed.
- Added a clearly-labeled, non-deployed reference example (docker-compose-shaped) to `PRODUCTION_DEPLOYMENT.md` showing how the already-real env vars would assemble for a real deploy — explicitly not infrastructure that's been provisioned or run.

**Documentation**
- Backfilled `TEST_RESULTS.md` and this changelog with the Phase 4 entry below, which had been completed but not yet recorded in either file.
- Rewrote `TESTING.md`'s E2E section (previously described the suite as "not committed" — now accurate).
- Added a "Current Production Limitations" table to `README.md`, explicitly distinguishing architecture-readiness from actual deployment per area.

## 2026-10-08 — Phase 4 (E2E framework, coverage expansion, production-readiness closures)

**Testing**
- Built and verified a committed Playwright E2E suite (21 tests, 8 spec files) with real fixtures (`prisma/seed-e2e.ts`), run to completion three separate times against freshly recreated disposable databases. Added `.github/workflows/e2e.yml`.
- Added unit tests for `submitStepReview` (workflow transitions — completion rules, severity-ranking, both outcome rules) and `addDocumentRevision` (document revisions — version increment, orphaned-file cleanup). Unit suite grew to 126 tests.
- Added coverage thresholds (global + per-file), enforced in both Vitest config and CI.

**Production infrastructure**
- Rebuilt `src/lib/storage.ts` into `src/lib/storage/` — a real driver interface with `local-driver.ts` and a code-complete, unit-tested (against a mocked client) `s3-driver.ts`. All existing callers unchanged.
- Found and fixed a real missing-index gap (`AuditLog` queries behind dashboard "recent activity" widgets) via an additive migration, applied to the real dev database, verified present.
- Added `src/lib/logger.ts` (structured JSON, recursive sensitive-key redaction), wired into login-attempt logging (new capability) and the readiness check.
- Performed a real backup/restore drill: disposable DB → representative data → `pg_dump` → source DB destroyed → `pg_restore` into a second disposable DB → full integrity verified.
- Investigated nonce-based CSP via Next.js 16's own docs; concluded it conflicts with this app's statically-generated marketing pages; kept `'unsafe-inline'` as a documented tradeoff.

## 2026-10-08 — Engineering hardening pass (testing, production infrastructure, documentation)

**Testing**
- Added a Vitest unit-test foundation (none existed before): `vitest.config.mts`, 90 tests across 13 files covering password hashing, session handling, RBAC, project isolation, storage path validation, all five status-lifecycle state machines, numbering, and the new health endpoints. Added `npm run test`/`test:unit`/`test:watch`/`test:coverage`.
- Individually investigated the 5 state-machine files flagged by the prior Phase 2 QA pass (not blindly patched): fixed a skip-ahead defect (the same shape as FIELD-001) in `observation-service.ts`, `punch-service.ts`, `corrective-action-service.ts`, and `emergency-service.ts`; left `incident-service.ts` unchanged after confirming its forward-skip behavior is deliberate, pre-existing, and already documented in the code. 28/28 live regression assertions passed against a disposable database.

**Security**
- Fixed a real sibling-prefix path-traversal bug in `src/lib/storage.ts`'s path validation (`resolved.startsWith(STORAGE_ROOT)` → `path.relative`-based boundary check). Added regression tests for traversal, absolute paths, and the specific sibling-prefix case.
- Added HTTP security headers (`next.config.ts`): CSP, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, and production-only HSTS. Verified live against a running production build, plus a Playwright smoke pass confirming zero CSP violations.
- Added `/api/health/live` and `/api/health/ready` endpoints, unit-tested, confirmed to never leak the underlying error on failure.
- Upgraded `next` 16.3.4 → 16.4.0, fixing a critical RCE advisory (`next/og`'s `ImageResponse`) plus several high-severity cache-poisoning/SSRF/info-disclosure advisories. Applied safe transitive fixes for `brace-expansion`/`sharp`. Individually investigated (not blanket-applied) the remaining `npm audit` findings — see [SECURITY.md](SECURITY.md) for why each is currently accepted residual risk rather than fixed.
- Added `src/instrumentation.ts` to fail fast at server startup if `DATABASE_URL` is missing.

**Production infrastructure**
- Removed the Google Fonts build-time network dependency: Geist/Geist Mono now self-hosted via the `geist` npm package, Fraunces self-hosted via `@fontsource-variable/fraunces` + `next/font/local`. Verified with six separate successful production builds across this pass.
- Added `.github/workflows/ci.yml`: install, Prisma validate, migrate-deploy against a disposable Postgres service container, typecheck, lint, unit tests, build, `npm audit --audit-level=critical`. Dry-run verified locally, step by step, before being trusted.
- Rewrote `.env.example` to document the one real required variable (`DATABASE_URL`) and explicitly note what doesn't exist yet (storage config, since storage is local-disk only today) rather than inventing variables nothing reads.

**Documentation**
- Rewrote `README.md` (previously outdated — described only Documents/Mail/Directory, claimed Mail Approvals and automated tests didn't exist when one of those claims was false and the other needed context).
- Added the `docs/` suite: `ARCHITECTURE.md`, `SECURITY.md`, `TESTING.md`, `TEST_RESULTS.md`, `DATA_MODEL.md`, `API.md`, `DEVELOPMENT.md`, `PRODUCTION_DEPLOYMENT.md`, `PRODUCTION_DATABASE.md`, `BACKUP_AND_RESTORE.md`, `OBSERVABILITY.md`, `QA_REPORT.md`, `ENGINEERING_SCORECARD.md`, this file.

## Earlier history

Prior to this pass, the project went through (in order): initial scaffold → Documents/Mail/Directory EDMS core → Workflow engine → HSE module → Field module → Management System/ISO module → a Phase 1 security QA pass (20/20) → a Phase 2 functional/E2E QA pass (64/64, with the FIELD-001 defect found and fixed). See [TEST_RESULTS.md](TEST_RESULTS.md) for the detail on those two QA phases; see `git log` for the underlying commit history.
