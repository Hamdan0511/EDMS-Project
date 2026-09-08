export const MAX_TEMP_FILE_SIZE_BYTES = 200 * 1024 * 1024;

/** Extension -> canonical MIME type. Extensions are the source of truth for
 * the upload allow-list; the browser-supplied MIME type is only used for
 * display/inline-viewing decisions, never trusted for validation. */
export const ALLOWED_EXTENSIONS: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  dwg: "application/acad",
  dxf: "application/dxf",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
};

export const ACCEPT_ATTRIBUTE = Object.keys(ALLOWED_EXTENSIONS)
  .map((ext) => `.${ext}`)
  .join(",");

export function extensionOf(fileName: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(fileName);
  return match ? match[1].toLowerCase() : "";
}

export function isAllowedExtension(fileName: string): boolean {
  return extensionOf(fileName) in ALLOWED_EXTENSIONS;
}

/** The stored mimeType must always come from this canonical, extension-keyed
 * map — never from the client-supplied `File.type` header. `File.type` is
 * attacker-controlled (any HTTP client can set an arbitrary Content-Type on
 * a multipart part), and file-serving routes decide `Content-Disposition:
 * inline` vs `attachment` based on the stored mimeType. Trusting the client
 * value would let a file with a benign-looking extension be served inline
 * with a browser-executable content type (e.g. image/svg+xml), a stored-XSS
 * vector. Falls back to "application/octet-stream" (always downloaded, never
 * rendered inline) for anything outside the allow-list. */
export function canonicalMimeType(fileName: string): string {
  return ALLOWED_EXTENSIONS[extensionOf(fileName)] ?? "application/octet-stream";
}

export const FILE_TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "word", label: "Word" },
  { value: "excel", label: "Excel" },
  { value: "powerpoint", label: "PowerPoint" },
  { value: "image", label: "Image" },
  { value: "other", label: "Other" },
];

export const WORD_MIME_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
export const EXCEL_MIME_TYPES = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
export const POWERPOINT_MIME_TYPES = [
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
export const KNOWN_MIME_TYPES = [
  "application/pdf",
  ...WORD_MIME_TYPES,
  ...EXCEL_MIME_TYPES,
  ...POWERPOINT_MIME_TYPES,
];

export function fileTypeCategory(mimeType: string): string {
  if (mimeType === "application/pdf") return "pdf";
  if (WORD_MIME_TYPES.includes(mimeType)) return "word";
  if (EXCEL_MIME_TYPES.includes(mimeType)) return "excel";
  if (POWERPOINT_MIME_TYPES.includes(mimeType)) return "powerpoint";
  if (mimeType.startsWith("image/")) return "image";
  return "other";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
