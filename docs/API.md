# API

The API surface is **140 Next.js Route Handlers** under `src/app/api/**` — REST-style JSON (and multipart, for uploads), no GraphQL, no separate API server. There is no OpenAPI/Swagger spec generated from these; this document describes the real, consistent conventions instead, since that's what actually governs how a new route should be written.

## Conventions every route follows

1. **Authenticate first.** `const user = await getCurrentUser(); if (!user) return 401`.
2. **Resolve and verify project membership** for anything project-scoped: `await assertProjectMember(user, projectId)` — wrapped in `try/catch` returning `403`, never trusting a `projectId` from the request body/URL without this check.
3. **Check the specific permission** via `requirePermission(user.id, "PERMISSION_CODE", { projectId })` (or let the service layer do it — many services call this themselves, so it's enforced even if a future route forgets to).
4. **Delegate to a service function** (`src/lib/services/**`) for the actual logic — route handlers stay thin.
5. **Catch the service's typed error class** (e.g. `IssueError`, `ObservationError`, `PunchError`) and map it to `400`; catch `ForbiddenPermissionError` and map it to `403`; let anything unexpected 500 (logged server-side via `console.error`, never leaking internals to the client — see the health-endpoint pattern in [SECURITY.md](SECURITY.md) for the same principle applied elsewhere).

Example shape (from `src/app/api/field/observations/[id]/route.ts`'s sibling routes):

```ts
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.status !== "string") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const updated = await updateObservationStatus({ id, projectId, actingUserId: user.id, status: body.status });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof ObservationError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof ForbiddenPermissionError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
```

## File-serving routes

Every route that streams a stored file back (`/api/documents/[id]/file`, `/api/temporary-files/[id]/file`, `/api/hse/attachments/[id]`, `/api/field/attachments/[id]`, `/api/management-system/documents/[id]/file`, `/api/mail/attachments/[id]`, etc.) follows the same shape: look up the DB record → `assertProjectMember` → `readStoredFile(record.storedPath)` (which internally calls the hardened `resolveStoragePath()` — see [SECURITY.md](SECURITY.md)) → set `Content-Type` from the stored MIME type, `X-Content-Type-Options: nosniff`, and `Content-Disposition` (`inline` for PDFs/images unless `?download=1` is passed, `attachment` otherwise).

## Health endpoints (unauthenticated, by design)

- `GET /api/health/live` — `200 {"status":"ok"}`, no dependency checks.
- `GET /api/health/ready` — `200 {"status":"ok"}` if the database answers `SELECT 1`; `503 {"status":"error"}` otherwise, with the real error logged server-side only.

## Print routes

`/document-print/[id]`, `/mail-print/[id]`, `/field-print/[type]` are server-rendered, print-CSS pages (not API routes) meant to be opened and printed/saved-as-PDF by the browser itself — no PDF-generation library is used.

## What's intentionally not here

No versioning scheme (`/api/v1/...`) — this is a single deployed application, not a published API product, so there's no external consumer to version against yet. No rate limiting is currently enforced at the route layer (see [SECURITY.md](SECURITY.md)'s "what this pass did not attempt" section).
