"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "@/components/ui/icons";

type AttendeeState = { userId: string; name: string; present: boolean; role: string };

export function DrillAttendanceForm({
  drillId,
  members,
  existing,
}: {
  drillId: string;
  members: { id: string; name: string }[];
  existing: { userId: string | null; present: boolean; role: string | null }[];
}) {
  const router = useRouter();
  const existingByUser = new Map(existing.filter((e) => e.userId).map((e) => [e.userId as string, e]));
  const [attendees, setAttendees] = useState<AttendeeState[]>(
    members.map((m) => ({
      userId: m.id,
      name: m.name,
      present: existingByUser.get(m.id)?.present ?? false,
      role: existingByUser.get(m.id)?.role ?? "",
    })),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(userId: string) {
    setAttendees((prev) => prev.map((a) => (a.userId === userId ? { ...a, present: !a.present } : a)));
  }

  const presentCount = attendees.filter((a) => a.present).length;

  async function submit() {
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/hse/emergency/drills/${drillId}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attendees: attendees.map((a) => ({ userId: a.userId, present: a.present, role: a.role || undefined })),
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to record attendance.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex items-center gap-4 text-[13px]">
        <span className="text-text-secondary">
          Expected: <strong className="text-text-primary">{members.length}</strong>
        </span>
        <span className="text-text-secondary">
          Present: <strong className="text-text-primary">{presentCount}</strong>
        </span>
        <span className="text-text-secondary">
          Absent: <strong className="text-text-primary">{members.length - presentCount}</strong>
        </span>
        <span className="text-text-secondary">
          Attendance: <strong className="text-text-primary">{members.length > 0 ? Math.round((presentCount / members.length) * 100) : 0}%</strong>
        </span>
      </div>
      <div className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto rounded-[3px] border border-border">
        {attendees.map((a) => (
          <label key={a.userId} className="flex items-center gap-2 px-3 py-1.5 text-[13px]">
            <input type="checkbox" checked={a.present} onChange={() => toggle(a.userId)} />
            <span className={a.present ? "text-text-primary" : "text-text-muted"}>{a.name}</span>
          </label>
        ))}
      </div>
      <Button type="button" variant="primary" onClick={submit} disabled={submitting} className="self-start">
        {submitting ? "Saving…" : "Save Attendance"}
      </Button>
    </div>
  );
}
