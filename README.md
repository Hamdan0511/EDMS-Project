# Shanfari IMS

A functional enterprise-style **Information & Document Management System prototype** for Shanfari Trading & Furnishing Co. LLC — built with Next.js (App Router), Prisma, and PostgreSQL. It covers project correspondence, controlled documents, workflow approvals, HSE (Health & Safety), construction field operations, and management-system (ISO) document control for a construction/fit-out project, modeled on enterprise platforms (e.g. Oracle Aconex) for workflow reference only — no proprietary branding, code, or assets are reused.

**This is a prototype, not a production deployment.** It is not currently connected to Oracle Aconex, and it is not connected to any Shanfari production system. See [Relationship to Oracle Aconex](#relationship-to-oracle-aconex) below.

## Technology stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend:** Next.js Route Handlers (API routes), Node.js
- **Database:** PostgreSQL 16, via Prisma ORM 6
- **Authentication:** Custom session-based auth — bcrypt-hashed passwords, SHA-256-hashed session tokens in an httpOnly cookie, a server-side `Session` table (no third-party auth provider)
- **Authorization:** Database-backed RBAC (`Role` → `RolePermission` → `Permission`), checked server-side on every mutating route via `requirePermission()` — never only hidden in the UI
- **File storage:** Local disk, behind an authenticated API that never exposes real filesystem paths to the client (swappable to object storage later without changing callers — see [docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md))
- **Rich text:** Tiptap (mail composition)
- **PDF processing:** `pdf-lib` / `pdfjs-dist` (Split PDF, Extract PDF, in-browser PDF thumbnails — genuine processing, no external service)
- **Unit testing:** Vitest (see [docs/TESTING.md](docs/TESTING.md))
- **CI:** Two GitHub Actions workflows, both against a disposable Postgres service container, never the real database — `ci.yml` (install, Prisma validate, typecheck, lint, unit tests, build, `npm audit`) and `e2e.yml` (migrate, seed, build, start, run the Playwright suite, upload failure artifacts)

## Getting started

1. Copy `.env.example` to `.env` (the default values already point at the Docker Compose Postgres below; adjust `DATABASE_URL` if port 5434 is taken on your machine). See `.env.example` for what each variable actually does — there is currently only one required variable.
2. Start Postgres:
   ```bash
   docker compose up -d
   ```
3. Install dependencies, apply the schema, and seed a dev admin account:
   ```bash
   npm install
   npx prisma migrate dev
   npx prisma db seed
   ```
4. Run the dev server:
   ```bash
   npm run dev
   ```
5. Sign in at [http://localhost:3000](http://localhost:3000) with `admin@shanfari.local` / `ChangeMe123!` (a local dev-only seed account — never used outside this environment).

### Production build

```bash
npm run build
npm run start
```

See [docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md) for what "production" actually means for this prototype today, and what is still missing before it could run against real company data.

### Running tests

```bash
npm run test          # unit tests (Vitest), one-shot
npm run test:watch    # unit tests, watch mode
npm run test:coverage # unit tests with a real coverage report
```

See [docs/TESTING.md](docs/TESTING.md) for what is and isn't covered, and [docs/TEST_RESULTS.md](docs/TEST_RESULTS.md) for the full history of QA passes run against this codebase.

### Port note

If you already have a PostgreSQL server running natively on `5432`, this project's Docker container is mapped to host port **5434** to avoid silently connecting to the wrong database (see `docker-compose.yml`).

## Project structure

```
prisma/                        Schema, migrations, seed script
src/
  app/
    (app)/                     Authenticated app shell
      home/                    Project dashboard
      documents/               Document Register, Drawings, Temporary Files, Split/Extract PDF
      mail/                    Mail (All/Inbox/Sent/Drafts, compose, incoming registration)
      workflows/               Workflow templates + routed approval workflows
      directory/               Project members, organizations, mailing groups
      hse/                     Health & Safety (incidents, observations, inspections, permits,
                                 risk assessments, corrective actions, emergency management,
                                 equipment safety, statistics)
      field/                   Construction field operations (observations, issues, punch lists,
                                 ITP/hold points, tests, photos, site walks, reports)
      management-system/       Controlled document register + ISO certificates
      search/                  Cross-project search
    (marketing)/                Public-facing marketing site (about/services/projects/contact)
    api/                       Route handlers (REST-style JSON/multipart APIs)
    api/health/                Liveness/readiness endpoints
    document-print/, mail-print/, field-print/  Standalone branded print views
    login/                     Login page
  components/                  UI components, grouped by module (documents/, mail/, hse/, field/, ...)
  lib/
    auth/                      Session + RBAC permission checks
    services/                  Business logic (one service module per entity/workflow)
    storage.ts                 Local-disk file storage abstraction
    *                          Validation, numbering, status/state-machine helpers, per module
  instrumentation.ts           Fails fast on server start if required env vars are missing
storage/                       Local file storage root (gitignored; created at runtime)
docs/                          Architecture, security, testing, deployment, and QA documentation
.github/workflows/ci.yml       CI pipeline
```

## Authentication & authorization

- Passwords are hashed with bcrypt; sessions are opaque random tokens, SHA-256-hashed before being stored, set as an httpOnly cookie (`Secure` in production).
- Every project-scoped API route resolves the target resource's real `projectId` from the database first, then calls `assertProjectMember()` — a client cannot access another project's data by manipulating an ID in a URL or request body.
- Authorization is a real database-backed RBAC catalog (`Permission` / `Role` / `RolePermission` / `UserRoleAssignment`), checked server-side via `requirePermission()`/`hasPermission()` on every mutating route — see [docs/SECURITY.md](docs/SECURITY.md).

## Modules

- **Home** — project-scoped dashboard with real counts and recent activity.
- **Documents** — Document Register (search/filter/sort/pagination/column management/bulk actions/real ZIP export), Document Detail with revision history, Temporary Files (upload, register as document), Split PDF, Extract PDF, Drawings (a filtered Document Register view).
- **Mail** — All Mail / Inbox / Sent / Drafts tabs with search, filters, advanced search; New Mail (rich-text compose, real Directory-backed To/Cc, attachments, draft/send, Reply/Reply All/Forward); Register Incoming Mail; Mail Detail with threading, Response Required/Overdue tracking, Close-Out, and Print.
- **Workflows** — configurable multi-step approval templates routed over real Documents, with a full event/audit history per workflow instance.
- **Directory** — real project members (users + organizations), searchable, reused by every recipient picker in Mail.
- **HSE (Health & Safety)** — incidents, observations, near misses, hazards, risk assessments, inspections, permits to work, corrective actions, emergency management (procedures/events/drills/contacts), equipment safety, and statistics — each with its own server-enforced status lifecycle.
- **Field** — construction field operations: site observations, quality inspections (template-driven), issues, punch lists/snagging, ITP & hold points, test/inspection results, site photos, site walks, and reports — integrated with Documents/Drawings, Workflows, and HSE corrective actions rather than duplicating them.
- **Management System** — the controlled-document register (ISO-style metadata: Doc Owner, Doc Type, revision, author) and the ISO certificate library (QMS/EMS/OH&S), with direct-to-file links rather than a built-in viewer.
- **Cross-project search** — a global search across the user's accessible projects.

## Audit trail

Meaningful actions are logged to `AuditLog` (action, entity, user, project, timestamp, metadata) across every module above — logins, uploads, registrations, status transitions, deletions, and sends.

## Relationship to Oracle Aconex

This system is **not** integrated with Oracle Aconex today. The intended future architecture, once a real integration is commissioned, is:

```
Oracle Aconex
     ↓
Approved API / Integration Layer
     ↓
Shanfari Backend
     ↓
Shanfari PostgreSQL + Private Storage
     ↓
Shanfari IMS
```

Nothing in this codebase currently implements the "Approved API / Integration Layer" step — this system runs entirely on its own database and local storage, as described above.

## Further documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — how the modules fit together
- [docs/SECURITY.md](docs/SECURITY.md) — auth, RBAC, storage hardening, headers, and known residual risk
- [docs/TESTING.md](docs/TESTING.md) — what's unit-tested, what's manually/E2E-verified, what's deferred
- [docs/TEST_RESULTS.md](docs/TEST_RESULTS.md) — the full history of QA passes run against this codebase
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md) — the Prisma schema, module by module
- [docs/API.md](docs/API.md) — the route-handler API surface and its conventions
- [docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md), [docs/PRODUCTION_DATABASE.md](docs/PRODUCTION_DATABASE.md), [docs/BACKUP_AND_RESTORE.md](docs/BACKUP_AND_RESTORE.md), [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) — what it would take to run this for real, and what's still missing
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — local dev workflow and conventions
- [docs/QA_REPORT.md](docs/QA_REPORT.md), [docs/ENGINEERING_SCORECARD.md](docs/ENGINEERING_SCORECARD.md) — honest, evidence-based self-assessment
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — notable changes

## Current Production Limitations

This distinguishes **production architecture readiness** (the code is written, tested, and would work against real infrastructure) from **actual production infrastructure deployment** (nothing below has ever been deployed outside this development environment):

| Area | Status |
|---|---|
| Database | Architecture-ready (migrations, indexes, constraints, transactions all reviewed — see [docs/PRODUCTION_DATABASE.md](docs/PRODUCTION_DATABASE.md)). **Not deployed**: no managed Postgres instance, no automated backups, single Docker container only. |
| File storage | Architecture-ready (driver abstraction, S3-compatible driver code-complete and unit-tested against a mocked client — see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)). **Not deployed**: never run against a real bucket; local disk is what's actually used today. |
| File integrity | Checksums exist for Management System documents/certificates only — not yet for Documents/Mail/HSE/Field attachments. See [docs/SECURITY.md](docs/SECURITY.md). |
| Backup/restore | Procedure drilled and verified end-to-end against disposable databases (see [docs/BACKUP_AND_RESTORE.md](docs/BACKUP_AND_RESTORE.md)). **Not deployed**: no automated/scheduled backup job exists. |
| Testing | Real, CI-enforced unit (135 tests) and E2E (32 tests) suites — see [docs/TESTING.md](docs/TESTING.md). Scoped to the highest-value logic and journeys, not exhaustive. |
| CI/CD | Two real GitHub Actions workflows (unit/build/audit; E2E against a disposable Postgres service container) — both dry-run-verified before being trusted. No dedicated "security" CI job beyond `npm audit` + the auth/RBAC/storage unit tests; broader security verification (Phase 1) was a manual pass, not yet automated. |
| CSP | `'unsafe-inline'` kept deliberately — investigated via Next.js's own docs, not just deferred; conflicts with this app's statically-generated marketing pages. See [docs/SECURITY.md](docs/SECURITY.md). |
| Observability | Structured logging with sensitive-data redaction exists and is wired into auth/health-check failures. **Not deployed**: no metrics, tracing, log aggregation, or alerting platform. See [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md). |
| `npm audit` | 0 critical, 8 high, 2 moderate — every finding individually investigated; none has a safe fix available upstream yet. See [docs/SECURITY.md](docs/SECURITY.md). |
| Scheduled jobs | Overdue mail/field/HSE statuses are computed at read time; there is no cron/queue infrastructure in this project. |

See [docs/ENGINEERING_SCORECARD.md](docs/ENGINEERING_SCORECARD.md) for the evidence behind each score, and [docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md) for a reference (non-deployed) example of what standing this up for real would look like.
