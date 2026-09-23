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
  | "attachments"
  | "replies"
  | "replyDate"
  | "due";

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
  { key: "replies", label: "Replies" },
  { key: "replyDate", label: "Reply Date" },
  { key: "due", label: "Due" },
];

// Replies / Reply Date / Due start hidden — real, available via Add/Remove
// Columns, but not part of the dense default view (matching the reference's
// base register columns; these are the "where applicable" extras).
const HIDDEN_BY_DEFAULT: ColumnKey[] = ["replies", "replyDate", "due"];

export const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = ALL_COLUMNS.reduce(
  (acc, c) => ({ ...acc, [c.key]: !HIDDEN_BY_DEFAULT.includes(c.key) }),
  {} as Record<ColumnKey, boolean>,
);

export const COLUMN_STORAGE_KEY = "shanfari.mail.columns.v1";
