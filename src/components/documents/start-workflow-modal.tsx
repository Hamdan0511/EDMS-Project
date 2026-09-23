"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AlertCircle } from "@/components/ui/icons";

type TemplateStep = {
  id: string;
  name: string;
  groupNo: number;
  reviewers: { userId: string; name: string }[];
};

type Template = {
  id: string;
  name: string;
  description: string | null;
  steps: TemplateStep[];
};

/** Template-based workflow start: the actual review sequence (serial and/or
 * parallel steps, reviewers, completion rules) is fixed on the chosen
 * WorkflowTemplate — this modal only picks which template and which
 * documents, matching how Aconex-style workflow templates are reused. */
export function StartWorkflowModal({
  projectId,
  documentIds,
  open,
  onClose,
}: {
  projectId: string;
  documentIds: string[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch(`/api/workflow-templates?projectId=${projectId}&status=ACTIVE`)
      .then((res) => res.json())
      .then((data: Template[]) => {
        setTemplates(data);
        setTemplateId(data[0]?.id ?? "");
      })
      .catch(() => setError("Failed to load workflow templates."))
      .finally(() => setLoading(false));
  }, [open, projectId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function close() {
    if (submitting) return;
    onClose();
    setTitle("");
    setTemplateId("");
    setError(null);
  }

  async function submit() {
    if (!templateId) {
      setError("Choose a workflow template.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        templateId,
        documentIds,
        title: title.trim() || undefined,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to start the workflow.");
      return;
    }
    close();
    router.push(`/workflows/${body.id}`);
  }

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null;
  const stepsByGroup = selectedTemplate
    ? Array.from(new Set(selectedTemplate.steps.map((s) => s.groupNo)))
        .sort((a, b) => a - b)
        .map((groupNo) => selectedTemplate.steps.filter((s) => s.groupNo === groupNo))
    : [];

  return (
    <Modal open={open} onClose={close} title="Start a Workflow" width="max-w-lg">
      <div className="flex flex-col gap-3">
        <p className="text-xs text-text-secondary">
          Starting a review workflow for <span className="font-medium text-text-primary">{documentIds.length}</span>{" "}
          selected document(s).
        </p>

        {error && (
          <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <p className="text-[13px] text-text-muted">Loading workflow templates...</p>
        ) : templates.length === 0 ? (
          <p className="text-[13px] text-text-muted">
            No active workflow templates exist yet. Create one under Workflows &rarr; Templates first.
          </p>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Workflow Template *
              <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </label>

            {selectedTemplate?.description && (
              <p className="text-xs text-text-muted">{selectedTemplate.description}</p>
            )}

            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Workflow Title
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={selectedTemplate?.name ?? "e.g. Shop Drawing Review — Batch 4"}
              />
            </label>

            {stepsByGroup.length > 0 && (
              <div className="rounded-[3px] border border-border bg-background p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Review Sequence</p>
                <div className="flex flex-col gap-2">
                  {stepsByGroup.map((group, i) => (
                    <div key={group[0].groupNo} className="text-[13px]">
                      <span className="font-medium text-text-primary">Group {i + 1}: </span>
                      {group.map((s) => `${s.name} (${s.reviewers.map((r) => r.name).join(", ")})`).join("  •  ")}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={submit} disabled={submitting || templates.length === 0}>
            {submitting ? "Starting..." : "Start Workflow"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
