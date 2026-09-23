import type { DocumentRegisterScope } from "@prisma/client";

export const DOCUMENT_REGISTER_SCOPE_LABELS: Record<DocumentRegisterScope, string> = {
  STANDALONE_DOCUMENT: "Standalone Document",
  DRAWING: "Drawing",
  MAIL_ATTACHMENT_REFERENCE: "Mail Attachment Reference",
  MIGRATION_HOLD: "Migration Hold",
  ARCHIVED: "Archived",
};

/** Single source of truth for "which register does a document belong to,
 * given its resolved DocumentType" — used at document-creation time and
 * whenever a document's type changes, so registerScope never drifts out of
 * sync with DocumentType.isDrawingType. */
export function deriveRegisterScope(isDrawingType: boolean | null | undefined): DocumentRegisterScope {
  return isDrawingType ? "DRAWING" : "STANDALONE_DOCUMENT";
}

/** Whether it's safe to auto-resync a document's registerScope when its
 * type changes — never true for MIGRATION_HOLD/ARCHIVED/
 * MAIL_ATTACHMENT_REFERENCE, since those are deliberate lifecycle holds
 * that a routine metadata edit must not silently release. */
export function isAutoSyncableScope(scope: DocumentRegisterScope): boolean {
  return scope === "STANDALONE_DOCUMENT" || scope === "DRAWING";
}
