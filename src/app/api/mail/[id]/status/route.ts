import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { MailWorkflowStatus } from "@prisma/client";

const VALID_STATUSES: MailWorkflowStatus[] = [
  "NA",
  "OUTSTANDING",
  "OVERDUE",
  "RESPONDED",
  "NO_ACTION_REQUIRED",
  "CLOSED_OUT",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const workflowStatus = body?.workflowStatus as string | undefined;
  if (!workflowStatus || !VALID_STATUSES.includes(workflowStatus as MailWorkflowStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const mail = await prisma.mail.findUnique({ where: { id } });
  if (!mail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, mail.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await requirePermission(user.id, "MAIL_CLOSE_OUT", { projectId: mail.projectId });
  } catch (err) {
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: "Viewers cannot change mail status" }, { status: 403 });
    }
    throw err;
  }

  if (mail.status !== "SENT") {
    return NextResponse.json({ error: "Only sent mail has a workflow status" }, { status: 400 });
  }

  const updated = await prisma.mail.update({
    where: { id },
    data: { workflowStatus: workflowStatus as MailWorkflowStatus },
  });

  await logAudit({
    userId: user.id,
    projectId: mail.projectId,
    action: "MAIL_STATUS_CHANGED",
    entityType: "Mail",
    entityId: mail.id,
    metadata: { from: mail.workflowStatus, to: workflowStatus },
  });

  return NextResponse.json({ workflowStatus: updated.workflowStatus });
}
