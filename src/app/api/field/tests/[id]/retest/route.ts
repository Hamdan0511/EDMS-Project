import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { createRetest, TestError } from "@/lib/services/field/test-service";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const record = await prisma.fieldTest.findUnique({ where: { id }, select: { projectId: true } });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, record.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const retest = await createRetest({
      previousTestId: id,
      projectId: record.projectId,
      createdById: user.id,
      testDate: typeof body.testDate === "string" ? new Date(body.testDate) : new Date(),
      testedByName: typeof body.testedByName === "string" ? body.testedByName : "",
      testedById: typeof body.testedById === "string" && body.testedById ? body.testedById : undefined,
      witnessedByName: typeof body.witnessedByName === "string" ? body.witnessedByName : undefined,
      actualResult: typeof body.actualResult === "string" ? body.actualResult : undefined,
      resultStatus: (typeof body.resultStatus === "string" ? body.resultStatus : "PENDING") as never,
      certificateReference: typeof body.certificateReference === "string" ? body.certificateReference : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    });
    return NextResponse.json({ id: retest.id, testNumber: retest.testNumber });
  } catch (err) {
    if (err instanceof TestError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`POST /api/field/tests/${id}/retest failed:`, err);
    return NextResponse.json({ error: "Failed to create the retest. Please try again." }, { status: 500 });
  }
}
