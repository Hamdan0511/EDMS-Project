# Shanfari EDMS

An Electronic Document Management System (EDMS) for Shanfari Furnishing, built with Next.js (App Router), Prisma, and PostgreSQL. It manages project correspondence (mail) and controlled documents for a construction/fit-out project, modeled on enterprise EDMS platforms (e.g. Oracle Aconex) for workflow reference only — no proprietary branding, code, or assets are reused.

## Technology stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend:** Next.js Route Handlers (API routes), Node.js
- **Database:** PostgreSQL 16, via Prisma ORM 6
- **Authentication:** Custom session-based auth — bcrypt-hashed passwords, SHA-256-hashed session tokens in an httpOnly cookie, a server-side `Session` table (no third-party auth provider)
- **File storage:** Local disk, behind an authenticated API that never exposes real filesystem paths to the client (swappable to object storage later without changing callers)
- **Rich text:** Tiptap (mail composition)
- **PDF processing:** `pdf-lib` (Split PDF, Extract PDF — genuine server-side processing, no external service)
- **Testing:** Playwright (used for ad-hoc, script-based end-to-end verification during development; no committed automated test suite yet)

## Getting started

1. Copy `.env.example` to `.env` (the default values already point at the Docker Compose Postgres below; adjust `DATABASE_URL` if port 5434 is taken on your machine).
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

### Port note

If you already have a PostgreSQL server running natively on `5432`, this project's Docker container is mapped to host port **5434** to avoid silently connecting to the wrong database (see `docker-compose.yml`).

## Project structure

```
prisma/                   Schema, migrations, seed script
src/
  app/
    (app)/                Authenticated app shell: home, documents, mail, directory, search
    api/                  Route handlers (REST-style JSON/multipart APIs)
    document-print/       Standalone print view for a Document
    mail-print/           Standalone print view for a Mail (Screen/Letter style)
    login/                Login page
  components/
    documents/            Document Register, Document Detail, Split/Extract PDF, Temporary Files
    mail/                 Mail list/compose/detail, rich-text editor, Register Incoming Mail
    app-shell/            Header, nav, page header
    ui/                   Shared primitives (Button, Input, Select, Modal, Table, ...)
  lib/
    auth/, mail/, documents/, temporary-files/, services/, validation/, files/
    Business logic and validation live here, not in route handlers or components.
  generated/prisma/       Prisma client output (generated, not hand-edited)
storage/                  Local file storage root (gitignored; created at runtime)
```

## Authentication & authorization

- Passwords are hashed with bcrypt; sessions are opaque random tokens, SHA-256-hashed before being stored, set as an httpOnly cookie.
- Every project-scoped API route resolves the target resource's real `projectId` from the database first, then calls `assertProjectMember` — a client cannot access another project's data by manipulating an ID in a URL or request body.
- Role-based restrictions (`ADMIN` / `MEMBER` / `VIEWER`) are enforced server-side on every mutating route, not just hidden in the UI.

## Core EDMS workflows

**Temporary Files → Document Register.** A working file (a manual upload, or the output of a PDF utility) is never automatically an official Document. It is first saved as a `TemporaryFile`. A user must explicitly "Register as Document" — this atomically creates the real `Document` + `DocumentVersion` and marks the source `TemporaryFile` as `REGISTERED`, reusing the same physical file rather than duplicating it.

**Split PDF / Extract PDF.** Both process the uploaded PDF entirely server-side (`pdf-lib`) — no external service. Split PDF produces one `TemporaryFile` per page; Extract PDF returns the extracted pages directly, with an option to also save the result to Temporary Files. Neither ever creates a Document directly.

**Register Incoming Mail.** Models correspondence *received* from an external/project party, as distinct from New Mail (correspondence the project team sends). The external sender is a real Directory contact — either an existing project member or a lightweight "guest" contact created inline (a real `User`/`ProjectMember` marked as a non-login guest account, so it fully reuses the existing Directory search and recipient-picker UI). Supports Mail Type, configurable per-type attributes (with an inline "Select Attributes" picker), Response Required with a due date, attaching an existing Document or existing Mail by reference, and local file attachments. Draft and Register both persist to the same `Mail` model New Mail uses, tagged with `direction: INCOMING`.

## Modules

- **Home** — project-scoped dashboard with real counts and recent activity.
- **Documents** — Document Register (search/filter/sort/pagination/column management/bulk actions/real ZIP export), Document Detail with revision history, Temporary Files (upload, register as document), Split PDF, Extract PDF, Drawings (a filtered Document Register view).
- **Mail** — All Mail / Inbox / Sent / Drafts tabs with search, filters, advanced search, column management; New Mail (rich-text compose, real Directory-backed To/Cc, attachments, draft/send, Reply/Reply All/Forward with quoted-thread content); Register Incoming Mail; Mail Detail with threading, Response Required/Overdue tracking, Close-Out, and Print (Screen and Letter styles).
- **Directory** — real project members (users + organizations), searchable, reused by every recipient picker in Mail.
- **Cross-project search** — a global search across the user's accessible projects.
- **Mail Approvals** — routed nav entry, not yet implemented (shown as an honest "not yet implemented" empty state rather than a broken page).

## Audit trail

Meaningful actions are logged to `AuditLog` (action, entity, user, project, timestamp, metadata), including: login/logout, document upload/registration/metadata changes/deletion/revision creation, temporary file upload/registration/deletion, mail send/draft save/status changes, incoming mail registration, guest contact creation, and document/temporary-file open/download.

## Known limitations

- No automated test suite is committed (development relied on ad-hoc Playwright scripts run against a live dev server, plus TypeScript/ESLint/production-build checks).
- Mail Approvals is a routed stub.
- Overdue mail status is computed at read time (from `responseDueDate`), not persisted by a scheduled job — there is no background/cron infrastructure in this project.
