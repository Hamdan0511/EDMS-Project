# Testing

This project has three genuinely different kinds of testing. None replaces the others; see [TEST_RESULTS.md](TEST_RESULTS.md) for the full evidence history, correctly separating what was previously verified from what was verified in which later pass.

## 1. Unit tests (Vitest) — committed, run in CI, run on every `npm test`

```bash
npm run test           # one-shot
npm run test:unit      # identical alias
npm run test:watch     # watch mode
npm run test:coverage  # with a v8 coverage report and enforced thresholds
```

Config: `vitest.config.mts`. Runs in plain Node (not a browser, not Next's runtime), which means two things had to be handled explicitly:

- `server-only` (the marker package many `src/lib/**` modules import) throws unconditionally outside a bundler's server condition — aliased to a no-op stub (`vitest.setup.server-only-stub.ts`) for tests only.
- Anything that needs `next/headers`' `cookies()` or `@/lib/prisma` is given a hand-written mock via `vi.mock`/`vi.doMock`, scoped per test file. Tests that wrap a `cache()`-memoized function (`getCurrentUser`, `getCurrentProjectMembership`) call `vi.resetModules()` and re-`import()` fresh per test, so one test's mocked DB state can never leak into the next through React's cache.

**What's covered, and why these specific modules (135 tests, 18 files):**

| Area | File(s) | What's actually tested |
|---|---|---|
| Password hashing | `src/lib/auth/password.test.ts` | Real bcrypt hash/verify, salting, case sensitivity — no mocks, real crypto |
| Sessions | `src/lib/auth/session.test.ts` | Expiry rejection, deactivated-user rejection, cookie/hash never equal, create/destroy — mocked DB + cookies |
| RBAC | `src/lib/auth/permissions.test.ts` | Project/org scoping, `requirePermission` throwing, `hasAnyPermission` short-circuiting — mocked DB |
| Project isolation | `src/lib/project-context.test.ts` | Stale-cookie-cannot-leak-another-project, IDOR guard in `assertProjectMember` — mocked DB |
| Storage path validation | `src/lib/storage/local-driver.test.ts` | Real traversal/sibling-prefix/absolute-path rejection (no mocks, pure path math) + a real save/read/delete round-trip |
| Storage driver contract | `src/lib/storage/s3-driver.test.ts` | Key construction, buffer handling, never-public uploads, error paths — against a mocked S3 client, never a real bucket |
| Logging/redaction | `src/lib/logger.test.ts` | Sensitive keys redacted at any nesting depth/inside arrays, non-sensitive fields untouched, correct console method per level |
| State machines (pure functions) | `src/lib/services/field/issue-service.test.ts`, `punch-service.test.ts` | Every transition rule including the FIELD-001 regression, self-verify rejection, reopen-from-closed, REJECTED/REWORK_REQUIRED exceptions |
| State machines (mocked-DB) | `observation-service.test.ts`, `corrective-action-service.test.ts` (hse), `emergency-service.test.ts` (hse) | Same transition rules for the services where the logic isn't a standalone pure function — mocked `prisma`+`requirePermission`, real service code executes |
| Workflow transitions | `src/lib/services/workflow-service.test.ts` | Completion rules (ALL/ANY_REVIEWER, REJECT_ON_ANY_REJECTION), worst-outcome-wins severity ranking, both outcome rules (FINAL_STEP_OUTCOME, LOWEST_OF_ALL_STEP_OUTCOMES with mid-workflow short-circuit + remaining-step skip) — mocked `$transaction` against a small mutable in-memory fake of the rows it reads/writes |
| Document revisions | `src/lib/documents/service.test.ts` | versionNo increment from the latest existing version (not a count), placeholder completion, audit metadata, orphaned-file cleanup when the DB write fails after upload |
| Mail | `src/lib/services/mail-service.test.ts` | Recipient-must-be-a-real-project-member validation, file size/extension checks run *before* touching storage, orphaned-attachment cleanup on failure, mail-numbering gap resumption |
| Numbering | `src/lib/hse/numbering.test.ts` | Gap resumption, out-of-order input, 4-digit padding overflow, and an explicit documented test of the "trusts caller to pre-filter by prefix" precondition |
| Health endpoints | `src/app/api/health/*/route.test.ts` | Liveness always 200; readiness 200/503 and never leaks the underlying DB error |

Coverage thresholds are enforced (not just reported) in both `vitest.config.mts` and CI: a global floor plus higher per-file floors for the modules above that are fully/near-fully covered (`session.ts`/`password.ts`/`project-context.ts` at 100%, `permissions.ts` at 90%, both storage drivers at 100%). Repo-wide coverage is intentionally **not** full-codebase — this is a scoped, prioritized pass (auth/RBAC/storage/state-machines/workflow-transitions/document-revisions/mail), not an attempt to cover every `src/lib` file. Run `npm run test:coverage` for the real, current numbers; don't trust a stale percentage written into a document.

**What's deliberately not unit-tested:** anything that's mostly a thin Prisma query/React component — there's little business logic to assert against in a `findMany` wrapper, and a snapshot of a query shape is a brittle test, not a meaningful one.

## 2. E2E tests (Playwright) — committed, run in CI, run against a disposable database

```bash
npm run test:e2e
```

This assumes the app is already built and running against a disposable, migrated, seeded database — see `e2e/README.md` for the exact sequence, and `.github/workflows/e2e.yml` for how CI does it against a Postgres service container. **Never run against the real/dev database.**

**32 tests across 10 spec files**, prioritizing business-critical journeys over exhaustive UI coverage:

| Module | File | What it proves |
|---|---|---|
| Auth | `auth.spec.ts` | Login, invalid login, logout destroys the session, unauthenticated redirect |
| Documents | `documents.spec.ts` | Register → search → open → authorized file access; unauthenticated file access rejected |
| Mail | `mail.spec.ts` | Send → search → open → reply threading (real `threadRootId` linkage); draft isolation |
| Workflows | `workflows.spec.ts` | Template → activate → start → independent reviewer outcome → completion; concurrent-workflow-on-same-document rejection |
| Directory | `directory.spec.ts` | Search; Viewer 403 / Member allowed on a real protected action |
| Management System | `management-system.spec.ts` | Full Doc Owner vocabulary shown even with zero documents; category-switch drops stale filters; certificates page renders |
| Field Issues | `field.spec.ts` | The FIELD-001 regression (skip-ahead rejected), backward-move rejected, the independent-verification gate across genuinely distinct user sessions |
| HSE Corrective Actions | `hse.spec.ts` | Skip-ahead rejected, full lifecycle, self-verify rejected |
| HSE Incidents | `hse-incidents.spec.ts` | The one entity that *deliberately allows* forward-skipping — proves that design holds through the real API, while backward movement still doesn't |
| HSE Permits to Work | `hse-permits.spec.ts` | An explicit allow-list transition map (not the ordered-array pattern) enforced end-to-end; reject → back to DRAFT |
| Field Punch/Snagging | `field-punch.spec.ts` | Skip-ahead rejected, independent verification, REWORK_REQUIRED only reachable from READY_FOR_VERIFICATION |
| Field ITP & Hold Points | `field-itp.spec.ts` | Approving an ITP is the only place a hold point activates; release only ever happens via the real decision endpoint (no route accepts a direct status write — confirmed by a 404, since none exists); reject cycles back to HOLD_ACTIVE, not a dead end |

Every spec authenticates via a pre-captured `storageState` for one of four deterministic fixture users (`prisma/seed.ts` + `prisma/seed-e2e.ts` — admin, member, verifier, viewer), never a manually-created record. Setup within a test uses either the real HTTP API (verified against the actual route source, not guessed) or a read-only Prisma lookup for reference data with no list API (e.g. a `MailType`'s id) — every business action still goes through the real API or real UI. Diagnostics on failure: `trace: "retain-on-failure"`, screenshots, video — uploaded as CI artifacts.

**Reproducibility, actually checked, not assumed:** this suite has been run to completion multiple times against freshly recreated disposable databases (not reruns against already-mutated state) — 21/21 then 32/32, every time, including once immediately after the storage-driver refactor and once after the AuditLog index migration, to catch any regression those changes might have introduced.

**Deliberately out of scope this pass** (not silently dropped — a judgment call): Hazards, Risk Assessments, Inspections, Emergency Management (structurally already proven via the Corrective Action/Emergency Event specs — same transition-guard shape, lower marginal value from a near-duplicate spec), and Field Test Results/Site Photos/Site Walks (lower business-criticality for this pass). Adding these remains real, bounded follow-up work, not a hidden gap.

## 3. Manual/scripted QA passes (Phase 1 security, Phase 2 functional) — previously verified, not re-run

Two earlier QA passes (20/20 security checks, 64/64 functional/E2E checks including the FIELD-001 discovery) were hand-driven Playwright sessions against an isolated disposable database, using throwaway scripts (created in `.scratch/`, deleted after the run) rather than a committed suite. See [TEST_RESULTS.md](TEST_RESULTS.md) for what they found. The committed E2E suite in section 2 above covers the same spirit of testing (and reuses several of the same scenarios, like the FIELD-001 regression) in a form that actually re-runs — but it does not re-prove every individual check from those two passes, which is why their results are preserved and labeled as previously verified rather than re-claimed.

## Why all three matter

Unit tests catch a regression in, say, the punch-item state machine in milliseconds, with no services running, and run on every PR via CI. They cannot catch an actual broken user flow across a real HTTP request, real session cookie, real file upload, and real database row — that's what the E2E suite is for, and it now does run on every PR too. The two historical manual passes caught things neither automated layer re-checks today (broad security sweep, first-ever full functional walkthrough) — preserved as evidence, not treated as currently re-verified. None of the three is a replacement for the others, and this project does not claim "full test coverage" from any one alone.
