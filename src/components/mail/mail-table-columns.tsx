export type ColumnKey =
  | "mailNo"
  | "subject"
  | "date"
  | "from"
  | "fromOrg"
  | "toOrg"
  | "recipients"
  | "status"
  | "type"
  | "attachments";

export const ALL_COLUMNS: { key: ColumnKey; label: string; required?: boolean }[] = [
  { key: "mailNo", label: "Mail No.", required: true },
  { key: "subject", label: "Subject", required: true },
  { key: "date", label: "Date" },
  { key: "from", label: "From" },
  { key: "fromOrg", label: "From Organization" },
  { key: "toOrg", label: "To Organization" },
  { key: "recipients", label: "Recipients" },
  { key: "status", label: "Status" },
  { key: "type", label: "Type" },
  { key: "attachments", label: "Attachments" },
];

export const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = ALL_COLUMNS.reduce(
  (acc, c) => ({ ...acc, [c.key]: true }),
  {} as Record<ColumnKey, boolean>,
);

export const COLUMN_STORAGE_KEY = "shanfari.mail.columns.v1";
