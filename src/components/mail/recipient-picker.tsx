"use client";

import { useEffect, useId, useState } from "react";
import { CreateGuestModal } from "@/components/mail/incoming/create-guest-modal";

export type DirectoryPerson = {
  userId: string;
  name: string;
  email: string;
  organization: string;
  accountType?: "FULL" | "GUEST";
};

type SearchResult =
  | ({ kind: "user" } & DirectoryPerson)
  | { kind: "group"; groupId: string; name: string; memberCount: number };

export function RecipientPicker({
  label,
  projectId,
  selected,
  onChange,
  onQueryChange,
  testId,
  multiple = true,
  allowCreateGuest = false,
}: {
  label: string;
  projectId: string;
  selected: DirectoryPerson[];
  onChange: (people: DirectoryPerson[]) => void;
  /** Lifts the raw (unselected) search text to the parent so it can warn
   * at submit time if the user typed a name but never picked a result. */
  onQueryChange?: (query: string) => void;
  testId?: string;
  /** When false, selecting a result replaces the current selection instead
   * of adding to it — used for single-identity fields like "Sent From".
   * Defaults to true so every existing call site (To/Cc) is unaffected. */
  multiple?: boolean;
  /** Shows a "+ Create Guest" affordance for onboarding an external
   * correspondent who isn't in the directory yet. Off by default so New
   * Mail's To/Cc remain exactly as they are today. */
  allowCreateGuest?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [searched, setSearched] = useState(false);
  const [creatingGuest, setCreatingGuest] = useState(false);
  const [resolvingGroup, setResolvingGroup] = useState(false);
  const listboxId = useId();

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const res = await fetch(
        `/api/directory/search?projectId=${projectId}&q=${encodeURIComponent(query)}`,
        { signal: controller.signal },
      ).catch(() => null);
      if (res?.ok) {
        const data: SearchResult[] = await res.json();
        // A single-identity field (e.g. "Sent From") can't be a mailing
        // group — filter those out rather than showing a selectable dead end.
        setResults(multiple ? data : data.filter((r) => r.kind === "user"));
        setHighlighted(0);
        setSearched(true);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, projectId, open, multiple]);

  function updateQuery(value: string) {
    setQuery(value);
    setSearched(false);
    setOpen(true);
    onQueryChange?.(value);
  }

  /** The only path that ever turns text into a real recipient — always a
   * DirectoryPerson straight from the API response, never raw input text. */
  function add(person: DirectoryPerson) {
    if (!multiple) {
      onChange([person]);
    } else if (!selected.some((p) => p.userId === person.userId)) {
      onChange([...selected, person]);
    }
    updateQuery("");
    setResults([]);
    setOpen(false);
  }

  /** Selecting a mailing group expands it into its real, current members —
   * never a bare group name sent to nobody. Members already selected are
   * deduped, and members with no email selection change silently no-ops. */
  async function addGroup(groupId: string) {
    setResolvingGroup(true);
    const res = await fetch(`/api/mailing-groups/${groupId}`).catch(() => null);
    setResolvingGroup(false);
    updateQuery("");
    setResults([]);
    setOpen(false);
    if (!res?.ok) return;
    const data = await res.json();
    const members: DirectoryPerson[] = data.members.map(
      (m: { userId: string; name: string; email: string; organization: string; accountType: "FULL" | "GUEST" }) => ({
        userId: m.userId,
        name: m.name,
        email: m.email,
        organization: m.organization,
        accountType: m.accountType,
      }),
    );
    const merged = [...selected];
    for (const m of members) {
      if (!merged.some((p) => p.userId === m.userId)) merged.push(m);
    }
    onChange(merged);
  }

  function remove(userId: string) {
    onChange(selected.filter((p) => p.userId !== userId));
  }

  function onBlur() {
    // Give a "mousedown" on a dropdown result time to fire (and call add(),
    // which already clears the query) before we close. If nothing was
    // selected, the query is still non-empty here — clear it so leftover,
    // never-selected text can't be mistaken for a saved recipient.
    setTimeout(() => {
      updateQuery("");
      setOpen(false);
    }, 150);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const result = results[highlighted] ?? results[0];
      if (result?.kind === "user") add(result);
      else if (result?.kind === "group") addGroup(result.groupId);
    }
  }

  const showNoResults = open && searched && query.trim().length > 0 && results.length === 0;

  return (
    <div className="relative" data-testid={testId}>
      <label className="mb-1 block text-xs font-medium text-accent underline underline-offset-2">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-1 rounded-[3px] border border-border bg-white px-2 py-1 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
        {selected.map((p) => (
          <span
            key={p.userId}
            className="flex items-center gap-1 rounded-[3px] bg-brand-100 px-2 py-0.5 text-xs text-brand-800"
          >
            {p.name}
            <button
              type="button"
              onClick={() => remove(p.userId)}
              className="text-brand-600 hover:text-brand-900"
              aria-label={`Remove ${p.name}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => updateQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          placeholder="Search directory…"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={listboxId}
          className="min-w-[120px] flex-1 border-0 py-1 text-[13px] outline-none"
        />
      </div>
      <p className="mt-1 text-[11px] text-text-muted">
        Select a contact from the list — typing a name alone does not add a recipient.
      </p>
      {open && results.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-[3px] border border-border bg-white shadow-lg"
        >
          {results.map((r, i) =>
            r.kind === "group" ? (
              <button
                type="button"
                key={`g-${r.groupId}`}
                role="option"
                aria-selected={i === highlighted}
                onMouseDown={() => addGroup(r.groupId)}
                onMouseEnter={() => setHighlighted(i)}
                disabled={resolvingGroup}
                className={`flex w-full flex-col items-start px-3 py-2 text-left text-[13px] ${
                  i === highlighted ? "bg-brand-50" : "hover:bg-brand-50"
                }`}
              >
                <span className="font-medium text-text-primary">
                  {r.name} <span className="ml-1 text-text-muted">(Group)</span>
                </span>
                <span className="text-xs text-text-secondary">
                  {r.memberCount} member{r.memberCount === 1 ? "" : "s"}
                </span>
              </button>
            ) : (
              <button
                type="button"
                key={r.userId}
                role="option"
                aria-selected={i === highlighted}
                onMouseDown={() => add(r)}
                onMouseEnter={() => setHighlighted(i)}
                className={`flex w-full flex-col items-start px-3 py-2 text-left text-[13px] ${
                  i === highlighted ? "bg-brand-50" : "hover:bg-brand-50"
                }`}
              >
                <span className="font-medium text-text-primary">
                  {r.name}
                  {r.accountType === "GUEST" && <span className="ml-1 text-text-muted">(Guest)</span>}
                </span>
                <span className="text-xs text-text-secondary">
                  {r.organization} · {r.email}
                </span>
              </button>
            ),
          )}
        </div>
      )}
      {showNoResults && (
        <div className="absolute z-20 mt-1 w-full rounded-[3px] border border-border bg-white px-3 py-2 text-[13px] text-text-muted shadow-lg">
          <p>No matching contacts found in the project directory.</p>
          {allowCreateGuest && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setCreatingGuest(true);
                setOpen(false);
              }}
              className="mt-1.5 text-xs font-medium text-brand-700 hover:underline"
            >
              + Create Guest
            </button>
          )}
        </div>
      )}
      {allowCreateGuest && (
        <CreateGuestModal
          open={creatingGuest}
          onClose={() => setCreatingGuest(false)}
          projectId={projectId}
          onCreated={add}
        />
      )}
    </div>
  );
}
