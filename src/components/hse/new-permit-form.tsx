"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { AlertCircle } from "@/components/ui/icons";
import { PERMIT_TYPE_LABELS } from "@/lib/hse/status";

const textareaClass =
  "w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent";

export function NewPermitForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [type, setType] = useState("HOT_WORK");
  const [location, setLocation] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [contractorOrg, setContractorOrg] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hazards, setHazards] = useState("");
  const [controls, setControls] = useState("");
  const [requiredPpe, setRequiredPpe] = useState("");
  const [precautions, setPrecautions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!location.trim() || !workDescription.trim()) {
      setError("Location and work description are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/hse/permits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        type,
        location,
        workDescription,
        contractorOrg: contractorOrg || undefined,
        startDate,
        endDate,
        hazards: hazards || undefined,
        controls: controls || undefined,
        requiredPpe: requiredPpe || undefined,
        precautions: precautions || undefined,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to create the permit.");
      return;
    }
    router.push(`/hse/permits/${body.id}`);
  }

  return (
    <div className="flex flex-col rounded-[3px] border border-border bg-white">
      {error && (
        <div className="m-4 mb-0 flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <SectionHeader>Permit Details</SectionHeader>
      <div className="flex flex-col gap-3 px-4 py-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Permit Type
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(PERMIT_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Contractor / Organization
            <Input value={contractorOrg} onChange={(e) => setContractorOrg(e.target.value)} />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Location *
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Level 03, Riser Room" />
        </label>
      </div>

      <SectionHeader>Work Description</SectionHeader>
      <div className="flex flex-col gap-3 px-4 py-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Work Description *
          <textarea rows={3} className={textareaClass} value={workDescription} onChange={(e) => setWorkDescription(e.target.value)} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Start Date
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            End Date
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
      </div>

      <SectionHeader>Hazards &amp; Controls</SectionHeader>
      <div className="flex flex-col gap-3 px-4 py-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Hazards
          <textarea rows={2} className={textareaClass} value={hazards} onChange={(e) => setHazards(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Controls
          <textarea rows={2} className={textareaClass} value={controls} onChange={(e) => setControls(e.target.value)} />
        </label>
      </div>

      <SectionHeader>PPE &amp; Precautions</SectionHeader>
      <div className="flex flex-col gap-3 px-4 py-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Required PPE
          <Input value={requiredPpe} onChange={(e) => setRequiredPpe(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Precautions
          <textarea rows={2} className={textareaClass} value={precautions} onChange={(e) => setPrecautions(e.target.value)} />
        </label>
      </div>

      <div className="px-4 py-3">
        <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
          {submitting ? "Creating…" : "Create Permit"}
        </Button>
      </div>
    </div>
  );
}
