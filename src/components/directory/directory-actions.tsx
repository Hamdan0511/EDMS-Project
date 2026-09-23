"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreateMailingGroupModal } from "./create-mailing-group-modal";
import { InviteUserModal } from "./invite-user-modal";

export function CreateMailingGroupButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Create Mailing Group
      </Button>
      <CreateMailingGroupModal open={open} onClose={() => setOpen(false)} projectId={projectId} />
    </>
  );
}

export function InviteUserButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>
        Invite user
      </Button>
      <InviteUserModal open={open} onClose={() => setOpen(false)} projectId={projectId} />
    </>
  );
}
