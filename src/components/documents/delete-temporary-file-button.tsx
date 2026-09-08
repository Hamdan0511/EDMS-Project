"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "@/components/ui/icons";

export function DeleteTemporaryFileButton({
  id,
  fileName,
  redirectTo,
  size = "md",
}: {
  id: string;
  fileName: string;
  /** If provided, navigates here after a successful delete instead of just refreshing in place. */
  redirectTo?: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/temporary-files/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Failed to delete the file.");
      setDeleting(false);
      return;
    }
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  return (
    <Button type="button" variant="ghost" size={size} onClick={handleDelete} disabled={deleting}>
      <Trash2 size={13} />
      {deleting ? "Deleting..." : "Delete"}
    </Button>
  );
}
