# Data Model

The schema lives in `prisma/schema.prisma` — **88 models, 60 enums**, applied through 34 additive migrations (never a destructive reset) in `prisma/migrations/`. This document groups them by module; for exact fields, read the schema directly — it's the source of truth, and this document will drift out of date if treated as a substitute for it.

## Core / platform

`Organization`, `User`, `Session`, `Project`, `ProjectMember` — the tenancy model. A `User` belongs to the system; a `ProjectMember` row is what actually grants access to a `Project`, and is what `assertProjectMember()` checks on every request (see [SECURITY.md](SECURITY.md)).

`Permission`, `Role`, `RolePermission`, `UserRoleAssignment` — the RBAC catalog. Permissions are seeded in `prisma/seed.ts`, not invented ad hoc in route handlers.

`AuditLog` — a flat, append-only log (`action`, `entityType`, `entityId`, `userId`, `projectId`, `metadata`, timestamp) written by `logAudit()` from nearly every mutating service across every module below.

`SavedSearch`, `MailingGroup`/`MailingGroupMember` — cross-cutting utility models used by Mail/Directory.

## Documents

`Folder`, `DocumentType`, `DocumentMetadataOption`, `Document`, `DocumentVersion`, `TemporaryFile`, `PrintRequest`/`PrintRequestDocument`.

A `TemporaryFile` is never automatically a `Document` — a user explicitly "registers" it, which atomically creates the real `Document` + `DocumentVersion` row and marks the source `TemporaryFile` as `REGISTERED`, reusing the same physical stored file rather than duplicating it. "Drawings" is not a separate model — it's `Document` filtered by `registerScope`.

## Mail

`MailType`, `MailTypeAttributeOption`, `Mail`, `MailDocumentReference`, `MailRelatedMail`, `MailRecipient`, `MailAttachment`, `MailInlineImage`, `AutoText`, `Signature`.

`MailDocumentReference` snapshots `documentId` + `documentVersionId` + `revisionAtIssue` at send time — a reference to a document attached to a piece of correspondence is a point-in-time citation, not a live pointer that changes meaning if the document is later revised. This exact shape is reused by Field's own document-reference model (below).

## Workflow

`WorkflowOutcomeOption`, `WorkflowTemplate`, `WorkflowTemplateStep`, `WorkflowTemplateStepReviewer`, `Workflow`, `WorkflowDocument`, `WorkflowStepInstance`, `WorkflowStepReviewer`, `WorkflowEvent`.

A `Workflow` always routes over real `Document` rows (`WorkflowDocument`) — there is no generic `sourceType`/`sourceId` on `Workflow` itself, which is why Field's "Start Workflow" action is only offered once a Field record has at least one linked Document (see Field, below).

## HSE (Health & Safety)

`HseObservation`, `HseIncident`/`HseIncidentPerson`, `HseNearMiss`, `HseHazard`, `HseRiskAssessment`/`HseControl`, `HseInspectionTemplate`/`HseInspectionQuestion`/`HseInspection`/`HseInspectionResponse`, `HseCorrectiveAction`, `HsePermit`/`HsePermitApproval`, `HseEquipment`/`HseEquipmentInspection`/`HseEquipmentInspectionItem`, `HseEmergencyContact`/`HseEmergencyProcedure`/`HseEmergencyEvent`/`HseEmergencyDrill`/`HseEmergencyDrillAttendee`/`HseEmergencyDrillFinding`, `HseAttachment` (polymorphic via `recordType`/`recordId`, reused by every HSE sub-module rather than one attachment table per entity).

Each of `HseObservation`/`HseIncident`/`HseCorrectiveAction`/`HseEmergencyEvent` has its own ordered status lifecycle, individually verified — see [TEST_RESULTS.md](TEST_RESULTS.md)'s state-machine section for why they are *not* all identical (e.g. Incidents deliberately allow skipping intermediate stages; the others do not).

## Field (construction field operations)

`FieldArea` (hierarchical location), `FieldAttachment`/`FieldPhoto` (polymorphic, mirrors `HseAttachment`), `FieldDocumentReference` (polymorphic, mirrors `MailDocumentReference`'s snapshot shape, plus optional `pinX`/`pinY` for "view on drawing"), `FieldLookup` (one small reusable table for configurable type lists — Observation Type, Issue Type, Punch Trade, Test Type — instead of four near-identical tables or hardcoded enums), `FieldComment`, `FieldSiteWalk`.

`FieldObservation`, `FieldInspectionTemplate`/`FieldInspectionTemplateGroup`/`FieldInspectionTemplateItem`/`FieldInspection`/`FieldInspectionResponse`, `FieldIssue`, `FieldPunchlist`/`FieldPunchlistIssue`/`FieldPunchItem`, `FieldItp`/`FieldItpItem` (ITP & hold points), `FieldTest`.

A Field Issue's "Raise Corrective Action" reuses the **real, existing** `HseCorrectiveAction` model (via its loose `sourceType`/`sourceId` pair) rather than a second, duplicate corrective-action table.

## Management System

`ManagementSystemDocument`/`ManagementSystemDocumentVersion` (the controlled-document register), `ManagementSystemCertificate` (ISO certificates — QMS/EMS/OH&S — with real metadata: registration number, certifying body, issue/valid-until/expiry dates).

## Public site

`ContactEnquiry` — the one model backing the public marketing site's contact form.

## Conventions worth knowing before changing the schema

- **Additive only.** Every migration in `prisma/migrations/` has only ever added columns/tables/enum values — never a destructive rename/drop against real data. `prisma migrate reset` has never been run against the real database and must not be.
- **Polymorphic association over one-table-per-entity.** `HseAttachment`/`FieldAttachment`/`FieldDocumentReference`/`FieldComment` all use a `recordType` (string) + `recordId` pair rather than a foreign key per possible owner — deliberately, to avoid a combinatorial explosion of near-identical join tables as new record types are added.
- **Configurable vocabularies are rows, not enums**, when the project should be able to add its own without a migration — `FieldLookup`, `DocumentType`, `MailType` are the examples. Enums are used when the set of values really is fixed by business rules that shouldn't be end-user-editable (e.g. status lifecycles).
