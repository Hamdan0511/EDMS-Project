import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { createPermit, PermitError } from "@/lib/services/hse/permit-service";
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
  const b = body as Record<string, unknown>;
  if (typeof b.projectId !== "string" || !b.projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, b.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const permit = await createPermit({
      projectId: b.projectId,
      requestedById: user.id,
      type: (b.type as never) ?? "OTHER",
      location: typeof b.location === "string" ? b.location : "",
      workDescription: typeof b.workDescription === "string" ? b.workDescription : "",
      contractorOrg: typeof b.contractorOrg === "string" ? b.contractorOrg : undefined,
      startDate: typeof b.startDate === "string" ? new Date(b.startDate) : new Date(NaN),
      endDate: typeof b.endDate === "string" ? new Date(b.endDate) : new Date(NaN),
      hazards: typeof b.hazards === "string" ? b.hazards : undefined,
      controls: typeof b.controls === "string" ? b.controls : undefined,
      requiredPpe: typeof b.requiredPpe === "string" ? b.requiredPpe : undefined,
      precautions: typeof b.precautions === "string" ? b.precautions : undefined,
    });
    return NextResponse.json({ id: permit.id, permitNumber: permit.permitNumber });
  } catch (err) {
    if (err instanceof PermitError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/hse/permits failed:", err);
    return NextResponse.json({ error: "Failed to create the permit. Please try again." }, { status: 500 });
  }
}
