import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";

/** Read-only, immutable transmittal history — powers Reports > Transmittal
 * History By Document / By Organization. Never mutates any record; every
 * row reflects what was actually true at the time the transmittal was sent
 * (revisionAtIssue is a permanent snapshot, not the document's live
 * revision). */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const documentId = searchParams.get("documentId");
  const organizationId = searchParams.get("organizationId");

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  if (!documentId && !organizationId) {
    return NextResponse.json({ error: "documentId or organizationId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const references = await prisma.mailDocumentReference.findMany({
    where: {
      document: { projectId },
      ...(documentId ? { documentId } : {}),
      ...(organizationId
        ? {
            mail: {
              OR: [
                { sender: { organizationId } },
                { recipients: { some: { user: { organizationId } } } },
              ],
            },
          }
        : {}),
    },
    include: {
      document: true,
      mail: {
        include: {
          sender: { include: { organization: true } },
          recipients: { include: { user: { include: { organization: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    references.map((ref) => ({
      id: ref.id,
      documentId: ref.document.id,
      documentNo: ref.document.documentNo,
      title: ref.document.title,
      revisionAtIssue: ref.revisionAtIssue ?? ref.document.currentRevision,
      isOutdated: (ref.revisionAtIssue ?? ref.document.currentRevision) !== ref.document.currentRevision,
      mailId: ref.mail.id,
      mailNumber: ref.mail.mailNumber,
      subject: ref.mail.subject,
      date: (ref.mail.sentAt ?? ref.mail.createdAt).toISOString(),
      sender: ref.mail.sender.name,
      senderOrg: ref.mail.sender.organization.name,
      recipients: ref.mail.recipients.map((r) => ({
        name: r.user.name,
        organization: r.user.organization.name,
        type: r.type,
      })),
      status: ref.mail.status,
    })),
  );
}
