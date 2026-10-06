"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { AlertCircle, Send } from "@/components/ui/icons";

export function SendFieldReportButton({
  projectId,
  reportType,
  defaultSubject,
  filters,
  mailTypes,
  members,
}: {
  projectId: string;
  reportType: string;
  defaultSubject: string;
  filters: { dateFrom?: string; dateTo?: string; areaId?: string; walkId?: string };
  mailTypes: { id: string; name: string }[];
  members: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [typeId, setTypeId] = useState(mailTypes[0]?.id ?? "");
  const [subject, setSubject] = useState(defaultSubject);
  const [toUserIds, setToUserIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentMail, setSentMail] = useState<{ id: string; mailNumber: string } | null>(null);

  function toggleRecipient(id: string) {
    setToUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    if (!typeId) {
      setError("Select a mail type.");
      return;
    }
    if (toUserIds.length === 0) {
      setError("Select at least one recipient.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/field/reports/send-mail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, type: reportType, ...filters, typeId, subject, toUserIds }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to send the report.");
      return;
    }
    setSentMail({ id: body.id, mailNumber: body.mailNumber });
  }

  function close() {
    setOpen(false);
    setSentMail(null);
    setToUserIds([]);
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Send size={14} />
        Send via Mail
      </Button>
      <Modal open={open} onClose={close} title="Send Field Report via Mail">
        {sentMail ? (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-text-primary">
              Report sent as mail <strong>{sentMail.mailNumber}</strong>.
            </p>
            <div className="flex gap-2">
              <Link href={`/mail/${sentMail.id}`} className="text-[13px] font-medium text-brand-700 hover:underline">
                View Mail
              </Link>
              <Button type="button" variant="secondary" size="sm" onClick={close}>Close</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {error && (
              <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Mail Type *
              <Select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
                {mailTypes.length === 0 && <option value="">No mail types configured</option>}
                {mailTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Subject
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </label>
            <div className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Recipients *
              <div className="max-h-40 overflow-y-auto rounded-[3px] border border-border bg-white p-2">
                {members.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 py-1 text-[13px] font-normal text-text-primary">
                    <input type="checkbox" checked={toUserIds.includes(m.id)} onChange={() => toggleRecipient(m.id)} />
                    {m.name}
                  </label>
                ))}
              </div>
            </div>
            <Button type="button" variant="primary" onClick={submit} disabled={submitting} className="self-start">
              {submitting ? "Sending…" : "Send Report"}
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
