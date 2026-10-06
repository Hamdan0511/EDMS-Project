"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "@/components/ui/icons";
import { TEST_RESULT_LABELS } from "@/lib/field/status";
import type { FieldTestResult } from "@prisma/client";

export function CreateRetestForm({
  testId,
  defaultTestedByName,
}: {
  testId: string;
  defaultTestedByName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [testDate, setTestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [testedByName, setTestedByName] = useState(defaultTestedByName);
  const [witnessedByName, setWitnessedByName] = useState("");
  const [actualResult, setActualResult] = useState("");
  const [resultStatus, setResultStatus] = useState<FieldTestResult>("PENDING");
  const [certificateReference, setCertificateReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!testedByName.trim()) {
      setError("Tested By is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/field/tests/${testId}/retest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        testDate,
        testedByName,
        witnessedByName: witnessedByName || undefined,
        actualResult: actualResult || undefined,
        resultStatus,
        certificateReference: certificateReference || undefined,
        notes: notes || undefined,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to create the retest.");
      return;
    }
    router.push(`/field/tests/${body.id}`);
  }

  if (!open) {
    return (
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>
        Create Retest
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-[3px] border border-border bg-background p-3.5">
      {error && (
        <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Retest Date *
          <Input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Result *
          <Select value={resultStatus} onChange={(e) => setResultStatus(e.target.value as FieldTestResult)}>
            {Object.entries(TEST_RESULT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Tested By *
        <Input value={testedByName} onChange={(e) => setTestedByName(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Witnessed By
        <Input value={witnessedByName} onChange={(e) => setWitnessedByName(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Actual Result
        <Input value={actualResult} onChange={(e) => setActualResult(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Certificate Reference
        <Input value={certificateReference} onChange={(e) => setCertificateReference(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </label>
      <div className="flex gap-2">
        <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
          {submitting ? "Creating…" : "Save Retest"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
