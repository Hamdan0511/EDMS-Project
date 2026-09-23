"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CreateGuestModal } from "@/components/mail/incoming/create-guest-modal";

export function DirectoryCreateGuestButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Create Guest
      </Button>
      <CreateGuestModal
        open={open}
        onClose={() => setOpen(false)}
        projectId={projectId}
        onCreated={() => router.refresh()}
      />
    </>
  );
}
