import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { getFieldReportTable, fieldReportToCsv, FIELD_REPORT_TYPES, type FieldReportType } from "@/lib/field/reports";
import { saveMail, MailValidationError } from "@/lib/services/mail-service";

const VALID_TYPES = FIELD_REPORT_TYPES.map((t) => t.key);

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { projectId, type, dateFrom, dateTo, areaId, walkId, typeId, toUserIds, subject } = body as Record<string, unknown>;

  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  if (typeof type !== "string" || !VALID_TYPES.includes(type as FieldReportType)) {
    return NextResponse.json({ error: "A valid report type is required" }, { status: 400 });
  }
  if (typeof typeId !== "string" || !typeId) {
    return NextResponse.json({ error: "A mail type is required" }, { status: 400 });
  }
  if (!Array.isArray(toUserIds) || toUserIds.length === 0) {
    return NextResponse.json({ error: "At least one recipient is required" }, { status: 400 });
  }

  let membership;
  try {
    membership = await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await requirePermission(user.id, "FIELD_EXPORT_REPORTS", { projectId });
  } catch (err) {
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }

  const table = await getFieldReportTable(type as FieldReportType, projectId, {
    dateFrom: typeof dateFrom === "string" && dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : undefined,
    dateTo: typeof dateTo === "string" && dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : undefined,
    areaId: typeof areaId === "string" && areaId ? areaId : undefined,
    walkId: typeof walkId === "string" && walkId ? walkId : undefined,
  });

  const csv = fieldReportToCsv(table);
  const fileName = `${table.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
  const file = new File([csv], fileName, { type: "text/csv" });

  try {
    const mail = await saveMail({
      projectId,
      projectCode: membership.project.code,
      senderId: user.id,
      input: {
        action: "send",
        typeId,
        subject: typeof subject === "string" && subject.trim() ? subject.trim() : table.title,
        messageHtml: `<p>${table.title} — ${table.filtersSummary} (${table.rows.length} record${table.rows.length === 1 ? "" : "s"}). See attached CSV.</p>`,
        attribute1: undefined,
        attribute2: undefined,
        responseRequired: false,
        responseDueDate: undefined,
        toUserIds: toUserIds as string[],
        ccUserIds: [],
        removeAttachmentIds: [],
        parentMailId: undefined,
        forwardAttachmentIds: [],
      },
      files: [file],
    });
    return NextResponse.json({ id: mail.id, mailNumber: mail.mailNumber });
  } catch (err) {
    if (err instanceof MailValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/field/reports/send-mail failed:", err);
    return NextResponse.json({ error: "Failed to send the report. Please try again." }, { status: 500 });
  }
}
