"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { AlertCircle, Plus, Trash2 } from "@/components/ui/icons";
import { ITP_CLASSIFICATION_LABELS } from "@/lib/field/status";
import { FieldAreaPicker, type FieldAreaOption } from "@/components/field/field-area-picker";

type ItemDraft = { activity: string; inspectionType: string; acceptanceCriteria: string };

export function NewItpForm({ projectId, areaTree }: { projectId: string; areaTree: FieldAreaOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [revision, setRevision] = useState("A");
  const [discipline, setDiscipline] = useState("");
  const [areaId, setAreaId] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([{ activity: "", inspectionType: "H", acceptanceCriteria: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(i: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { activity: "", inspectionType: "H", acceptanceCriteria: "" }]);
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/field/itp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        title,
        revision,
        discipline: discipline || undefined,
        areaId: areaId || undefined,
        description: description || undefined,
        items: items.map((it) => ({ activity: it.activity, inspectionType: it.inspectionType, acceptanceCriteria: it.acceptanceCriteria || undefined })),
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to create the ITP.");
      return;
    }
    router.push(`/field/itp/${body.id}`);
  }

  return (
    <div className="flex flex-col rounded-[3px] border border-border bg-white">
      {error && (
        <div className="m-4 mb-0 flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <SectionHeader>ITP Details</SectionHeader>
      <div className="flex flex-col gap-3 px-4 py-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Title *
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Concrete Pour ITP" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Revision
            <Input value={revision} onChange={(e) => setRevision(e.target.value)} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Discipline
            <Input value={discipline} onChange={(e) => setDiscipline(e.target.value)} placeholder="e.g. Civil / Structural" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Location
            <FieldAreaPicker tree={areaTree} value={areaId} onChange={setAreaId} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Description
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
      </div>

      <SectionHeader>Activities</SectionHeader>
      <div className="flex flex-col gap-2 px-4 py-3">
        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-[1fr_140px_1fr_28px] items-center gap-2">
            <Input value={item.activity} onChange={(e) => update(i, { activity: e.target.value })} placeholder={`Activity ${i + 1}`} />
            <Select value={item.inspectionType} onChange={(e) => update(i, { inspectionType: e.target.value })}>
              {Object.entries(ITP_CLASSIFICATION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{v} — {l}</option>
              ))}
            </Select>
            <Input value={item.acceptanceCriteria} onChange={(e) => update(i, { acceptanceCriteria: e.target.value })} placeholder="Acceptance criteria" />
            {items.length > 1 && (
              <button type="button" onClick={() => removeItem(i)} className="text-text-muted hover:text-danger">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <Button type="button" variant="secondary" size="sm" onClick={addItem} className="self-start">
          <Plus size={13} />
          Add Activity
        </Button>
      </div>

      <div className="px-4 py-3">
        <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
          {submitting ? "Creating…" : "Create ITP"}
        </Button>
      </div>
    </div>
  );
}
