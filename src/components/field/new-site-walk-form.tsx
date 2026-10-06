"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { AlertCircle } from "@/components/ui/icons";
import { FieldAreaPicker, type FieldAreaOption } from "@/components/field/field-area-picker";

export function NewSiteWalkForm({
  projectId,
  areaTree,
}: {
  projectId: string;
  areaTree: FieldAreaOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [areaId, setAreaId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!purpose.trim()) {
      setError("Purpose is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/field/site-walks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, purpose, areaId: areaId || undefined }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to start the site walk.");
      return;
    }
    router.push(`/field/site-walks/${body.id}`);
  }

  return (
    <>
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>
        Start Site Walk
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Start Site Walk">
        <div className="flex flex-col gap-3">
          {error && (
            <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Purpose *
            <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Weekly QA walk — Level 03" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Starting Location
            <FieldAreaPicker tree={areaTree} value={areaId} onChange={setAreaId} />
          </label>
          <Button type="button" variant="primary" onClick={submit} disabled={submitting} className="self-start">
            {submitting ? "Starting…" : "Start Walk"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
