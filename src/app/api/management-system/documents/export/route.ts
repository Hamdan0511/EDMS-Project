import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { buildWhere } from "@/lib/management-system/query";
import { docOwnerLabel } from "@/lib/management-system/status";

function toCsvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
}

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
    await assertProjectMember(user, projectId);
    await requirePermission(user.id, "MANAGEMENT_SYSTEM_DOWNLOAD", { projectId });
  } catch (err) {
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where = buildWhere(projectId, {
    managementSystem: sp.get("managementSystem") ?? undefined,
    q: sp.get("q") ?? undefined,
  });

  const documents = await prisma.managementSystemDocument.findMany({
    where,
    include: { versions: { where: { isCurrent: true }, take: 1 } },
    orderBy: { documentNo: "asc" },
  });

  const header = ["Name", "Document Name", "Last Rev", "Doc Type", "Date", "Author", "Doc Owner"];
  const lines = [header.map(toCsvCell).join(",")];
  for (const d of documents) {
    lines.push(
      [
        d.documentNo,
        d.title,
        d.currentRevision,
        d.documentType,
        d.documentDate ? d.documentDate.toISOString().slice(0, 10) : "Not specified",
        d.author ?? "Not specified",
        d.documentOwner ? docOwnerLabel(d.documentOwner) : "Not specified",
      ]
        .map(toCsvCell)
        .join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="management-system-documents.csv"`,
    },
  });
}
