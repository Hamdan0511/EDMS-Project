"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "@/components/ui/icons";

export type InspectionQuestionItem = {
  id: string;
  section: string | null;
  text: string;
  type: "YES_NO" | "PASS_FAIL" | "TEXT" | "NUMERIC" | "PHOTO";
  required: boolean;
  answer: string;
  comment: string;
};

const textareaClass =
  "w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent";

export function InspectionExecutionForm({
  inspectionId,
  questions,
}: {
  inspectionId: string;
  questions: InspectionQuestionItem[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, { answer: string; comment: string }>>(
    Object.fromEntries(questions.map((q) => [q.id, { answer: q.answer, comment: q.comment }])),
  );
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sections = Array.from(new Set(questions.map((q) => q.section ?? "General")));

  function setAnswer(id: string, answer: string) {
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], answer } }));
  }
  function setComment(id: string, comment: string) {
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], comment } }));
  }

  async function saveResponses() {
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/hse/inspections/${inspectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        responses: Object.entries(answers).map(([questionId, v]) => ({ questionId, answer: v.answer, comment: v.comment })),
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to save responses.");
      return;
    }
    router.refresh();
  }

  async function completeInspection() {
    setError(null);
    setCompleting(true);
    await saveResponses();
    const res = await fetch(`/api/hse/inspections/${inspectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" }),
    });
    const body = await res.json().catch(() => ({}));
    setCompleting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to complete the inspection.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {sections.map((section) => (
        <div key={section} className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{section}</p>
          {questions
            .filter((q) => (q.section ?? "General") === section)
            .map((q) => (
              <div key={q.id} className="rounded-[3px] border border-border bg-white p-3">
                <p className="mb-2 text-[13px] text-text-primary">
                  {q.text}
                  {q.required && <span className="text-danger"> *</span>}
                </p>
                {q.type === "YES_NO" && (
                  <Select value={answers[q.id]?.answer ?? ""} onChange={(e) => setAnswer(q.id, e.target.value)} className="w-40">
                    <option value="">— Select —</option>
                    <option value="YES">Yes</option>
                    <option value="NO">No</option>
                  </Select>
                )}
                {q.type === "PASS_FAIL" && (
                  <Select value={answers[q.id]?.answer ?? ""} onChange={(e) => setAnswer(q.id, e.target.value)} className="w-40">
                    <option value="">— Select —</option>
                    <option value="PASS">Pass</option>
                    <option value="FAIL">Fail</option>
                  </Select>
                )}
                {q.type === "NUMERIC" && (
                  <Input type="number" value={answers[q.id]?.answer ?? ""} onChange={(e) => setAnswer(q.id, e.target.value)} className="w-40" />
                )}
                {(q.type === "TEXT" || q.type === "PHOTO") && (
                  <textarea
                    rows={2}
                    className={textareaClass}
                    value={answers[q.id]?.answer ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder={q.type === "PHOTO" ? "Describe the evidence (attach photos below)" : "Enter details"}
                  />
                )}
                {q.type !== "TEXT" && (
                  <Input
                    className="mt-2"
                    placeholder="Comment (optional)"
                    value={answers[q.id]?.comment ?? ""}
                    onChange={(e) => setComment(q.id, e.target.value)}
                  />
                )}
              </div>
            ))}
        </div>
      ))}

      <div className="flex gap-2 border-t border-border pt-3">
        <Button type="button" variant="secondary" onClick={saveResponses} disabled={saving || completing}>
          {saving ? "Saving…" : "Save Progress"}
        </Button>
        <Button type="button" variant="primary" onClick={completeInspection} disabled={saving || completing}>
          {completing ? "Completing…" : "Complete Inspection"}
        </Button>
      </div>
    </div>
  );
}
