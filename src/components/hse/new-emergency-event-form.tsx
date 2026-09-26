"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { AlertCircle } from "@/components/ui/icons";
import { SEVERITY_OPTIONS } from "@/lib/hse/risk-matrix";
import { EMERGENCY_TYPES } from "@/lib/hse/emergency";

const textareaClass =
  "w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent";

export function NewEmergencyEventForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [emergencyType, setEmergencyType] = useState<string>(EMERGENCY_TYPES[0]);
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");
  const [description, setDescription] = useState("");
  const [immediateActions, setImmediateActions] = useState("");
  const [peopleAffected, setPeopleAffected] = useState("");
  const [emergencyServicesContacted, setEmergencyServicesContacted] = useState(false);
  const [evacuationRequired, setEvacuationRequired] = useState(false);
  const [assemblyPoint, setAssemblyPoint] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!location.trim() || !description.trim()) {
      setError("Location and description are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/hse/emergency/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        emergencyType,
        occurredAt: new Date(occurredAt).toISOString(),
        location,
        severity,
        description,
        immediateActions: immediateActions || undefined,
        peopleAffected: peopleAffected || undefined,
        emergencyServicesContacted,
        evacuationRequired,
        assemblyPoint: assemblyPoint || undefined,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to report the emergency event.");
      return;
    }
    router.push(`/hse/emergency/events/${body.id}`);
  }

  return (
    <div className="flex flex-col rounded-[3px] border border-border bg-white">
      {error && (
        <div className="m-4 mb-0 flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <SectionHeader>Event Details</SectionHeader>
      <div className="flex flex-col gap-3 px-4 py-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Emergency Type
            <Select value={emergencyType} onChange={(e) => setEmergencyType(e.target.value)}>
              {EMERGENCY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Date &amp; Time
            <Input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Location *
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Severity
            <Select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              {SEVERITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </label>
        </div>
      </div>

      <SectionHeader>Description</SectionHeader>
      <div className="flex flex-col gap-3 px-4 py-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          What happened? *
          <textarea rows={4} className={textareaClass} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Immediate Actions Taken
          <textarea rows={3} className={textareaClass} value={immediateActions} onChange={(e) => setImmediateActions(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          People Affected
          <Input value={peopleAffected} onChange={(e) => setPeopleAffected(e.target.value)} placeholder="Names / number of people affected" />
        </label>
      </div>

      <SectionHeader>Response</SectionHeader>
      <div className="flex flex-col gap-3 px-4 py-3">
        <label className="flex items-center gap-2 text-[13px] text-text-primary">
          <input type="checkbox" checked={emergencyServicesContacted} onChange={(e) => setEmergencyServicesContacted(e.target.checked)} />
          Emergency Services Contacted
        </label>
        <label className="flex items-center gap-2 text-[13px] text-text-primary">
          <input type="checkbox" checked={evacuationRequired} onChange={(e) => setEvacuationRequired(e.target.checked)} />
          Evacuation Required
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Assembly Point
          <Input value={assemblyPoint} onChange={(e) => setAssemblyPoint(e.target.value)} />
        </label>
      </div>

      <div className="px-4 py-3">
        <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
          {submitting ? "Reporting…" : "Report Emergency Event"}
        </Button>
      </div>
    </div>
  );
}
