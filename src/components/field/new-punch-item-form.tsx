"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "@/components/ui/icons";
import { PRIORITY_LABELS } from "@/lib/field/status";
import { FieldAreaPicker, type FieldAreaOption } from "@/components/field/field-area-picker";
import type { FieldPriority } from "@prisma/client";

export function NewPunchItemForm({
  projectId,
  punchlists,
  defaultPunchlistId,
  areaTree,
  existingTrades,
  members,
  siteWalkId,
  defaultAreaId,
}: {
  projectId: string;
  punchlists: { id: string; title: string }[];
  defaultPunchlistId?: string;
  areaTree: FieldAreaOption[];
  existingTrades: string[];
  members: { id: string; name: string }[];
  siteWalkId?: string;
  defaultAreaId?: string;
}) {
  const router = useRouter();
  const [punchlistId, setPunchlistId] = useState(defaultPunchlistId ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [areaId, setAreaId] = useState(defaultAreaId ?? "");
  const [tradeName, setTradeName] = useState("");
  const [priority, setPriority] = useState<FieldPriority>("MEDIUM");
  const [responsibleUserId, setResponsibleUserId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/field/punch-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        punchlistId: punchlistId || undefined,
        title,
        description,
        areaId: areaId || undefined,
        siteWalkId: siteWalkId || undefined,
        tradeName: tradeName || undefined,
        priority,
        responsibleUserId: responsibleUserId || undefined,
        dueDate: dueDate || undefined,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to create the punch item.");
      return;
    }
    router.push(`/field/punch/${body.id}`);
  }

  return (
    <div className="flex flex-col gap-3 rounded-[3px] border border-border bg-white p-4">
      {siteWalkId && (
        <p className="rounded-[3px] border border-brand-200 bg-brand-50 px-3 py-2 text-[12px] text-brand-800">
          Capturing for the active site walk.
        </p>
      )}
      {error && (
        <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Punchlist
        <Select value={punchlistId} onChange={(e) => setPunchlistId(e.target.value)}>
          <option value="">None (standalone)</option>
          {punchlists.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
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
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Trade / Category
          <Input value={tradeName} onChange={(e) => setTradeName(e.target.value)} list="punch-trade-options" />
          <datalist id="punch-trade-options">
            {existingTrades.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Priority
          <Select value={priority} onChange={(e) => setPriority(e.target.value as FieldPriority)}>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Location
        <FieldAreaPicker tree={areaTree} value={areaId} onChange={setAreaId} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Responsible Person
          <Select value={responsibleUserId} onChange={(e) => setResponsibleUserId(e.target.value)}>
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
        {submitting ? "Creating…" : "Create Punch Item"}
      </Button>
    </div>
  );
}
