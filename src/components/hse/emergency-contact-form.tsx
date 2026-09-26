"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "@/components/ui/icons";
import { EMERGENCY_TYPES } from "@/lib/hse/emergency";

export type EmergencyContactRecord = {
  id: string;
  name: string;
  role: string;
  organizationId: string | null;
  phone: string;
  email: string | null;
  emergencyType: string | null;
  location: string | null;
  availability: string | null;
  notes: string | null;
};

export function EmergencyContactForm({
  projectId,
  organizations,
  existing,
  onDone,
}: {
  projectId: string;
  organizations: { id: string; name: string }[];
  existing?: EmergencyContactRecord;
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(existing?.name ?? "");
  const [role, setRole] = useState(existing?.role ?? "");
  const [organizationId, setOrganizationId] = useState(existing?.organizationId ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [emergencyType, setEmergencyType] = useState(existing?.emergencyType ?? "");
  const [location, setLocation] = useState(existing?.location ?? "");
  const [availability, setAvailability] = useState(existing?.availability ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || !role.trim() || !phone.trim()) {
      setError("Name, role, and phone are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const body = {
      projectId,
      name,
      role,
      organizationId: organizationId || undefined,
      phone,
      email: email || undefined,
      emergencyType: emergencyType || undefined,
      location: location || undefined,
      availability: availability || undefined,
      notes: notes || undefined,
    };
    const res = existing
      ? await fetch(`/api/hse/emergency/contacts/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/hse/emergency/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
    const resBody = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(resBody.error ?? "Failed to save the contact.");
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Name *
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Role *
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. HSE Manager, Fire Warden" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Organization
          <Select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
            <option value="">—</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Emergency Type
          <Select value={emergencyType} onChange={(e) => setEmergencyType(e.target.value)}>
            <option value="">—</option>
            {EMERGENCY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Phone *
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Email
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Location
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Availability
          <Input value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="e.g. 24/7, Business Hours" />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Notes
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <Button type="button" variant="primary" onClick={submit} disabled={submitting} className="mt-1 self-start">
        {submitting ? "Saving…" : existing ? "Save Changes" : "Add Contact"}
      </Button>
    </div>
  );
}
