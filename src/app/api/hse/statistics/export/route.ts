import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { resolveDateRange, getHseStatistics, statisticsToCsv } from "@/lib/hse/statistics";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const projectId = sp.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await requirePermission(user.id, "HSE_EXPORT_REPORTS", { projectId });
  } catch (err) {
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Re-derives the exact same range the on-screen dashboard used — the
  // export always matches what was displayed, never a broader query.
  const range = resolveDateRange(sp.get("preset") ?? undefined, sp.get("dateFrom") ?? undefined, sp.get("dateTo") ?? undefined);
  const stats = await getHseStatistics(projectId, range);
  const csv = statisticsToCsv(stats);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hse-safety-statistics.csv"`,
    },
  });
}
