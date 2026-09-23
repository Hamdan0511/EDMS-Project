import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { submitPrintRequest, listPrintRequests, PrintRequestError } from "@/lib/documents/print-request-service";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requests = await listPrintRequests(projectId);
  return NextResponse.json(
    requests.map((r) => ({
      id: r.id,
      details: r.details,
      createdAt: r.createdAt,
      requestedBy: r.requestedBy.name,
      documents: r.documents.map((d) => ({ id: d.document.id, documentNo: d.document.documentNo, title: d.document.title })),
    })),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { projectId, details, documentIds } = body as Record<string, unknown>;

  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    await requirePermission(user.id, "DOCUMENT_CREATE", { projectId });
  } catch (err) {
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: "Viewers cannot submit print requests" }, { status: 403 });
    }
    throw err;
  }

  try {
    const created = await submitPrintRequest({
      projectId,
      requestedById: user.id,
      details: typeof details === "string" ? details : "",
      documentIds: Array.isArray(documentIds) ? documentIds.filter((v): v is string => typeof v === "string") : [],
    });
    return NextResponse.json({ id: created.id });
  } catch (err) {
    if (err instanceof PrintRequestError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/print-requests failed:", err);
    return NextResponse.json({ error: "Failed to submit the print request." }, { status: 500 });
  }
}
