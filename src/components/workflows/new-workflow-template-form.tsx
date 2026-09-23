"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SectionHeader } from "@/components/ui/section-header";
import { RecipientPicker, type DirectoryPerson } from "@/components/mail/recipient-picker";
import { AlertCircle, Plus, X } from "@/components/ui/icons";

type CompletionRule = "ALL_REVIEWERS" | "ANY_REVIEWER" | "REJECT_ON_ANY_REJECTION";
type OutcomeRule = "FINAL_STEP_OUTCOME" | "LOWEST_OF_ALL_STEP_OUTCOMES";

type StepDraft = {
  name: string;
  groupNo: number;
  durationDays: number;
  completionRule: CompletionRule;
  commentsRequired: boolean;
  reviewers: DirectoryPerson[];
};

function newStep(groupNo: number): StepDraft {
  return { name: "", groupNo, durationDays: 5, completionRule: "ALL_REVIEWERS", commentsRequired: false, reviewers: [] };
}

export function NewWorkflowTemplateForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [outcomeRule, setOutcomeRule] = useState<OutcomeRule>("FINAL_STEP_OUTCOME");
  const [steps, setSteps] = useState<StepDraft[]>([newStep(1)]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateStep(index: number, patch: Partial<StepDraft>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSerialStep() {
    const maxGroup = Math.max(...steps.map((s) => s.groupNo), 0);
    setSteps((prev) => [...prev, newStep(maxGroup + 1)]);
  }

  function addParallelStep(index: number) {
    const groupNo = steps[index].groupNo;
    setSteps((prev) => [...prev.slice(0, index + 1), newStep(groupNo), ...prev.slice(index + 1)]);
  }

  async function submit() {
    if (!name.trim()) {
      setError("Template name is required.");
      return;
    }
    if (steps.some((s) => !s.name.trim())) {
      setError("Every step needs a name.");
      return;
    }
    if (steps.some((s) => s.reviewers.length === 0)) {
      setError("Every step needs at least one reviewer.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/workflow-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        name,
        description: description.trim() || undefined,
        outcomeRule,
        steps: steps.map((s) => ({
          name: s.name,
          groupNo: s.groupNo,
          durationDays: s.durationDays,
          completionRule: s.completionRule,
          commentsRequired: s.commentsRequired,
          reviewerUserIds: s.reviewers.map((r) => r.userId),
        })),
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to create the template.");
      return;
    }
    router.push("/workflows/templates");
  }

  const groupNos = Array.from(new Set(steps.map((s) => s.groupNo))).sort((a, b) => a - b);

  return (
    <div className="rounded-[3px] border border-border bg-white">
      <SectionHeader>Template</SectionHeader>
      <div className="flex flex-col gap-3 p-4">
        {error && (
          <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Template Name *
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Shop Drawing Review" />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </label>

        <label className="flex max-w-sm flex-col gap-1 text-xs font-medium text-text-secondary">
          Final Outcome Rule
          <Select value={outcomeRule} onChange={(e) => setOutcomeRule(e.target.value as OutcomeRule)}>
            <option value="FINAL_STEP_OUTCOME">Final Step Outcome — last group&apos;s outcome wins</option>
            <option value="LOWEST_OF_ALL_STEP_OUTCOMES">Lowest of All Step Outcomes — worst outcome from any step wins</option>
          </Select>
        </label>
      </div>

      <SectionHeader>Review Sequence</SectionHeader>
      <div className="flex flex-col gap-4 p-4">
        {groupNos.map((groupNo, gi) => {
          const groupSteps = steps.filter((s) => s.groupNo === groupNo);
          return (
            <div key={groupNo} className="rounded-[3px] border border-border bg-background p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Group {gi + 1}
                {groupSteps.length > 1 ? " (Parallel)" : ""}
              </p>
              <div className="flex flex-col gap-3">
                {groupSteps.map((step) => {
                  const index = steps.indexOf(step);
                  return (
                    <div key={index} className="rounded-[3px] border border-border bg-white p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-muted">Step</span>
                        {steps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSteps((prev) => prev.filter((_, i) => i !== index))}
                            className="flex items-center gap-1 text-xs text-danger hover:underline"
                          >
                            <X size={12} />
                            Remove
                          </button>
                        )}
                      </div>
                      <Input
                        value={step.name}
                        onChange={(e) => updateStep(index, { name: e.target.value })}
                        placeholder="Step name, e.g. Technical Review"
                        className="mb-2"
                      />
                      <div className="mb-2 flex gap-3">
                        <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-text-secondary">
                          Duration (days)
                          <Input
                            type="number"
                            min={1}
                            value={step.durationDays}
                            onChange={(e) => updateStep(index, { durationDays: Number(e.target.value) || 1 })}
                          />
                        </label>
                        <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-text-secondary">
                          Completion Rule
                          <Select
                            value={step.completionRule}
                            onChange={(e) => updateStep(index, { completionRule: e.target.value as CompletionRule })}
                          >
                            <option value="ALL_REVIEWERS">All Reviewers Must Respond</option>
                            <option value="ANY_REVIEWER">Any One Reviewer</option>
                            <option value="REJECT_ON_ANY_REJECTION">All Respond, Reject on Any Rejection</option>
                          </Select>
                        </label>
                      </div>
                      <label className="mb-2 flex items-center gap-2 text-xs font-medium text-text-secondary">
                        <input
                          type="checkbox"
                          checked={step.commentsRequired}
                          onChange={(e) => updateStep(index, { commentsRequired: e.target.checked })}
                        />
                        Comments required from reviewers
                      </label>
                      <RecipientPicker
                        label="Reviewers"
                        projectId={projectId}
                        selected={step.reviewers}
                        onChange={(people) => updateStep(index, { reviewers: people })}
                        multiple
                        testId={`step-${index}-reviewers`}
                      />
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => addParallelStep(steps.indexOf(groupSteps[groupSteps.length - 1]))}
                className="mt-2 flex w-fit items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
              >
                <Plus size={12} />
                Add parallel step to this group
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={addSerialStep}
          className="flex w-fit items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
        >
          <Plus size={12} />
          Add next step (serial)
        </button>
      </div>

      <div className="flex justify-end gap-2 border-t border-border p-4">
        <Button type="button" variant="secondary" onClick={() => router.push("/workflows/templates")} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
          {submitting ? "Creating..." : "Create Template"}
        </Button>
      </div>
    </div>
  );
}
