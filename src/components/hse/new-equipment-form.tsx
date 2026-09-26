"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { AlertCircle } from "@/components/ui/icons";
import { EQUIPMENT_TYPES } from "@/lib/hse/equipment";

export function NewEquipmentForm({
  projectId,
  organizations,
  members,
}: {
  projectId: string;
  organizations: { id: string; name: string }[];
  members: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [equipmentType, setEquipmentType] = useState<string>(EQUIPMENT_TYPES[0]);
  const [description, setDescription] = useState("");
  const [makeModel, setMakeModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [location, setLocation] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [responsiblePersonId, setResponsiblePersonId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/hse/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        equipmentType,
        description,
        makeModel: makeModel || undefined,
        serialNumber: serialNumber || undefined,
        location: location || undefined,
        organizationId: organizationId || undefined,
        responsiblePersonId: responsiblePersonId || undefined,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to register the equipment.");
      return;
    }
    router.push(`/hse/equipment/${body.id}`);
  }

  return (
    <div className="flex flex-col rounded-[3px] border border-border bg-white">
      {error && (
        <div className="m-4 mb-0 flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <SectionHeader>Equipment Details</SectionHeader>
      <div className="flex flex-col gap-3 px-4 py-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Equipment Type
            <Select value={equipmentType} onChange={(e) => setEquipmentType(e.target.value)}>
              {EQUIPMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Location
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Site Yard, Tower B" />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Description *
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. 3-Tonne Diesel Forklift" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Make / Model
            <Input value={makeModel} onChange={(e) => setMakeModel(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Serial Number
            <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
          </label>
        </div>
      </div>

      <SectionHeader>Ownership</SectionHeader>
      <div className="grid grid-cols-2 gap-3 px-4 py-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Owner / Organization
          <Select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
            <option value="">—</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Responsible Person
          <Select value={responsiblePersonId} onChange={(e) => setResponsiblePersonId(e.target.value)}>
            <option value="">—</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
        </label>
      </div>

      <div className="px-4 py-3">
        <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
          {submitting ? "Registering…" : "Register Equipment"}
        </Button>
      </div>
    </div>
  );
}
