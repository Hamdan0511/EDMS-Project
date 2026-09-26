"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const ROLE_OPTIONS = ["Injured Person", "Witness", "First Aider", "Supervisor", "Other"];

export function IncidentPeopleForm({
  incidentId,
  members,
}: {
  incidentId: string;
  members: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [linkedUserId, setLinkedUserId] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState(ROLE_OPTIONS[1]);
  const [organization, setOrganization] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMember = members.find((m) => m.id === linkedUserId);

  async function submit() {
    const effectiveName = selectedMember ? selectedMember.name : name.trim();
    if (!effectiveName) {
      setError("A name (or a linked project member) is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/hse/incidents/${incidentId}/people`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: effectiveName,
        role,
        organization: organization || undefined,
        userId: linkedUserId || undefined,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to add the person.");
      return;
    }
    setName("");
    setOrganization("");
    setLinkedUserId("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      {error && <p className="text-[12px] text-danger">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Project Member (optional)
          <Select value={linkedUserId} onChange={(e) => setLinkedUserId(e.target.value)}>
            <option value="">— Not a project member —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Role
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        </label>
      </div>
      {!linkedUserId && (
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Name
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        </label>
      )}
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Organization (optional)
        <Input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="e.g. Subcontractor name" />
      </label>
      <Button type="button" variant="secondary" onClick={submit} disabled={submitting} className="w-fit">
        {submitting ? "Adding…" : "Add Person"}
      </Button>
    </div>
  );
}
