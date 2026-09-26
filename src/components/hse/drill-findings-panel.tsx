"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertCircle, ClipboardX } from "@/components/ui/icons";
import { SEVERITY_LABELS, SEVERITY_BADGE_CLASSES, ACTION_STATUS_LABELS, ACTION_STATUS_BADGE_CLASSES, ACTION_PRIORITY_LABELS } from "@/lib/hse/status";
import type { HseSeverity, HseCorrectiveActionStatus, HseActionPriority } from "@prisma/client";

export type DrillFindingRow = {
  id: string;
  issue: string;
  severity: HseSeverity;
  finding: string;
  correctiveAction: { id: string; actionNumber: string; status: HseCorrectiveActionStatus } | null;
};

const textareaClass =
  "w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent";

export function DrillFindingsPanel({
  drillId,
  findings,
  members,
  canManage,
}: {
  drillId: string;
  findings: DrillFindingRow[];
  members: { id: string; name: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [issue, setIssue] = useState("");
  const [severity, setSeverity] = useState<HseSeverity>("MEDIUM");
  const [finding, setFinding] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [raiseTarget, setRaiseTarget] = useState<DrillFindingRow | null>(null);
  const [assignedToId, setAssignedToId] = useState("");
  const [priority, setPriority] = useState<HseActionPriority>("HIGH");
  const [dueDate, setDueDate] = useState("");
  const [raising, setRaising] = useState(false);
  const [raiseError, setRaiseError] = useState<string | null>(null);

  async function addFinding() {
    if (!issue.trim() || !finding.trim()) {
      setError("Issue and finding are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/hse/emergency/drills/${drillId}/findings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue, severity, finding }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to add the finding.");
      return;
    }
    setIssue("");
    setFinding("");
    setAddOpen(false);
    router.refresh();
  }

  function openRaise(row: DrillFindingRow) {
    setRaiseTarget(row);
    setAssignedToId("");
    setPriority("HIGH");
    setDueDate("");
    setRaiseError(null);
  }

  async function submitRaise() {
    if (!raiseTarget) return;
    setRaising(true);
    setRaiseError(null);
    const res = await fetch(`/api/hse/emergency/findings/${raiseTarget.id}/raise-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignedToId: assignedToId || undefined,
        priority,
        dueDate: dueDate || undefined,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setRaising(false);
    if (!res.ok) {
      setRaiseError(body.error ?? "Failed to raise the corrective action.");
      return;
    }
    setRaiseTarget(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col">
      {canManage && (
        <div className="flex justify-end px-4 pt-3">
          <Button type="button" variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
            Add Finding
          </Button>
        </div>
      )}

      {findings.length === 0 ? (
        <div className="px-4 py-3">
          <EmptyState
            icon={<ClipboardX size={22} strokeWidth={1.25} />}
            title="No findings recorded for this drill"
            description="Findings identified during the drill (e.g. unclear signage) can be recorded here and turned into corrective actions."
            className="border-none bg-transparent py-6"
          />
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border px-4 py-2">
          {findings.map((f) => (
            <div key={f.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <StatusBadge label={SEVERITY_LABELS[f.severity]} className={SEVERITY_BADGE_CLASSES[f.severity]} />
                  <span className="text-[13px] font-medium text-text-primary">{f.issue}</span>
                </div>
                <p className="text-[12px] text-text-secondary">{f.finding}</p>
                {f.correctiveAction && (
                  <Link href={`/hse/corrective-actions/${f.correctiveAction.id}`} className="flex items-center gap-2 text-[12px] text-brand-700 hover:underline">
                    {f.correctiveAction.actionNumber}
                    <StatusBadge label={ACTION_STATUS_LABELS[f.correctiveAction.status]} className={ACTION_STATUS_BADGE_CLASSES[f.correctiveAction.status]} />
                  </Link>
                )}
              </div>
              {canManage && !f.correctiveAction && (
                <Button type="button" variant="secondary" size="sm" onClick={() => openRaise(f)}>
                  Raise Action
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Finding">
        <div className="flex flex-col gap-3">
          {error && (
            <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Issue *
            <Input value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="e.g. Assembly point signage unclear" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Severity
            <Select value={severity} onChange={(e) => setSeverity(e.target.value as HseSeverity)}>
              {Object.entries(SEVERITY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Finding *
            <textarea rows={3} className={textareaClass} value={finding} onChange={(e) => setFinding(e.target.value)} placeholder="What was observed?" />
          </label>
          <Button type="button" variant="primary" onClick={addFinding} disabled={submitting} className="self-start">
            {submitting ? "Saving…" : "Add Finding"}
          </Button>
        </div>
      </Modal>

      <Modal open={raiseTarget !== null} onClose={() => setRaiseTarget(null)} title="Raise Corrective Action">
        <div className="flex flex-col gap-3">
          {raiseError && (
            <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{raiseError}</span>
            </div>
          )}
          {raiseTarget && <p className="text-[13px] text-text-secondary">{raiseTarget.issue}: {raiseTarget.finding}</p>}
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Owner
            <Select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Priority
            <Select value={priority} onChange={(e) => setPriority(e.target.value as HseActionPriority)}>
              {Object.entries(ACTION_PRIORITY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Due Date
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <Button type="button" variant="primary" onClick={submitRaise} disabled={raising} className="self-start">
            {raising ? "Raising…" : "Raise Corrective Action"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
