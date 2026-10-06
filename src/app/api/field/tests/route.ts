import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { createTest, TestError } from "@/lib/services/field/test-service";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const {
    projectId,
    typeName,
    areaId,
    testDate,
    testedByName,
    testedById,
    witnessedByName,
    responsibleOrgId,
    requirement,
    actualResult,
    unit,
    resultStatus,
    certificateReference,
    notes,
  } = body as Record<string, unknown>;
  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const test = await createTest({
      projectId,
      createdById: user.id,
      typeName: typeof typeName === "string" && typeName ? typeName : undefined,
      areaId: typeof areaId === "string" && areaId ? areaId : undefined,
      testDate: typeof testDate === "string" ? new Date(testDate) : new Date(),
      testedByName: typeof testedByName === "string" ? testedByName : "",
      testedById: typeof testedById === "string" && testedById ? testedById : undefined,
      witnessedByName: typeof witnessedByName === "string" ? witnessedByName : undefined,
      responsibleOrgId: typeof responsibleOrgId === "string" && responsibleOrgId ? responsibleOrgId : undefined,
      requirement: typeof requirement === "string" ? requirement : undefined,
      actualResult: typeof actualResult === "string" ? actualResult : undefined,
      unit: typeof unit === "string" ? unit : undefined,
      resultStatus: (typeof resultStatus === "string" ? resultStatus : "PENDING") as never,
      certificateReference: typeof certificateReference === "string" ? certificateReference : undefined,
      notes: typeof notes === "string" ? notes : undefined,
    });
    return NextResponse.json({ id: test.id, testNumber: test.testNumber });
  } catch (err) {
    if (err instanceof TestError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/field/tests failed:", err);
    return NextResponse.json({ error: "Failed to record the test. Please try again." }, { status: 500 });
  }
}
