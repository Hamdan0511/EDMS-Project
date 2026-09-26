import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { addIncidentPerson, IncidentError } from "@/lib/services/hse/incident-service";
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

  const incident = await prisma.hseIncident.findUnique({ where: { id }, select: { projectId: true } });
  if (!incident) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, incident.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const person = await addIncidentPerson({
      incidentId: id,
      projectId: incident.projectId,
      actingUserId: user.id,
      name: typeof body.name === "string" ? body.name : "",
      role: typeof body.role === "string" ? body.role : "Witness",
      organization: typeof body.organization === "string" ? body.organization : undefined,
      userId: typeof body.userId === "string" ? body.userId : undefined,
    });
    return NextResponse.json({ id: person.id });
  } catch (err) {
    if (err instanceof IncidentError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`POST /api/hse/incidents/${id}/people failed:`, err);
    return NextResponse.json({ error: "Failed to add the person. Please try again." }, { status: 500 });
  }
}
