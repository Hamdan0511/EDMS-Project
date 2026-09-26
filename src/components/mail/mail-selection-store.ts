/**
 * Aconex-style "select current page / select all results / clear" state.
 *
 * Two modes:
 *  - MANUAL: `ids` is the real set of explicitly-selected Mail IDs,
 *    accumulated across however many pages the user has visited.
 *  - ALL_RESULTS: every Mail matching the current server-side query is
 *    considered selected; `ids` instead holds the (usually much smaller)
 *    set of individually-deselected exclusions.
 *
 * Persisted in sessionStorage (per-tab, cleared on browser close — this is
 * working state, not a durable preference) keyed against a snapshot of the
 * current query. If the stored signature doesn't match the live query
 * (tab/filter/search/standard-search changed), the selection is discarded
 * rather than silently carried over to a different result set.
 */

export type MailSelectionMode = "MANUAL" | "ALL_RESULTS";

export type MailSelectionState = {
  querySignature: string;
  mode: MailSelectionMode;
  ids: string[];
};

const STORAGE_KEY = "shanfari-mail-selection";

function emptyState(querySignature: string): MailSelectionState {
  return { querySignature, mode: "MANUAL", ids: [] };
}

export function loadMailSelection(querySignature: string): MailSelectionState {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState(querySignature);
    const parsed = JSON.parse(raw) as MailSelectionState;
    if (parsed.querySignature !== querySignature || !Array.isArray(parsed.ids)) return emptyState(querySignature);
    return parsed;
  } catch {
    return emptyState(querySignature);
  }
}

export function saveMailSelection(state: MailSelectionState): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // best-effort persistence only
  }
}

export function selectionCount(state: MailSelectionState, totalResults: number): number {
  return state.mode === "ALL_RESULTS" ? Math.max(totalResults - state.ids.length, 0) : state.ids.length;
}

export function isIdSelected(state: MailSelectionState, id: string): boolean {
  return state.mode === "ALL_RESULTS" ? !state.ids.includes(id) : state.ids.includes(id);
}

/** Toggle a single row — meaning depends on mode (add/remove from the
 * included set in MANUAL, add/remove from the excluded set in ALL_RESULTS). */
export function toggleId(state: MailSelectionState, id: string): MailSelectionState {
  const has = state.ids.includes(id);
  return { ...state, ids: has ? state.ids.filter((x) => x !== id) : [...state.ids, id] };
}

/** "Select current page" — union the given page's real IDs into the
 * selection (or, in ALL_RESULTS mode, ensure none of them are excluded). */
export function selectIds(state: MailSelectionState, pageIds: string[]): MailSelectionState {
  if (state.mode === "ALL_RESULTS") {
    return { ...state, ids: state.ids.filter((id) => !pageIds.includes(id)) };
  }
  return { ...state, ids: [...new Set([...state.ids, ...pageIds])] };
}

/** "Deselect current page" — the header-checkbox toggle-off counterpart to
 * selectIds. */
export function deselectIds(state: MailSelectionState, pageIds: string[]): MailSelectionState {
  if (state.mode === "ALL_RESULTS") {
    return { ...state, ids: [...new Set([...state.ids, ...pageIds])] };
  }
  return { ...state, ids: state.ids.filter((id) => !pageIds.includes(id)) };
}

export function selectAllResults(querySignature: string): MailSelectionState {
  return { querySignature, mode: "ALL_RESULTS", ids: [] };
}

export function clearSelection(querySignature: string): MailSelectionState {
  return emptyState(querySignature);
}
