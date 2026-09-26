"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { AlertCircle } from "@/components/ui/icons";
import { ACTION_PRIORITY_LABELS } from "@/lib/hse/status";

const textareaClass =
  "w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent";

export function NewCorrectiveActionForm({
  projectId,
  members,
  sourceType = "manual",
  sourceId,
}: {
  projectId: string;
  members: { id: string; name: string }[];
  sourceType?: string;
  sourceId?: string;
}) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/hse/corrective-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        sourceType,
        sourceId,
        description,
        assignedToId: assignedToId || undefined,
        priority,
        dueDate: dueDate || undefined,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to create the corrective action.");
      return;
    }
    router.push(`/hse/corrective-actions/${body.id}`);
  }

  return (
    <div className="flex flex-col rounded-[3px] border border-border bg-white">
      {error && (
        <div className="m-4 mb-0 flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <SectionHeader>Action Details</SectionHeader>
      <div className="px-4 py-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Description *
          <textarea rows={3} className={textareaClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the corrective action required" />
        </label>
      </div>

      <SectionHeader>Assignment</SectionHeader>
      <div className="flex flex-col gap-3 px-4 py-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Assigned To
            <Select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Priority
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {Object.entries(ACTION_PRIORITY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Due Date
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
      </div>

      <div className="px-4 py-3">
        <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
          {submitting ? "Creating…" : "Create Corrective Action"}
        </Button>
      </div>
    </div>
  );
}
