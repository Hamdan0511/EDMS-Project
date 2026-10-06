import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { getFieldReportTable, fieldReportToCsv, FIELD_REPORT_TYPES, type FieldReportType } from "@/lib/field/reports";

const VALID_TYPES = FIELD_REPORT_TYPES.map((t) => t.key);

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const projectId = sp.get("projectId");
  const type = sp.get("type") as FieldReportType | null;
  if (!projectId || !type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "projectId and a valid type are required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
    await requirePermission(user.id, "FIELD_EXPORT_REPORTS", { projectId });
  } catch (err) {
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dateFrom = sp.get("dateFrom") ? new Date(`${sp.get("dateFrom")}T00:00:00.000Z`) : undefined;
  const dateTo = sp.get("dateTo") ? new Date(`${sp.get("dateTo")}T23:59:59.999Z`) : undefined;

  const table = await getFieldReportTable(type, projectId, {
    dateFrom,
    dateTo,
    areaId: sp.get("areaId") ?? undefined,
    walkId: sp.get("walkId") ?? undefined,
  });

  const csv = fieldReportToCsv(table);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="field-${type}-report.csv"`,
    },
  });
}
