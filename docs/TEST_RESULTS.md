# Test Results

This is a chronological record of QA passes run against this codebase. Earlier phases are preserved here as **previously verified, authoritative history** — they are not re-executed or re-claimed by later entries, and later entries do not duplicate their scope.

## Phase 1 — Security QA (prior session)

Scope: deep security pass (scoped down from a larger proposed mandate, by explicit choice). Evidence-based: every test was actually executed against a running instance, with before/after baselines on any data-touching check, and zero unexplained business-data changes.

**Result: 20/20 security checks passed.**

Covered areas included authentication/session handling, RBAC enforcement across protected routes, project-scoping/IDOR checks, and other access-control verification. (Full per-check detail lives in that session's record, not reproduced here to avoid drifting out of sync with it — this entry exists so later work has an accurate baseline to build on, per explicit instruction not to rewrite prior results as if newly run.)

## Phase 2 — Functional / End-to-End QA (prior session)

Scope: real create → lifecycle → verify flows across Documents, Mail, Workflow, HSE, Field, Management System, ISO, and Directory, driven via a real Chromium browser against a disposable, isolated database — never the real/dev database, `prisma migrate reset` never run.

**Result: 64/64 functional/E2E tests passed.**

**Defect found and fixed in this phase: FIELD-001.** `canTransitionIssueStatus()` (Field Issues) only checked `toIdx < fromIdx` to block backward movement, so a client could `PATCH` an issue directly from `IN_PROGRESS` to `CLOSED`, skipping `WORK_DONE` → `READY_FOR_VERIFICATION` → `VERIFIED` entirely — bypassing the independent-verification gate. Confirmed via the audit trail (the skip was being logged as an *accepted* status change, not rejected). Fixed by adding a `toIdx > fromIdx + 1` forward-distance check. Verified with 7/7 regression tests: the skip is rejected, and the full legitimate step-by-step lifecycle still completes.

A code-pattern grep during this phase additionally flagged four more files sharing the same `toIdx < fromIdx`-only shape, to be individually investigated (not blindly patched) in follow-up work:
`observation-service.ts`, `punch-service.ts`, `corrective-action-service.ts`, `emergency-service.ts`, `incident-service.ts`.

## State-Machine Follow-Up (this engineering-hardening pass)

Per explicit instruction, each of the five flagged files was inspected individually — its real intended lifecycle, whether forward-skipping is genuinely prohibited there, and whether an independent-verification gate exists to be bypassed — rather than assuming they're all identical to FIELD-001.

| File | Verdict | Reasoning |
|---|---|---|
| `field/observation-service.ts` | **Fixed** | Same skip-ahead gap. No separate verify-permission exists for Observations (confirmed via the permission catalog in `prisma/seed.ts` — only `FIELD_MANAGE_OBSERVATIONS` governs every transition), so the fix enforces step-by-step progression only, not a self-verification bypass. |
| `field/punch-service.ts` | **Fixed** | Structurally identical to Field Issues (has its own independent-verification check, `REWORK_REQUIRED` mirrors `REJECTED`) — same fix, same rationale as FIELD-001. |
| `hse/corrective-action-service.ts` | **Fixed** | Has an explicit self-verify guard (`assignedToId === actingUserId` blocked from verifying) that the skip-ahead gap could bypass — same fix. |
| `hse/emergency-service.ts` | **Fixed** | No self-verification concept exists for this entity at all, but skipping `UNDER_REVIEW`/`FOLLOW_UP` entirely means an emergency event could be closed having never been reviewed or had follow-up tracked — a genuine safety/compliance gap on its own terms, not a copy-paste of the other files' reasoning. |
| `hse/incident-service.ts` | **Left unchanged, deliberately** | The existing code (predating this pass — see `git blame`, commit `a81cd753`) already contains an explicit comment stating forward-skipping is intentional here ("an incident needing no investigation can close immediately"). Confirmed via the schema that `HseIncident` has no `verifiedById`/`verifiedAt` field and no separate verify permission, unlike the other four — a genuinely different, already-documented business rule, not an oversight. |

**Regression verification:** a fresh disposable database (`shanfari_edms_test`) was migrated (`prisma migrate deploy`, never reset) and seeded; a production build was started against it on an isolated port; all 4 fixes were exercised through the real HTTP API (not just unit-level) — create → attempt the invalid skip (rejected with the correct message) → walk the complete legitimate lifecycle (every step succeeds).

**Result: 28/28 regression assertions passed.** The disposable database was dropped immediately afterward; the real/dev database was never touched.

## Unit test suite v1 (Engineering Hardening Pass)

A Vitest unit-test foundation was added (none existed before this pass) — see [TESTING.md](TESTING.md) for full scope and rationale.

**Result: 90/90 unit tests passed**, across 13 test files, covering password hashing, session handling, RBAC, project isolation, storage path validation, all five state machines above (as pure-function tests where possible, mocked-database tests where the logic isn't standalone), numbering, and the new health endpoints. Re-confirmed passing with `DATABASE_URL` completely unset and no `.env` file present, to prove the suite has no hidden dependency on real infrastructure.

`npx tsc --noEmit` and `npx eslint .` both pass with zero errors across the full repository, including every file touched in this pass.

## Infrastructure verification (Engineering Hardening Pass)

- **Production build:** run successfully six separate times across this pass (after the font change, after the security-headers change, after the Next.js version bump, after the health-endpoint addition, and twice as a CI dry run) — all clean.
- **Headers:** confirmed via `curl` against a real running production build that every configured security header is actually present on real responses (not just configured in source).
- **PDF/file serving under the new headers:** a real PDF was uploaded and re-fetched byte-identical through the real Temporary Files API, both `inline` and `?download=1` dispositions confirmed working.
- **Browser smoke check:** a Playwright (`chromium`) pass through login → dashboard captured zero console/page errors and zero CSP violations.
- **CI dry run:** every step in `.github/workflows/ci.yml` (`prisma validate`, `prisma migrate deploy`, `tsc`, `eslint`, `vitest run`, `next build`, `npm audit --audit-level=critical`) was run locally against a throwaway database with no `.env` file present, exactly matching what CI will do, before the workflow was trusted.

## Phase 4 — E2E framework, coverage expansion, production-readiness closures

**E2E suite built and verified (21 tests, 8 spec files — see [TESTING.md](TESTING.md) for the full list):** Auth, Documents, Mail, Workflows, Directory, Management System, HSE Corrective Actions, Field Issues (including the FIELD-001 regression, now via genuinely distinct authenticated user sessions rather than a swapped `actingUserId`). Run to completion **three separate times** against freshly recreated disposable databases, **21/21 passing every time** — proving reproducibility, not a lucky single run. `.github/workflows/e2e.yml` created and dry-run verified step by step before being trusted.

**Unit coverage expanded to 126/126** (13 new tests): `submitStepReview`'s full completion-rule/outcome-rule/severity-ranking logic (workflow transitions) and `addDocumentRevision`'s version-increment/orphaned-file-cleanup logic (document revisions) — both previously untested, both genuinely complex business logic.

**Backup/restore drill actually performed** (not just documented): disposable DB → representative Document+2 versions+Mail → `pg_dump` → source database **destroyed entirely** → `pg_restore` into a second disposable DB → every row count matched the pre-backup baseline, revision history and relationships intact. See [BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md).

**Storage abstraction**: `src/lib/storage/` rebuilt as a driver interface (local + S3-compatible), both drivers at 100% unit-test statement coverage — the S3 driver against a mocked client, never a real bucket. All 24+ existing callers needed zero changes.

**Database index fix**: a real missing-index finding (`AuditLog` queries behind the project dashboard's "recent activity" widgets) found, fixed via an additive migration, applied to the real dev database, and verified present — zero data touched.

**CSP**: investigated via Next.js 16's own bundled documentation (confirmed this version renamed `middleware` to `proxy`). Concluded nonce-based CSP conflicts with this app's statically-generated marketing pages; `'unsafe-inline'` kept as a documented, deliberate tradeoff rather than silently left unexplained. See [SECURITY.md](SECURITY.md).

**Logging**: `src/lib/logger.ts` added (structured JSON, recursive sensitive-key redaction, unit-tested), wired into login attempts (a capability that didn't exist before — failed logins were never logged) and the readiness check.

All of the above re-verified together at the end of this phase: `tsc`/`eslint`/`prisma validate` clean, `126/126` unit tests, `21/21` E2E (fresh database), production build clean, `npm audit --audit-level=critical` passing (0 critical).

## Final Completion Pass — HSE/Field workflow depth, Mail unit coverage

**4 new E2E spec files, 11 new tests** (bringing the suite to **32 tests across 10 spec files**), each following create → view → update/lifecycle → invalid transition → authorization → audit trail → final state:

- **HSE Incidents** (`hse-incidents.spec.ts`): proves the *intentional* forward-skip-allowed design (confirmed in the State-Machine Follow-Up above) actually holds through the real API — REPORTED straight to CORRECTIVE_ACTION succeeds — while backward movement is still rejected.
- **HSE Permits to Work** (`hse-permits.spec.ts`): proves the explicit allow-list transition map (`PERMIT_FORWARD_TRANSITIONS` — a different implementation from every other entity's ordered-array pattern) is enforced end-to-end, including the REJECTED → DRAFT resubmission path.
- **Field Punch/Snagging** (`field-punch.spec.ts`): skip-ahead rejection, independent verification, and the REWORK_REQUIRED-only-from-READY_FOR_VERIFICATION guard.
- **Field ITP & Hold Points** (`field-itp.spec.ts`): proves hold points only ever activate via ITP approval and only ever release via the real decision endpoint — a direct `PATCH` to a nonexistent item-status route returns `404` (no such route exists at all, the strongest possible version of "no route accepts a direct status write"). Also discovered and correctly asserted a real, previously-undocumented business rule: rejecting a hold-point inspection sends it back to `HOLD_ACTIVE` for re-inspection, not to a `REJECTED` dead end (the same "rejection cycles back to an active state" pattern as Field Issues/Punch Items).

Two real test-writing mistakes were caught and fixed during this work (not application bugs): a miscounted expected audit-log entry count, and a wrong assumption about the hold-point rejection target status — both corrected after reading the actual service code rather than guessing twice.

Deliberately not added this pass (see [TESTING.md](TESTING.md)'s "out of scope" note): dedicated specs for Hazards/Risk Assessments/Inspections/Emergency Management and Field Test Results/Site Photos/Site Walks.

**9 new unit tests** for `mail-service.ts` (previously zero unit coverage, E2E-only): recipient-must-be-a-real-project-member validation, file size/extension checks running before storage is ever touched, orphaned-attachment cleanup on a failed save, and mail-numbering gap resumption. Unit suite now **135/135 across 18 files**.

**Re-verified together, fresh database, real exit codes (not pipe-masked):** `tsc`, `eslint`, `prisma validate` all exit 0; `135/135` unit tests with coverage thresholds enforced; `32/32` E2E tests against a freshly recreated disposable database; production build clean; `npm audit --audit-level=critical` passing (still 0 critical, 8 high, 2 moderate — all previously individually triaged, see [SECURITY.md](SECURITY.md)); real dev database row counts confirmed unchanged (read-only checks only).
