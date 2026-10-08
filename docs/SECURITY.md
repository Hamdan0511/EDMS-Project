# Security

This document describes what is actually implemented, what was verified and how, and what residual risk is accepted and why. Nothing here is aspirational — every claim is grounded in code that exists in this repository today.

## Authentication

- Passwords: bcrypt (`bcryptjs`, cost factor 12) — `src/lib/auth/password.ts`. Unit-tested (`src/lib/auth/password.test.ts`): same password hashes differently each call (real salting), correct/incorrect/case-sensitive verification.
- Sessions: a random 32-byte token is generated, SHA-256-hashed, and only the hash is stored (`Session.tokenHash`) — the raw token lives only in an `httpOnly`, `SameSite=lax` cookie, `Secure` in production. A 7-day TTL is enforced server-side on every read, and a disabled user's session is invalidated immediately on next use, not just at next login. Unit-tested (`src/lib/auth/session.test.ts`) with a mocked database and cookie store: expired sessions are rejected and deleted, deactivated users are rejected and their session deleted, the stored hash is never equal to the cookie's raw value.

## Authorization (RBAC)

- Real database-backed catalog: `Permission` → `RolePermission` → `Role` → `UserRoleAssignment`, scoped per-project or per-organization. `hasPermission()`/`requirePermission()` (`src/lib/auth/permissions.ts`) is the single place this is evaluated — route handlers and services call it, never re-implementing the check inline.
- Unit-tested (`src/lib/auth/permissions.test.ts`): correct `OR` scoping by project/organization, an empty scope never matches anything, `requirePermission` throws `ForbiddenPermissionError` when the permission is missing, `hasAnyPermission`/`requireAnyPermission` short-circuit correctly.
- Project isolation: `assertProjectMember()` (`src/lib/project-context.ts`) is the IDOR guard called at the top of every project-scoped route — a stale "preferred project" cookie can never leak another project's data, because membership is re-checked against the database on every call, not trusted from the cookie. Unit-tested (`src/lib/project-context.test.ts`), including the specific stale-cookie scenario.

## Storage path hardening

`src/lib/storage/local-driver.ts`'s `resolveStoragePath()` resolves a stored key to an absolute path and rejects anything that would land outside `STORAGE_ROOT`. This same function governs every file-serving route regardless of which `StorageDriver` is active (see [ARCHITECTURE.md](ARCHITECTURE.md)) — the S3 driver has an equivalent boundary built in by construction, since S3 object keys are scoped to the configured bucket and never resolve outside it the way a filesystem path can.

**Before this pass:** the check was `resolved.startsWith(STORAGE_ROOT)` — a sibling-prefix bug. A path resolving to a directory like `storage-evil` (next to `storage`) also starts with the string `".../storage"` and would have incorrectly passed.

**Now:** the check uses `path.relative(STORAGE_ROOT, resolved)` and rejects anything where the relative path is empty, starts with `..`, or is itself absolute — the only way to be "inside" the root is a relative path with no leading `..` segment.

Unit-tested (`src/lib/storage/local-driver.test.ts`): plain/nested safe paths accepted; single- and multi-segment `../` traversal rejected; traversal buried mid-path rejected; absolute-path escape rejected; the storage root itself rejected (not a valid file key); the exact sibling-prefix attack (`storage-evil`) rejected; a literal `%2e%2e` string (not a decoded `..`) correctly treated as just an odd filename, since `storedPath` values in this app are always server-generated (`randomUUID()`) and never raw user input.

Also verified live: a real PDF was uploaded through the actual HTTP API (Temporary Files) against an isolated test server/database, then fetched back through the real file-serving route — byte-identical, correct `Content-Type`/`Content-Disposition`, with the new security headers present on the response.

## File integrity (checksum) — a real, honest gap, not claimed as uniform

A `sha256()` checksum helper (`src/lib/management-system/checksum.ts`) exists and is actually used: `ManagementSystemDocumentVersion` and `ManagementSystemCertificate` both store a `checksum` column, computed at upload. The main Documents/Mail/HSE/Field attachment paths (`Document`/`DocumentVersion`, `MailAttachment`, `HseAttachment`, `FieldAttachment`, `TemporaryFile`) do **not** have an equivalent column or computation — found during this pass's storage review, not fixed, because adding it correctly means a schema migration across five models plus backfilling (or explicitly not backfilling, and documenting why) every existing row, which is real, separate work, not a drive-by addition under an unrelated mandate. Documented here so it's a known, named gap rather than something someone discovers by surprise later.

Set globally in `next.config.ts`'s `headers()` and verified live (`curl` against a running production build) to actually be present on real responses — not just configured:

| Header | Value | Why |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Stops MIME-sniffing a served file into something it isn't |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits what leaks in the `Referer` header to other origins |
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking protection |
| `Content-Security-Policy` | see below | Restricts where scripts/styles/connections/frames can come from |
| `Permissions-Policy` | camera/microphone/geolocation/payment/usb/interest-cohort all disabled | This app needs none of these browser capabilities |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Production only (`NODE_ENV=production`) |

**Content-Security-Policy**, as actually sent:
```
default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self';
object-src 'none'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';
style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;
connect-src 'self'; worker-src 'self' blob:
```

**Known, deliberate gap, investigated this pass — not an oversight:** `script-src`/`style-src` include `'unsafe-inline'`. `'wasm-unsafe-eval'` is specifically for `pdfjs-dist` (PDF thumbnails use a WebAssembly codec path) — not a general `eval` allowance.

Nonce-based strict CSP was genuinely investigated, not just deferred by default. Per Next.js 16's own documentation (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md` — this version renamed `middleware` to `proxy`, another "not the Next.js you know" difference worth noting for whoever picks this up next): a nonce is generated in `proxy.ts`, forwarded via a request header, and Next automatically applies it to its own inline hydration scripts — **but only for dynamically-rendered pages**. Nonces are generated per-request; a statically-generated page has no request to generate one from, so "all pages using a nonce-based CSP must be dynamically rendered" is a hard requirement, not a tuning knob.

This app has real statically-generated pages that would be affected: the marketing site's `/projects/[slug]` pages use `generateStaticParams` (confirmed in the build output, marked `●` for prerendered). Adopting nonce-based CSP means one of:
- **(a)** Forcing those pages to dynamic rendering (`await connection()`), losing build-time generation and CDN caching for public marketing content that has no sensitive data and no reason to need either — a real regression for zero security benefit on those specific pages, or
- **(b)** Running two separate CSP enforcement paths (a nonce-based one via `proxy.ts` for the dynamic `(app)` routes, the current static policy via `next.config.ts` for the static `(marketing)` routes) — which is exactly the kind of "security control has two independent implementations that can drift out of sync" complexity that tends to produce the next real vulnerability, not prevent one.

Weighed against that cost: this app's largest realistic stored-XSS vector — user-authored rich-text Mail content — is already independently defused server-side via `sanitize-html` (`src/lib/mail/sanitize-html.ts`'s `sanitizeMailHtml()`, applied in every mail-writing path: `mail-service.ts`, `incoming-mail-service.ts`, `transmittal-service.ts`, `auto-text-service.ts`, `signature-service.ts`) before it ever reaches a browser, regardless of what the CSP allows. A nonce would add defense-in-depth on top of that, but isn't the only thing standing between user-authored HTML and script execution.

**Decision: keep `'unsafe-inline'`, documented here with the actual tradeoff, rather than either faking a nonce rollout or silently leaving it unexplained.** If a future pass needs this tightened, start from the architecture conflict above, not from scratch.

**Live verification performed:** production build started on an isolated port against a disposable database; confirmed via `curl` that every header above is actually returned on `/login`; logged in through the real `/api/auth/login` endpoint and confirmed the session cookie is `Secure; HttpOnly; SameSite=lax`; uploaded and re-fetched a real PDF through the Temporary Files file route; ran a Playwright smoke pass (`chromium`) through login → dashboard capturing all console/page errors — zero errors, zero CSP violations.

## Health endpoints

`/api/health/live` (process is running, no dependency checks — an orchestrator should restart on failure here) and `/api/health/ready` (checks `SELECT 1` against the real database; returns `503` with a generic `{"status":"error"}` body on failure, logging the real error server-side only — never returned to the client). Unit-tested (`src/app/api/health/live/route.test.ts`, `src/app/api/health/ready/route.test.ts`), including a specific assertion that a mocked connection-refused error containing a password does not leak into the JSON response.

## `npm audit` — current state and triage

As of this pass: **0 critical, 8 high, 2 moderate** (down from 1 critical, 10 high, 2 moderate at the start of this pass).

**Fixed in this pass:**
- `next` 16.3.4 → 16.4.0 — patches a **critical** RCE in `next/og`'s `ImageResponse`, plus several high-severity cache-poisoning/SSRF/info-disclosure advisories. Non-major bump; full `tsc`/`eslint`/`vitest`/`next build` re-verified green afterward.
- `brace-expansion`, `sharp` — safe transitive bumps via `npm audit fix` (no direct dependency version changed).

**Investigated and deliberately left as accepted residual risk** (each one individually, not blindly — see below for why each is not actually fixable right now without unacceptable risk):

| Finding | Why it's accepted |
|---|---|
| `prisma` / `@prisma/config` / `deepmerge-ts` (high) | Root cause is `deepmerge-ts@<8.0.0` (CVSS score reported as 0 — stack exhaustion on attacker-controlled deeply-nested config objects). Checked: even the latest **stable** Prisma release (7.10.0) still depends on `deepmerge-ts@7.1.5` — there is no fixed version to upgrade to yet without using an unreleased `8.x-dev` prerelease of Prisma against a real database, which is inappropriate. This dependency chain only runs at CLI/build time against our own local `prisma.config.ts`, never against attacker-controlled HTTP input. |
| `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces` (high) | Checked: `braces@3.0.3` is already the latest version published on npm — there is no fixed release yet for this CVE anywhere upstream. `npm audit`'s suggested "fix" (downgrading `eslint-config-next` to a `14.x` release built for Next 14) would break this project's Next 16 lint rules and is not a real fix regardless. Pure dev-tooling (ESLint), never shipped to production, never reachable by an attacker. |
| `exceljs` → `uuid@8.3.2` (moderate) | Checked: the latest stable `exceljs` (4.4.0, already installed) still pins `uuid@^8.3.0`. The vulnerable code path requires a caller to pass a pre-allocated buffer into `uuid`'s `v3`/`v5`/`v6` functions; `exceljs`'s internal usage does not do this. Forcing a `uuid@11.x` override would be a major-version jump (CJS → ESM-only) risking a silent runtime break in a real, used feature (Excel export) with no test coverage to catch it. |

CI (`.github/workflows/ci.yml`) runs `npm audit --audit-level=critical` on every build — it genuinely fails the pipeline if a new **critical** advisory appears, but does not gate on the already-triaged high/moderate findings above, for the reasons given.

## Things this pass explicitly did **not** attempt

- Nonce-based strict CSP (removing `'unsafe-inline'`) — see above.
- Distributed/production rate limiting — not implemented; would need a shared store (Redis) this deployment doesn't have.
- Object storage — files are local-disk only today (see [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)).
- A committed, CI-automated Playwright/E2E suite — see [TESTING.md](TESTING.md).
