"use client";

import { useEffect, useState } from "react";

/** Aconex-style register selection: the header checkbox and individual row
 * checkboxes always operate on the current page ("explicit" mode); the
 * "Select All" text link switches into "select the entire filtered result
 * set" mode, resolved server-side (see /api/documents/resolve-selection) so
 * it is correct no matter how many pages the result set spans. Unchecking a
 * row while in that mode records it in excludeIds rather than losing the
 * "select all" intent entirely. */
export function useResultSetSelection(params: {
  projectId: string;
  registerScope: "STANDALONE_DOCUMENT" | "DRAWING";
  filterQuery: string;
}) {
  const { projectId, registerScope, filterQuery } = params;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [excludeIds, setExcludeIds] = useState<Set<string>>(new Set());
  const [resolvedIds, setResolvedIds] = useState<string[] | null>(null);
  const [resolving, setResolving] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!selectAllMatching) return;
    setResolving(true);
    const sp = new URLSearchParams(filterQuery);
    sp.set("projectId", projectId);
    sp.set("registerScope", registerScope);
    fetch(`/api/documents/resolve-selection?${sp.toString()}`)
      .then((res) => (res.ok ? res.json() : { ids: [] }))
      .then((data: { ids: string[] }) => setResolvedIds(data.ids ?? []))
      .catch(() => setResolvedIds([]))
      .finally(() => setResolving(false));
  }, [selectAllMatching, filterQuery, projectId, registerScope]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function clear() {
    setSelected(new Set());
    setSelectAllMatching(false);
    setExcludeIds(new Set());
    setResolvedIds(null);
  }

  function selectAll() {
    setSelected(new Set());
    setExcludeIds(new Set());
    setSelectAllMatching(true);
  }

  function toggleOne(id: string) {
    if (selectAllMatching) {
      setExcludeIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage(pageIds: string[]) {
    const allOnPageChecked = selectAllMatching
      ? pageIds.every((id) => !excludeIds.has(id))
      : pageIds.every((id) => selected.has(id));
    setSelectAllMatching(false);
    setExcludeIds(new Set());
    setSelected(allOnPageChecked ? new Set() : new Set(pageIds));
  }

  function isChecked(id: string) {
    return selectAllMatching ? !excludeIds.has(id) : selected.has(id);
  }

  const effectiveIds = selectAllMatching ? (resolvedIds ?? []).filter((id) => !excludeIds.has(id)) : [...selected];

  return { effectiveIds, isChecked, toggleOne, toggleAllOnPage, selectAll, clear, selectAllMatching, resolving };
}
