"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { AlertCircle } from "@/components/ui/icons";
import { EMERGENCY_TYPES } from "@/lib/hse/emergency";

const textareaClass =
  "w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent";

export function NewEmergencyProcedureForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [emergencyType, setEmergencyType] = useState<string>(EMERGENCY_TYPES[0]);
  const [immediateActions, setImmediateActions] = useState("");
  const [evacuationInstructions, setEvacuationInstructions] = useState("");
  const [assemblyPoint, setAssemblyPoint] = useState("");
  const [requiredEquipment, setRequiredEquipment] = useState("");
  const [steps, setSteps] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim() || !immediateActions.trim()) {
      setError("Title and immediate actions are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/hse/emergency/procedures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        title,
        emergencyType,
        immediateActions,
        evacuationInstructions: evacuationInstructions || undefined,
        assemblyPoint: assemblyPoint || undefined,
        requiredEquipment: requiredEquipment || undefined,
        steps: steps || undefined,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to create the procedure.");
      return;
    }
    router.push(`/hse/emergency/procedures/${body.id}`);
  }

  return (
    <div className="flex flex-col rounded-[3px] border border-border bg-white">
      {error && (
        <div className="m-4 mb-0 flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <SectionHeader>Procedure Details</SectionHeader>
      <div className="flex flex-col gap-3 px-4 py-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Title *
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fire Emergency Procedure" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Emergency Type
            <Select value={emergencyType} onChange={(e) => setEmergencyType(e.target.value)}>
              {EMERGENCY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </label>
        </div>
      </div>

      <SectionHeader>Immediate Actions</SectionHeader>
      <div className="px-4 py-3">
        <textarea rows={4} className={textareaClass} value={immediateActions} onChange={(e) => setImmediateActions(e.target.value)} placeholder="What must happen immediately?" />
      </div>

      <SectionHeader>Evacuation</SectionHeader>
      <div className="flex flex-col gap-3 px-4 py-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Evacuation Instructions
          <textarea rows={3} className={textareaClass} value={evacuationInstructions} onChange={(e) => setEvacuationInstructions(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Assembly Point
          <Input value={assemblyPoint} onChange={(e) => setAssemblyPoint(e.target.value)} />
        </label>
      </div>

      <SectionHeader>Required Equipment &amp; Steps</SectionHeader>
      <div className="flex flex-col gap-3 px-4 py-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Required Equipment
          <Input value={requiredEquipment} onChange={(e) => setRequiredEquipment(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Procedure Steps
          <textarea rows={5} className={textareaClass} value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="Numbered/ordered steps" />
        </label>
      </div>

      <div className="px-4 py-3">
        <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
          {submitting ? "Creating…" : "Create Procedure"}
        </Button>
      </div>
    </div>
  );
}
