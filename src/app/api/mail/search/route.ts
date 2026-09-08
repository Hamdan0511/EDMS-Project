import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";

/** Read-only lookup feeding Register Incoming Mail's Attach > Project Mail
 * modal — creates a reference only, never duplicates or mutates the mail
 * found here. Only ever searches already-registered (SENT) mail. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const q = searchParams.get("q")?.trim() ?? "";
  const excludeId = searchParams.get("excludeId") ?? undefined;

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const mails = await prisma.mail.findMany({
    where: {
      projectId,
      status: "SENT",
      ...(excludeId ? { id: { not: excludeId } } : {}),
      ...(q
        ? {
            OR: [
              { mailNumber: { contains: q, mode: "insensitive" } },
              { subject: { contains: q, mode: "insensitive" } },
              { sender: { name: { contains: q, mode: "insensitive" } } },
              { type: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { sender: true, type: true },
    orderBy: { sentAt: "desc" },
    take: 20,
  });

  return NextResponse.json(
    mails.map((m) => ({
      id: m.id,
      mailNumber: m.mailNumber,
      subject: m.subject,
      senderName: m.sender.name,
      typeName: m.type.name,
      date: (m.sentAt ?? m.createdAt).toISOString(),
    })),
  );
}
