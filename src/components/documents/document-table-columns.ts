export type ColumnKey =
  | "documentNo"
  | "revision"
  | "title"
  | "type"
  | "status"
  | "reviewStatus"
  | "discipline"
  | "functionalBreakdown"
  | "spatialBreakdown"
  | "uploadedBy"
  | "organization"
  | "dateUploaded"
  | "dateModified"
  | "workflowStatus"
  | "file"
  | "actions";

export const ALL_COLUMNS: { key: ColumnKey; label: string; required?: boolean; defaultVisible?: boolean }[] = [
  { key: "documentNo", label: "Document No.", required: true },
  { key: "revision", label: "Revision" },
  { key: "title", label: "Title", required: true },
  { key: "type", label: "Document Type" },
  { key: "status", label: "Status" },
  { key: "reviewStatus", label: "Review Status", defaultVisible: false },
  { key: "discipline", label: "Discipline" },
  { key: "functionalBreakdown", label: "Functional Breakdown", defaultVisible: false },
  { key: "spatialBreakdown", label: "Spatial Breakdown", defaultVisible: false },
  { key: "uploadedBy", label: "Uploaded By" },
  { key: "organization", label: "Organization" },
  { key: "dateUploaded", label: "Date Uploaded" },
  { key: "dateModified", label: "Date Modified" },
  { key: "workflowStatus", label: "Workflow Status" },
  { key: "file", label: "File" },
  { key: "actions", label: "Actions", required: true },
];

export const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = ALL_COLUMNS.reduce(
  (acc, c) => ({ ...acc, [c.key]: c.defaultVisible ?? true }),
  {} as Record<ColumnKey, boolean>,
);

export const COLUMN_STORAGE_KEY = "shanfari.documents.columns.v1";
