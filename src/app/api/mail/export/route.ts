import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { buildFullMailWhere, type MailSearchParams } from "@/lib/mail/query";
import { buildMailWorkbookRowPerMail, buildMailWorkbookRowPerRecipient, type ExportableMail } from "@/lib/mail/excel";
import type { Prisma } from "@prisma/client";

// A real, sane upper bound on a single export — matches the Documents
// export precedent. A register this large would need a narrower filter.
const MAX_EXPORT_ROWS = 5000;

const MAIL_EXPORT_INCLUDE = {
  sender: { include: { organization: true } },
  type: true,
  recipients: { include: { user: { include: { organization: true } } } },
  _count: { select: { attachments: true, replies: true } },
} satisfies Prisma.MailInclude;

type ExportBody = {
  projectId?: string;
  mode?: "ROW_PER_MAIL" | "ROW_PER_RECIPIENT";
  selection?:
    | { mode: "IDS"; ids: string[] }
    | { mode: "ALL_RESULTS"; query: MailSearchParams; excludedIds?: string[] };
};

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as ExportBody | null;
  if (!body || typeof body.projectId !== "string" || !body.projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  if (body.mode !== "ROW_PER_MAIL" && body.mode !== "ROW_PER_RECIPIENT") {
    return NextResponse.json({ error: "A valid export mode is required" }, { status: 400 });
  }
  if (!body.selection || (body.selection.mode !== "IDS" && body.selection.mode !== "ALL_RESULTS")) {
    return NextResponse.json({ error: "A valid selection is required" }, { status: 400 });
  }

  let membership;
  try {
    membership = await assertProjectMember(user, body.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await requirePermission(user.id, "MAIL_EXPORT", { projectId: body.projectId });
  } catch (err) {
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: "You do not have permission to export mail." }, { status: 403 });
    }
    throw err;
  }

  const projectId = body.projectId;

  let mails: ExportableMail[];
  if (body.selection.mode === "IDS") {
    const ids = Array.isArray(body.selection.ids) ? body.selection.ids.filter((id) => typeof id === "string") : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "No records selected." }, { status: 400 });
    }
    // Scoping by the CALLER'S verified projectId (never a client-supplied
    // one taken at face value) means any ID belonging to another project
    // simply does not come back — no cross-project leak either way.
    mails = await prisma.mail.findMany({
      where: { id: { in: ids.slice(0, MAX_EXPORT_ROWS) }, projectId },
      include: MAIL_EXPORT_INCLUDE,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  } else {
    const excludedIds = Array.isArray(body.selection.excludedIds)
      ? body.selection.excludedIds.filter((id) => typeof id === "string")
      : [];
    const where = await buildFullMailWhere(
      body.selection.query ?? {},
      { projectId, userId: user.id, organizationId: membership.organizationId },
      prisma,
    );
    const scopedWhere: Prisma.MailWhereInput =
      excludedIds.length > 0 ? { AND: [where, { NOT: { id: { in: excludedIds } } }] } : where;

    mails = await prisma.mail.findMany({
      where: scopedWhere,
      include: MAIL_EXPORT_INCLUDE,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: MAX_EXPORT_ROWS,
    });
  }

  if (mails.length === 0) {
    return NextResponse.json({ error: "No records matched the current selection." }, { status: 400 });
  }

  const buffer =
    body.mode === "ROW_PER_RECIPIENT"
      ? await buildMailWorkbookRowPerRecipient(mails)
      : await buildMailWorkbookRowPerMail(mails);

  const recipientRowCount = mails.reduce((sum, m) => sum + Math.max(m.recipients.length, 1), 0);

  await logAudit({
    userId: user.id,
    projectId,
    action: "MAIL_EXPORTED",
    entityType: "Mail",
    entityId: projectId,
    metadata: {
      mode: body.mode,
      mailCount: mails.length,
      exportedRowCount: body.mode === "ROW_PER_RECIPIENT" ? recipientRowCount : mails.length,
    },
  });

  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "_");
  const filename = `MailExport_${timestamp}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
