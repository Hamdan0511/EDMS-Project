"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "@/components/ui/icons";

export function DeleteDocumentButton({
  documentId,
  documentNo,
  title,
  redirectTo = "/documents",
}: {
  documentId: string;
  documentNo: string;
  title: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete document "${documentNo} — ${title}"? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Failed to delete the document.");
      setDeleting(false);
      return;
    }
    router.push(redirectTo);
  }

  return (
    <Button type="button" variant="secondary" onClick={handleDelete} disabled={deleting} className="text-red-700">
      <Trash2 size={14} />
      {deleting ? "Deleting..." : "Delete"}
    </Button>
  );
}
