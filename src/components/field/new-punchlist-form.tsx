"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "@/components/ui/icons";
import { FieldAreaPicker, type FieldAreaOption } from "@/components/field/field-area-picker";

export function NewPunchlistForm({
  projectId,
  areaTree,
  members,
}: {
  projectId: string;
  areaTree: FieldAreaOption[];
  members: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [areaId, setAreaId] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/field/punchlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, title, areaId: areaId || undefined, description: description || undefined, dueDate: dueDate || undefined, ownerId: ownerId || undefined }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to create the punchlist.");
      return;
    }
    router.push(`/field/punch/lists/${body.id}`);
  }

  return (
    <div className="flex flex-col gap-3 rounded-[3px] border border-border bg-white p-4">
      {error && (
        <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Title *
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Location
        <FieldAreaPicker tree={areaTree} value={areaId} onChange={setAreaId} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Description
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Owner
          <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            <option value="">Not assigned yet</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Due Date
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
      </div>
      <Button type="button" variant="primary" onClick={submit} disabled={submitting} className="self-start">
        {submitting ? "Creating…" : "Create Punchlist"}
      </Button>
    </div>
  );
}
