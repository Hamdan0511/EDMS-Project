"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { CONTROL_HIERARCHY_LABELS, CONTROL_STATUS_LABELS, CONTROL_STATUS_BADGE_CLASSES } from "@/lib/hse/status";

export type HseControlItem = {
  id: string;
  hierarchy: string;
  description: string;
  ownerName: string | null;
  dueDate: string | null;
  status: string;
};

/** Shared hierarchy-of-controls panel used by both Hazards and Risk
 * Assessments — real controls, real status transitions, backing the
 * Initial Risk -> Controls -> Residual Risk chain shown on both registers. */
export function HseControlsPanel({
  addControlPath,
  controls,
  canManage,
}: {
  addControlPath: string;
  controls: HseControlItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [hierarchy, setHierarchy] = useState("ADMINISTRATIVE");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addControl() {
    if (!description.trim()) {
      setError("Control description is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch(addControlPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hierarchy, description, dueDate: dueDate || undefined }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to add the control.");
      return;
    }
    setDescription("");
    setDueDate("");
    router.refresh();
  }

  async function updateStatus(controlId: string, status: string) {
    await fetch(`/api/hse/controls/${controlId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {controls.length === 0 ? (
        <p className="text-[13px] text-text-muted">No controls added yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {controls.map((c) => (
            <li key={c.id} className="rounded-[3px] border border-border bg-white p-2.5 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="font-medium text-text-primary">{CONTROL_HIERARCHY_LABELS[c.hierarchy as keyof typeof CONTROL_HIERARCHY_LABELS]}</span>
                {canManage ? (
                  <div className="w-40">
                    <Select value={c.status} onChange={(e) => updateStatus(c.id, e.target.value)}>
                      {Object.entries(CONTROL_STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </Select>
                  </div>
                ) : (
                  <StatusBadge
                    label={CONTROL_STATUS_LABELS[c.status as keyof typeof CONTROL_STATUS_LABELS]}
                    className={CONTROL_STATUS_BADGE_CLASSES[c.status as keyof typeof CONTROL_STATUS_BADGE_CLASSES]}
                  />
                )}
              </div>
              <p className="mt-1 text-text-secondary">{c.description}</p>
              <p className="mt-1 text-[11px] text-text-muted">
                {c.ownerName ? `Owner: ${c.ownerName} · ` : ""}
                {c.dueDate ? `Due ${new Date(c.dueDate).toLocaleDateString("en-GB")}` : "No due date"}
              </p>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          {error && <p className="text-[12px] text-danger">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Hierarchy
              <Select value={hierarchy} onChange={(e) => setHierarchy(e.target.value)}>
                {Object.entries(CONTROL_HIERARCHY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Due Date
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Description
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the control measure" />
          </label>
          <Button type="button" variant="secondary" onClick={addControl} disabled={submitting} className="w-fit">
            {submitting ? "Adding…" : "Add Control"}
          </Button>
        </div>
      )}
    </div>
  );
}
