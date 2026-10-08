# Backup and Restore

## Current reality

**There is no automated production backup infrastructure in this repository today.** The dev Postgres container stores data in a single named Docker volume (`shanfari_pgdata`) with no automated snapshotting. What *is* real: the manual `pg_dump`/`pg_restore` procedure below was actually executed end-to-end against disposable databases (not the real one) and verified byte-for-byte correct — see "Drill results" below. Be precise about the difference: **the backup/restore procedure is verified. Automated, scheduled production backup infrastructure is not deployed.**

## Drill results (actually performed, not just documented)

A real drill was run: created a disposable database (`backup_drill_source`), applied all migrations, seeded real base data plus a representative `Document` with two real `DocumentVersion` rows (revisions A and B) and a real `Mail` row linked to that project and sender — then:

1. `pg_dump -F c` the disposable source database to a real `.dump` file.
2. **Destroyed the source database entirely** (`DROP DATABASE`) — not just disconnected, actually gone.
3. Created a second, separate disposable database (`backup_drill_restored`) and `pg_restore`'d the dump into it.
4. Compared full row counts (users, organizations, projects, project members, documents, document versions, mail, permissions, roles, role assignments) between a pre-backup baseline and the restored database.

**Result: every count matched exactly, the document's revision history (A→B) and version chain were intact, and the Mail row's relationships to its sender and project resolved correctly** — all after the original database no longer existed. Both disposable databases were dropped immediately afterward; the real/dev database was never touched by any step of this drill.

This proves the mechanics (`pg_dump`/`pg_restore` against this exact schema) work. It does not by itself prove an automated, scheduled, production backup pipeline exists — because one doesn't yet (see below).

## Manual backup (works today, using the tooling actually installed)

```bash
# From the host, against the Dockerized Postgres (adjust container name/port as needed):
docker exec imsproejct-db-1 pg_dump -U shanfari -d shanfari_edms -F c -f /tmp/shanfari_edms_backup.dump
docker cp imsproejct-db-1:/tmp/shanfari_edms_backup.dump ./shanfari_edms_backup.dump
```

On Windows Git Bash specifically, prefix both commands with `MSYS_NO_PATHCONV=1` — otherwise Git Bash silently rewrites the container-internal `/tmp/...` path into a host Windows path before it reaches `docker exec`, and `pg_dump` fails with a confusing "No such file or directory" against a path that was never meant to exist on the host.

## Manual restore (into a *new*, disposable database — never over the real one without a verified-good backup and explicit intent)

```bash
docker exec imsproejct-db-1 psql -U shanfari -d postgres -c "CREATE DATABASE shanfari_edms_restore_check;"
docker cp ./shanfari_edms_backup.dump imsproejct-db-1:/tmp/restore_check.dump
docker exec imsproejct-db-1 pg_restore -U shanfari -d shanfari_edms_restore_check /tmp/restore_check.dump
```

Restoring into a fresh, disposable database name first — never directly over the real database — is the same discipline this project uses for all destructive testing (see [DEVELOPMENT.md](DEVELOPMENT.md) and [PRODUCTION_DATABASE.md](PRODUCTION_DATABASE.md)). Verify the restored data looks right before ever considering a restore over a real database, and only do that with an explicit, deliberate decision — never as a routine/scripted step.

## Uploaded files

File storage is local disk (`./storage/`, gitignored) — a database backup alone does **not** capture uploaded files. Backing up `./storage/` alongside the database (e.g. `tar`/rsync to the same destination as the database dump) is necessary for a complete backup until the object-storage migration described in [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) happens, at which point the object-storage provider's own backup/versioning would take over this responsibility.

## What a real backup strategy would need

1. Automated, scheduled database backups (daily, minimum) with a retention policy, taken by whatever manages the production database (see [PRODUCTION_DATABASE.md](PRODUCTION_DATABASE.md)) — not a manual `pg_dump` run by a person.
2. Backups stored somewhere other than the same host/volume as the live database.
3. A periodically-tested restore procedure — a backup that has never been restored is unverified, not a backup.
4. File-storage backup/versioning, ideally made moot by migrating to an object-storage backend with its own durability guarantees.

None of the above is implemented or scheduled in this repository today — this document is the honest manual procedure, not a description of automation that exists.
