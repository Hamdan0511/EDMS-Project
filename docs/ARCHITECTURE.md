# Architecture

## Shape of the application

A single Next.js 16 App Router application — no separate backend service. Route Handlers under `src/app/api/**` (140 `route.ts` files) are the entire API surface; there is no other server process.

```
Browser
  ↓ (Next.js App Router: Server Components + Route Handlers)
Service layer (src/lib/services/**)   ← business logic + authorization lives here
  ↓
Prisma Client
  ↓
PostgreSQL 16

                      ↘
                        Local disk or S3 (src/lib/storage/) — uploaded files
```

## The standing request-handling pattern

Every protected route follows the same shape, and it is the single place this logic exists — not re-implemented per route:

```
getCurrentUser()                              — who is making this request? (src/lib/auth/session.ts)
  → assertProjectMember(user, projectId)       — are they actually in this project? (src/lib/project-context.ts)
    → requirePermission(userId, code, scope)   — do they hold the specific permission? (src/lib/auth/permissions.ts)
      → service-layer function                — the actual business logic + validation
        → logAudit(...)                        — what happened, by whom, on what, when
```

`getCurrentUser()` and `getCurrentProjectMembership()` are wrapped in React's `cache()` — **per-request** memoization only (it resets on every new request), used to avoid the same session/membership lookup running twice in one page render. This is a performance fix, not a security boundary change: cache() never persists across requests or users.

## Why business logic lives in `src/lib/services/`, not route handlers or components

Route handlers parse/validate the HTTP-level request shape and call a service function; the service function is where authorization, validation, and the actual state change happen. This is what makes the state-machine unit tests in this pass possible at all (see [TESTING.md](TESTING.md)) — `canTransitionIssueStatus()` and similar functions are plain, testable TypeScript, not logic embedded inside a Next.js request handler.

## Module boundaries and integration points

Newer modules (HSE, then Field) were built to integrate with what already existed rather than duplicate it:

- **Field Issues → HSE Corrective Actions.** "Raise Corrective Action" from a Field Issue calls the real, existing `createCorrectiveAction()` service (`sourceType: "FieldIssue"`) — there is no second corrective-action system.
- **Field/Mail → Documents.** Both `FieldDocumentReference` and `MailDocumentReference` snapshot `documentId` + `documentVersionId` + `revisionAtIssue` — a reference to a document is a point-in-time citation, not a live pointer.
- **Field → Workflow.** `startWorkflow()` requires real `Document` rows (there is no generic `sourceType`/`sourceId` on `Workflow`) — this is a genuine, intentional architectural constraint: a Field record can only "Start Workflow" once it has at least one linked Document, and the UI says so plainly rather than faking the precondition away.
- **Field → Mail.** "Send Field Report" generates a real report buffer and calls `saveMail({ files: [reportFile], ... })` directly — a real outgoing Mail with a real attachment, not a second messaging path.
- **No generic notification system exists.** Rather than building a parallel ad hoc notification mechanism, Field's "My Open Items" is a real, directly-queried list (issues assigned to you, items awaiting your verification, etc.) on the Field landing page — no new infrastructure, and no pretending a notification system exists when it doesn't.

## File storage

`src/lib/storage/` is a driver-based abstraction (`types.ts`'s `StorageDriver` interface; `local-driver.ts` for local disk, `s3-driver.ts` for any S3-compatible object store), re-exported through `index.ts`'s `saveUploadedFile`/`readStoredFile`/`deleteStoredFile` — the only three functions any caller ever uses. Callers never see a real filesystem path or S3 key shape; they get back an opaque `storedPath` to persist on the owning record and pass back later. PostgreSQL always owns the metadata/permissions/references for a file; this abstraction is only ever responsible for the bytes.

The active driver is chosen by the `STORAGE_DRIVER` environment variable (`local` by default). The S3 driver is code-complete and unit-tested against a mocked client, but has not been run against a real bucket in this environment — see [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md).

## Observability

See [OBSERVABILITY.md](OBSERVABILITY.md) for logging, health checks, and what monitoring does and doesn't exist today.

## What this architecture does not include (by design, for now)

- No background job/cron/queue system — anything that looks "scheduled" (overdue mail, overdue field items) is computed at read time from a due-date column, not by a job that flips a status.
- No caching layer (Redis or similar) — `cache()` is per-request React memoization only, not a shared cache.
- No message queue / event bus between modules — cross-module integration (above) is direct service-function calls within the same request, not asynchronous events.
