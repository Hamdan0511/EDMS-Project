"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { AlertCircle } from "@/components/ui/icons";

export function NewInspectionForm({
  projectId,
  templates,
  members,
  currentUserId,
}: {
  projectId: string;
  templates: { id: string; name: string }[];
  members: { id: string; name: string }[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [location, setLocation] = useState("");
  const [inspectorId, setInspectorId] = useState(currentUserId);
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!templateId || !location.trim()) {
      setError("Template and location are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/hse/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, templateId, location, inspectorId, scheduledAt: scheduledAt || undefined }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to schedule the inspection.");
      return;
    }
    router.push(`/hse/inspections/${body.id}`);
  }

  return (
    <div className="flex flex-col rounded-[3px] border border-border bg-white">
      {error && (
        <div className="m-4 mb-0 flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <SectionHeader>Inspection Details</SectionHeader>
      <div className="flex flex-col gap-3 px-4 py-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Template *
          <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Location *
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Level 04, Block B" />
        </label>
      </div>

      <SectionHeader>Schedule</SectionHeader>
      <div className="grid grid-cols-2 gap-3 px-4 py-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Inspector
          <Select value={inspectorId} onChange={(e) => setInspectorId(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Scheduled Date
          <Input type="date" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </label>
      </div>

      <div className="px-4 py-3">
        <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
          {submitting ? "Scheduling…" : "Schedule Inspection"}
        </Button>
      </div>
    </div>
  );
}
