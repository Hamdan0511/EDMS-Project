"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "@/components/ui/icons";
import { RecipientPicker, type DirectoryPerson } from "@/components/mail/recipient-picker";

export function CreateMailingGroupModal({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [members, setMembers] = useState<DirectoryPerson[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setMembers([]);
    setError(null);
  }

  function close() {
    if (submitting) return;
    reset();
    onClose();
  }

  async function submit() {
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/mailing-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, name: name.trim(), memberUserIds: members.map((m) => m.userId) }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to create the mailing group.");
      return;
    }
    reset();
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={close} title="Create Mailing Group" width="max-w-lg">
      <div className="flex flex-col gap-3">
        {error && (
          <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Group Name *
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Design Consultants" />
        </label>

        <RecipientPicker
          label="Edit Users — search Directory to add to the target list"
          projectId={projectId}
          selected={members}
          onChange={setMembers}
          multiple
          testId="mailing-group-members"
        />

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Target List ({members.length})
          </p>
          {members.length === 0 ? (
            <p className="text-[13px] text-text-muted">No members added yet.</p>
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
          <Button type="button" variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
