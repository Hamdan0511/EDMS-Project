"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AlertCircle } from "@/components/ui/icons";

export function EditUserForm({
  userId,
  projectId,
  initial,
}: {
  userId: string;
  projectId: string;
  initial: {
    jobTitle: string;
    division: string;
    phone: string;
    address: string;
    visibility: "VISIBLE" | "HIDDEN";
    isActive: boolean;
    accountType: "FULL" | "GUEST";
  };
}) {
  const router = useRouter();
  const [jobTitle, setJobTitle] = useState(initial.jobTitle);
  const [division, setDivision] = useState(initial.division);
  const [phone, setPhone] = useState(initial.phone);
  const [address, setAddress] = useState(initial.address);
  const [visibility, setVisibility] = useState(initial.visibility);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setSubmitting(true);
    const res = await fetch(`/api/directory/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        jobTitle,
        division,
        phone,
        address,
        visibility,
        isActive,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to save changes.");
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
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Job Title
          <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Division
          <Input value={division} onChange={(e) => setDivision(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Phone
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Address
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Directory Visibility
          <Select value={visibility} onChange={(e) => setVisibility(e.target.value as "VISIBLE" | "HIDDEN")}>
            <option value="VISIBLE">Visible</option>
            <option value="HIDDEN">Hidden</option>
          </Select>
        </label>
        {initial.accountType === "FULL" && (
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Account Status
            <Select value={isActive ? "active" : "disabled"} onChange={(e) => setIsActive(e.target.value === "active")}>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </Select>
          </label>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="primary" onClick={submit} disabled={submitting}>
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
