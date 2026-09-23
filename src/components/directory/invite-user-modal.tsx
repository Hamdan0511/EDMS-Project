"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "@/components/ui/icons";

type Candidate = { userId: string; name: string; email: string; organization: string };

export function InviteUserModal({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const res = await fetch(
        `/api/directory/eligible-for-invite?projectId=${projectId}&q=${encodeURIComponent(query)}`,
        { signal: controller.signal },
      ).catch(() => null);
      if (res?.ok) setResults(await res.json());
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, projectId, open]);

  function add(c: Candidate) {
    if (!selected.some((s) => s.userId === c.userId)) {
      setSelected((prev) => [...prev, c]);
    }
    setQuery("");
    setResults([]);
  }

  function remove(userId: string) {
    setSelected((prev) => prev.filter((s) => s.userId !== userId));
  }

  function close() {
    if (submitting) return;
    setQuery("");
    setResults([]);
    setSelected([]);
    setError(null);
    onClose();
  }

  async function submit() {
    if (selected.length === 0) {
      setError("Select at least one user to invite.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/directory/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, userIds: selected.map((s) => s.userId) }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to invite the selected user(s).");
      return;
    }
    close();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={close} title="Invite User" width="max-w-lg">
      <div className="flex flex-col gap-3">
        {error && (
          <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="relative">
          <label className="mb-1 block text-xs font-medium text-text-secondary">Search users to invite</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or organization…"
            className="h-8 w-full rounded-[3px] border border-border bg-white px-2.5 text-[13px] outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          {results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-[3px] border border-border bg-white shadow-lg">
              {results.map((c) => (
                <button
                  type="button"
                  key={c.userId}
                  onMouseDown={() => add(c)}
                  className="flex w-full flex-col items-start px-3 py-2 text-left text-[13px] hover:bg-brand-50"
                >
                  <span className="font-medium text-text-primary">{c.name}</span>
                  <span className="text-xs text-text-secondary">
                    {c.organization} · {c.email}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Selected ({selected.length})
          </p>
          {selected.length === 0 ? (
            <p className="text-[13px] text-text-muted">No users selected yet.</p>
          ) : (
            <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-[3px] border border-border bg-background p-2">
              {selected.map((s) => (
                <li key={s.userId} className="flex items-center justify-between text-[13px]">
                  <span>
                    {s.name} <span className="text-text-muted">— {s.organization}</span>
                  </span>
                  <button type="button" onClick={() => remove(s.userId)} className="text-xs text-danger hover:underline">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? "Inviting..." : "Invite User"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
