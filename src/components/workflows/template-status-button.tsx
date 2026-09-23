"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const NEXT_STATUS: Record<string, { status: "DRAFT" | "ACTIVE" | "INACTIVE"; label: string; confirm?: string }> = {
  DRAFT: { status: "ACTIVE", label: "Activate" },
  ACTIVE: { status: "INACTIVE", label: "Deactivate", confirm: "Deactivate this template? It will no longer be selectable to start new workflows." },
  INACTIVE: { status: "ACTIVE", label: "Reactivate" },
};

export function TemplateStatusButton({ templateId, status }: { templateId: string; status: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const next = NEXT_STATUS[status];
  if (!next) return null;

  async function submit() {
    if (next.confirm && !window.confirm(next.confirm)) return;
    setSubmitting(true);
    const res = await fetch(`/api/workflow-templates/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next.status }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      window.alert(body.error ?? "Failed to update the template.");
      return;
    }
    router.refresh();
  }

  return (
    <Button type="button" variant="secondary" onClick={submit} disabled={submitting}>
      {submitting ? "Saving..." : next.label}
    </Button>
  );
}
