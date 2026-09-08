import { DEFAULT_VISIBLE_COLUMNS, COLUMN_STORAGE_KEY, type ColumnKey } from "./mail-table-columns";

/** Client-only read; callers must gate this behind a post-mount check to
 * avoid a hydration mismatch (the server has no access to localStorage). */
export function getSnapshot(): Record<ColumnKey, boolean> {
  try {
    const raw = window.localStorage.getItem(COLUMN_STORAGE_KEY);
    return raw ? { ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(raw) } : DEFAULT_VISIBLE_COLUMNS;
  } catch {
    return DEFAULT_VISIBLE_COLUMNS;
  }
}

export function setVisibleColumns(next: Record<ColumnKey, boolean>): void {
  try {
    window.localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // best-effort persistence only
  }
}
