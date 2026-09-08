"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DirectoryPerson } from "@/components/mail/recipient-picker";

/**
 * Onboards an external correspondent as a lightweight "guest" Directory
 * contact (see /api/directory/guests) so they can be selected as Sent
 * From/Sent To/Cc on Register Incoming Mail without needing a full user
 * account.
 */
export function CreateGuestModal({
  open,
  onClose,
  projectId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onCreated: (person: DirectoryPerson) => void;
}) {
  const [name, setName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName("");
    setOrganizationName("");
    setJobTitle("");
    setEmail("");
    setError(null);
  }

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!organizationName.trim()) {
      setError("Organization is required");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/directory/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        name: name.trim(),
        organizationName: organizationName.trim(),
        jobTitle: jobTitle.trim() || undefined,
        email: email.trim() || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to create guest contact");
      return;
    }
    onCreated({
      userId: data.userId,
      name: data.name,
      email: data.email,
      organization: data.organization,
      accountType: "GUEST",
    });
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Create Guest"
      width="max-w-sm"
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-text-secondary">
          Add an external correspondent who isn&apos;t yet in this project&apos;s directory.
        </p>
        {error && (
          <div className="rounded-[3px] border border-danger/30 bg-red-50 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Name <span className="text-danger">*</span>
          </label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Organization <span className="text-danger">*</span>
          </label>
          <Input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Job Title</label>
          <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? "Creating…" : "Create Guest"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
