"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AlertCircle, FileCheck2 } from "@/components/ui/icons";
import { ACTION_PRIORITY_LABELS } from "@/lib/hse/status";
import type { HseActionPriority } from "@prisma/client";

/** Raises a real row in the EXISTING HSE Corrective Action register — no
 * parallel action system for Field Issues. */
export function RaiseCorrectiveActionButton({
  issueId,
  members,
}: {
  issueId: string;
  members: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [assignedToId, setAssignedToId] = useState("");
  const [priority, setPriority] = useState<HseActionPriority>("HIGH");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/field/issues/${issueId}/raise-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId: assignedToId || undefined, priority, dueDate: dueDate || undefined }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to raise the corrective action.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <FileCheck2 size={13} />
        Raise Corrective Action
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Raise Corrective Action">
        <div className="flex flex-col gap-3">
          {error && (
            <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Owner
            <Select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Priority
            <Select value={priority} onChange={(e) => setPriority(e.target.value as HseActionPriority)}>
              {Object.entries(ACTION_PRIORITY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Due Date
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <Button type="button" variant="primary" onClick={submit} disabled={submitting} className="self-start">
            {submitting ? "Raising…" : "Raise Corrective Action"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
