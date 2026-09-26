"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { AlertCircle } from "@/components/ui/icons";
import { DRILL_TYPES } from "@/lib/hse/emergency";

const textareaClass =
  "w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent";

export function NewEmergencyDrillForm({
  projectId,
  members,
}: {
  projectId: string;
  members: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [drillType, setDrillType] = useState<string>(DRILL_TYPES[0]);
  const [scheduledAt, setScheduledAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [location, setLocation] = useState("");
  const [scenario, setScenario] = useState("");
  const [coordinatorId, setCoordinatorId] = useState(members[0]?.id ?? "");
  const [expectedParticipants, setExpectedParticipants] = useState("");
  const [assemblyPoint, setAssemblyPoint] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!location.trim() || !coordinatorId) {
      setError("Location and coordinator are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/hse/emergency/drills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        drillType,
        scheduledAt: new Date(scheduledAt).toISOString(),
        location,
        scenario: scenario || undefined,
        coordinatorId,
        expectedParticipants: expectedParticipants ? Number(expectedParticipants) : undefined,
        assemblyPoint: assemblyPoint || undefined,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to schedule the drill.");
      return;
    }
    router.push(`/hse/emergency/drills/${body.id}`);
  }

  return (
    <div className="flex flex-col rounded-[3px] border border-border bg-white">
      {error && (
        <div className="m-4 mb-0 flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <SectionHeader>Drill Details</SectionHeader>
      <div className="flex flex-col gap-3 px-4 py-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Drill Type
            <Select value={drillType} onChange={(e) => setDrillType(e.target.value)}>
              {DRILL_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Scheduled Date &amp; Time
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Location *
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Assembly Point
            <Input value={assemblyPoint} onChange={(e) => setAssemblyPoint(e.target.value)} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Scenario
          <textarea rows={2} className={textareaClass} value={scenario} onChange={(e) => setScenario(e.target.value)} />
        </label>
      </div>

      <SectionHeader>Coordination</SectionHeader>
      <div className="grid grid-cols-2 gap-3 px-4 py-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Coordinator *
          <Select value={coordinatorId} onChange={(e) => setCoordinatorId(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Expected Participants
          <Input type="number" min={0} value={expectedParticipants} onChange={(e) => setExpectedParticipants(e.target.value)} />
        </label>
      </div>

      <div className="px-4 py-3">
        <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
          {submitting ? "Scheduling…" : "Schedule Drill"}
        </Button>
      </div>
    </div>
  );
}
