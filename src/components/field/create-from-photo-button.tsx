"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { AlertCircle } from "@/components/ui/icons";
import { PRIORITY_LABELS } from "@/lib/field/status";
import type { FieldPriority } from "@prisma/client";

const TARGETS = [
  { value: "create-observation", label: "Observation", redirect: (id: string) => `/field/observations/${id}` },
  { value: "create-issue", label: "Issue", redirect: (id: string) => `/field/issues/${id}` },
  { value: "create-punch-item", label: "Punch Item", redirect: (id: string) => `/field/punch/${id}` },
] as const;

export function CreateFromPhotoButton({ photoId }: { photoId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<(typeof TARGETS)[number]["value"]>("create-issue");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<FieldPriority>("MEDIUM");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/field/photos/${photoId}/${target}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, priority }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to create the record.");
      return;
    }
    const def = TARGETS.find((t) => t.value === target)!;
    router.push(def.redirect(body.id));
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Create from Photo
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create Record from Photo">
        <div className="flex flex-col gap-3">
          {error && (
            <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Create a
            <Select value={target} onChange={(e) => setTarget(e.target.value as (typeof TARGETS)[number]["value"])}>
              {TARGETS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Title *
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Description *
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Priority
            <Select value={priority} onChange={(e) => setPriority(e.target.value as FieldPriority)}>
              {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </label>
          <Button type="button" variant="primary" onClick={submit} disabled={submitting} className="self-start">
            {submitting ? "Creating…" : "Create"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
