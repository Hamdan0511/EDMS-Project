"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "@/components/ui/icons";
import { RecipientPicker, type DirectoryPerson } from "@/components/mail/recipient-picker";

export function EditMailingGroupModal({
  groupId,
  projectId,
  onClose,
}: {
  groupId: string;
  projectId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [locked, setLocked] = useState(false);
  const [members, setMembers] = useState<DirectoryPerson[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/mailing-groups/${groupId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setName(data.name);
        setLocked(data.locked);
        setMembers(
          data.members.map((m: { userId: string; name: string; email: string; organization: string; accountType: "FULL" | "GUEST" }) => ({
            userId: m.userId,
            name: m.name,
            email: m.email,
            organization: m.organization,
            accountType: m.accountType,
          })),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  async function submit() {
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/mailing-groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), locked, memberUserIds: members.map((m) => m.userId) }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to update the mailing group.");
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Modal open onClose={submitting ? () => {} : onClose} title="Edit Mailing Group" width="max-w-lg">
      {loading ? (
        <p className="text-[13px] text-text-muted">Loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {error && (
            <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Group Name *
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="flex items-center gap-1.5 text-[13px] text-text-primary">
            <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} />
            Locked — only members with group-management permission may edit
          </label>

          <RecipientPicker
            label="Edit Users — search Directory to add to the target list"
            projectId={projectId}
            selected={members}
            onChange={setMembers}
            multiple
            testId="mailing-group-edit-members"
          />

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Target List ({members.length})
            </p>
            {members.length === 0 ? (
              <p className="text-[13px] text-text-muted">No members.</p>
            ) : (
              <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-[3px] border border-border bg-background p-2">
                {members.map((m) => (
                  <li key={m.userId} className="flex items-center justify-between text-[13px]">
                    <span>
                      {m.name} <span className="text-text-muted">— {m.organization}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setMembers((prev) => prev.filter((p) => p.userId !== m.userId))}
                      className="text-xs text-danger hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
