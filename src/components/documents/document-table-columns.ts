export type ColumnKey =
  | "documentNo"
  | "revision"
  | "title"
  | "type"
  | "status"
  | "discipline"
  | "uploadedBy"
  | "organization"
  | "dateUploaded"
  | "dateModified"
  | "workflowStatus"
  | "file"
  | "actions";

export const ALL_COLUMNS: { key: ColumnKey; label: string; required?: boolean }[] = [
  { key: "documentNo", label: "Document No.", required: true },
  { key: "revision", label: "Revision" },
  { key: "title", label: "Title", required: true },
  { key: "type", label: "Document Type" },
  { key: "status", label: "Status" },
  { key: "discipline", label: "Discipline" },
  { key: "uploadedBy", label: "Uploaded By" },
  { key: "organization", label: "Organization" },
  { key: "dateUploaded", label: "Date Uploaded" },
  { key: "dateModified", label: "Date Modified" },
  { key: "workflowStatus", label: "Workflow Status" },
  { key: "file", label: "File" },
  { key: "actions", label: "Actions", required: true },
];

export const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = ALL_COLUMNS.reduce(
  (acc, c) => ({ ...acc, [c.key]: true }),
  {} as Record<ColumnKey, boolean>,
);

export const COLUMN_STORAGE_KEY = "shanfari.documents.columns.v1";
