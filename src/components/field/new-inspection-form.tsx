"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "@/components/ui/icons";
import { FieldAreaPicker, type FieldAreaOption } from "@/components/field/field-area-picker";

export function NewInspectionForm({
  projectId,
  templates,
  areaTree,
  members,
}: {
  projectId: string;
  templates: { id: string; name: string }[];
  areaTree: FieldAreaOption[];
  members: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [areaId, setAreaId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [inspectorId, setInspectorId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!templateId) {
      setError("A template is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/field/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        templateId,
        areaId: areaId || undefined,
        assigneeId: assigneeId || undefined,
        inspectorId: inspectorId || undefined,
        dueDate: dueDate || undefined,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to create the inspection.");
      return;
    }
    router.push(`/field/inspections/${body.id}`);
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
        Template *
        <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Location
        <FieldAreaPicker tree={areaTree} value={areaId} onChange={setAreaId} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Assignee
          <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">Not assigned yet</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Inspector
          <Select value={inspectorId} onChange={(e) => setInspectorId(e.target.value)}>
            <option value="">Not set</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Due Date
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </label>
      <Button type="button" variant="primary" onClick={submit} disabled={submitting} className="self-start">
        {submitting ? "Creating…" : "Create Inspection"}
      </Button>
    </div>
  );
}
