import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { mailFormSchema } from "@/lib/validation/mail";
import { saveMail, MailValidationError } from "@/lib/services/mail-service";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const form = await request.formData();
  const projectId = form.get("projectId");
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
      return NextResponse.json({ error: "Viewers cannot create or send mail" }, { status: 403 });
    }
    throw err;
  }

  const raw = {
    mailId: form.get("mailId")?.toString() || undefined,
    action: form.get("action")?.toString(),
    typeId: form.get("typeId")?.toString(),
    subject: form.get("subject")?.toString(),
    messageHtml: form.get("messageHtml")?.toString() ?? "",
    attribute1: form.get("attribute1")?.toString() || undefined,
    attribute2: form.get("attribute2")?.toString() || undefined,
    responseRequired: form.get("responseRequired") === "true",
    responseDueDate: form.get("responseDueDate")?.toString() || undefined,
    toUserIds: JSON.parse(form.get("toUserIds")?.toString() ?? "[]"),
    ccUserIds: JSON.parse(form.get("ccUserIds")?.toString() ?? "[]"),
    removeAttachmentIds: JSON.parse(form.get("removeAttachmentIds")?.toString() ?? "[]"),
    parentMailId: form.get("parentMailId")?.toString() || undefined,
    forwardAttachmentIds: JSON.parse(form.get("forwardAttachmentIds")?.toString() ?? "[]"),
  };

  const parsed = mailFormSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  try {
    const mail = await saveMail({
      projectId,
      projectCode: membership.project.code,
      senderId: user.id,
      input: parsed.data,
      files,
    });
    return NextResponse.json({ id: mail.id, mailNumber: mail.mailNumber, status: mail.status });
  } catch (err) {
    if (err instanceof MailValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/mail failed:", err);
    return NextResponse.json({ error: "Failed to save mail. Please try again." }, { status: 500 });
  }
}
