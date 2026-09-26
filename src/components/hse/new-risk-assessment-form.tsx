"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { AlertCircle } from "@/components/ui/icons";
import { LIKELIHOOD_OPTIONS, SEVERITY_OPTIONS } from "@/lib/hse/risk-matrix";

const textareaClass =
  "w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent";

export function NewRiskAssessmentForm({
  projectId,
  members,
}: {
  projectId: string;
  members: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [activity, setActivity] = useState("");
  const [task, setTask] = useState("");
  const [hazard, setHazard] = useState("");
  const [potentialConsequence, setPotentialConsequence] = useState("");
  const [likelihood, setLikelihood] = useState("POSSIBLE");
  const [severity, setSeverity] = useState("LOW");
  const [responsibleId, setResponsibleId] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!activity.trim() || !hazard.trim()) {
      setError("Activity and Hazard are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/hse/risk-assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        activity,
        task: task || undefined,
        hazard,
        potentialConsequence: potentialConsequence || undefined,
        initialLikelihood: likelihood,
        initialSeverity: severity,
        responsibleId: responsibleId || undefined,
        reviewDate: reviewDate || undefined,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to create the risk assessment.");
      return;
    }
    router.push(`/hse/risk-assessments/${body.id}`);
  }

  return (
    <div className="flex flex-col rounded-[3px] border border-border bg-white">
      {error && (
        <div className="m-4 mb-0 flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <SectionHeader>Activity</SectionHeader>
      <div className="flex flex-col gap-3 px-4 py-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Activity *
          <Input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="e.g. Working at Height on Facade" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Task
          <Input value={task} onChange={(e) => setTask(e.target.value)} placeholder="Optional specific task" />
        </label>
      </div>

      <SectionHeader>Hazard</SectionHeader>
      <div className="flex flex-col gap-3 px-4 py-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Hazard *
          <textarea rows={2} className={textareaClass} value={hazard} onChange={(e) => setHazard(e.target.value)} placeholder="Describe the hazard" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Potential Consequence
          <textarea rows={2} className={textareaClass} value={potentialConsequence} onChange={(e) => setPotentialConsequence(e.target.value)} />
        </label>
      </div>

      <SectionHeader>Risk Rating</SectionHeader>
      <div className="grid grid-cols-2 gap-3 px-4 py-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Likelihood
          <Select value={likelihood} onChange={(e) => setLikelihood(e.target.value)}>
            {LIKELIHOOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
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

      <SectionHeader>Assignment</SectionHeader>
      <div className="grid grid-cols-2 gap-3 px-4 py-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Responsible Person
          <Select value={responsibleId} onChange={(e) => setResponsibleId(e.target.value)}>
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Review Date
          <Input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
        </label>
      </div>

      <div className="px-4 py-3">
        <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
          {submitting ? "Creating…" : "Create Risk Assessment"}
        </Button>
      </div>
    </div>
  );
}
