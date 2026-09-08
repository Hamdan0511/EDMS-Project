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
  const [results, setResults] = useState<DirectoryPerson[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [searched, setSearched] = useState(false);
  const [creatingGuest, setCreatingGuest] = useState(false);
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
        setResults(await res.json());
        setHighlighted(0);
        setSearched(true);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, projectId, open]);

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
      const person = results[highlighted] ?? results[0];
      if (person) add(person);
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
          {results.map((p, i) => (
            <button
              type="button"
              key={p.userId}
              role="option"
              aria-selected={i === highlighted}
              onMouseDown={() => add(p)}
              onMouseEnter={() => setHighlighted(i)}
              className={`flex w-full flex-col items-start px-3 py-2 text-left text-[13px] ${
                i === highlighted ? "bg-brand-50" : "hover:bg-brand-50"
              }`}
            >
              <span className="font-medium text-text-primary">
                {p.name}
                {p.accountType === "GUEST" && <span className="ml-1 text-text-muted">(Guest)</span>}
              </span>
              <span className="text-xs text-text-secondary">
                {p.organization} · {p.email}
              </span>
            </button>
          ))}
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
