import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { queryHseReport, toCsv, type HseReportType } from "@/lib/hse/reports";

const VALID_TYPES: HseReportType[] = [
  "observations",
  "incidents",
  "nearMisses",
  "hazards",
  "riskAssessments",
  "inspections",
  "correctiveActions",
  "permits",
];

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const projectId = sp.get("projectId");
  const type = sp.get("type") as HseReportType | null;
  if (!projectId || !type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "projectId and a valid type are required" }, { status: 400 });
  }

  try {
    await requirePermission(user.id, "HSE_EXPORT_REPORTS", { projectId });
  } catch (err) {
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dateFrom = sp.get("dateFrom") ? new Date(`${sp.get("dateFrom")}T00:00:00.000Z`) : undefined;
  const dateTo = sp.get("dateTo") ? new Date(`${sp.get("dateTo")}T23:59:59.999Z`) : undefined;

  const rows = await queryHseReport(type, projectId, {
    status: sp.get("status") ?? undefined,
    q: sp.get("q") ?? undefined,
    dateFrom,
    dateTo,
  });

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hse-${type}-report.csv"`,
    },
  });
}
