"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { AlertCircle, Plus, Trash2 } from "@/components/ui/icons";

type ItemDraft = { label: string; responseType: string; isMandatory: boolean };
type GroupDraft = { name: string; items: ItemDraft[] };

const RESPONSE_TYPES = [
  { value: "PASS_FAIL", label: "Pass / Fail" },
  { value: "YES_NO", label: "Yes / No" },
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Number" },
  { value: "DATE", label: "Date" },
];

export function NewInspectionTemplateForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groups, setGroups] = useState<GroupDraft[]>([
    { name: "General", items: [{ label: "", responseType: "PASS_FAIL", isMandatory: true }] },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateGroup(gi: number, patch: Partial<GroupDraft>) {
    setGroups((prev) => prev.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  }
  function updateItem(gi: number, ii: number, patch: Partial<ItemDraft>) {
    setGroups((prev) => prev.map((g, i) => (i !== gi ? g : { ...g, items: g.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) })));
  }
  function addGroup() {
    setGroups((prev) => [...prev, { name: "", items: [{ label: "", responseType: "PASS_FAIL", isMandatory: true }] }]);
  }
  function removeGroup(gi: number) {
    setGroups((prev) => prev.filter((_, i) => i !== gi));
  }
  function addItem(gi: number) {
    setGroups((prev) => prev.map((g, i) => (i !== gi ? g : { ...g, items: [...g.items, { label: "", responseType: "PASS_FAIL", isMandatory: true }] })));
  }
  function removeItem(gi: number, ii: number) {
    setGroups((prev) => prev.map((g, i) => (i !== gi ? g : { ...g, items: g.items.filter((_, j) => j !== ii) })));
  }

  async function submit() {
    if (!name.trim()) {
      setError("Template name is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/field/inspection-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, name, description: description || undefined, groups }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to create the template.");
      return;
    }
    router.push(`/field/inspections/templates/${body.id}`);
  }

  return (
    <div className="flex flex-col rounded-[3px] border border-border bg-white">
      {error && (
        <div className="m-4 mb-0 flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <SectionHeader>Template Details</SectionHeader>
      <div className="flex flex-col gap-3 px-4 py-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Name *
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Door Installation Inspection" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Description
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
      </div>

      <SectionHeader>Checklist</SectionHeader>
      <div className="flex flex-col gap-4 px-4 py-3">
        {groups.map((group, gi) => (
          <div key={gi} className="rounded-[3px] border border-border bg-background p-3">
            <div className="mb-2 flex items-center gap-2">
              <Input
                value={group.name}
                onChange={(e) => updateGroup(gi, { name: e.target.value })}
                placeholder="Group name, e.g. Frame"
                className="flex-1"
              />
              {groups.length > 1 && (
                <button type="button" onClick={() => removeGroup(gi)} className="text-text-muted hover:text-danger">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {group.items.map((item, ii) => (
                <div key={ii} className="grid grid-cols-[1fr_140px_100px_28px] items-center gap-2">
                  <Input
                    value={item.label}
                    onChange={(e) => updateItem(gi, ii, { label: e.target.value })}
                    placeholder={`Item ${ii + 1}, e.g. Frame alignment`}
                  />
                  <Select value={item.responseType} onChange={(e) => updateItem(gi, ii, { responseType: e.target.value })}>
                    {RESPONSE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </Select>
                  <label className="flex items-center gap-1 text-[11px] text-text-secondary">
                    <input type="checkbox" checked={item.isMandatory} onChange={(e) => updateItem(gi, ii, { isMandatory: e.target.checked })} />
                    Mandatory
                  </label>
                  {group.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(gi, ii)} className="text-text-muted hover:text-danger">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => addItem(gi)} className="mt-2">
              <Plus size={12} />
              Add Item
            </Button>
          </div>
        ))}
        <Button type="button" variant="secondary" size="sm" onClick={addGroup} className="self-start">
          <Plus size={13} />
          Add Group
        </Button>
      </div>

      <div className="px-4 py-3">
        <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
          {submitting ? "Creating…" : "Create Template"}
        </Button>
      </div>
    </div>
  );
}
