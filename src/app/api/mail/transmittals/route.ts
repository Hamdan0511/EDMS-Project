import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { transmittalFormSchema } from "@/lib/validation/transmittal";
import { saveTransmittal, TransmittalError } from "@/lib/services/transmittal-service";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const projectId = (body as Record<string, unknown>).projectId;
  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  let membership;
  try {
    membership = await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await requirePermission(user.id, "MAIL_SEND", { projectId });
  } catch (err) {
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: "Viewers cannot create transmittals" }, { status: 403 });
    }
    throw err;
  }

  const parsed = transmittalFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const mail = await saveTransmittal({
      projectId,
      projectCode: membership.project.code,
      senderId: user.id,
      input: parsed.data,
    });
    return NextResponse.json({ id: mail.id, mailNumber: mail.mailNumber, status: mail.status });
  } catch (err) {
    if (err instanceof TransmittalError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/mail/transmittals failed:", err);
    return NextResponse.json(
      { error: "Failed to save the transmittal. Please try again." },
      { status: 500 },
    );
  }
}
