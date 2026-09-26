import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { createIncident, IncidentError } from "@/lib/services/hse/incident-service";
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
    type,
    title,
    description,
    location,
    building,
    floor,
    area,
    latitude,
    longitude,
    severity,
    incidentDate,
    incidentTime,
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
    const incident = await createIncident({
      projectId,
      reportedById: user.id,
      type: (type as never) ?? "OTHER",
      title: typeof title === "string" ? title : "",
      description: typeof description === "string" ? description : "",
      location: typeof location === "string" ? location : "",
      building: typeof building === "string" ? building : undefined,
      floor: typeof floor === "string" ? floor : undefined,
      area: typeof area === "string" ? area : undefined,
      latitude: typeof latitude === "number" ? latitude : undefined,
      longitude: typeof longitude === "number" ? longitude : undefined,
      severity: (severity as never) ?? "LOW",
      incidentDate: typeof incidentDate === "string" ? new Date(incidentDate) : new Date(),
      incidentTime: typeof incidentTime === "string" ? incidentTime : undefined,
    });
    return NextResponse.json({ id: incident.id, incidentNumber: incident.incidentNumber });
  } catch (err) {
    if (err instanceof IncidentError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/hse/incidents failed:", err);
    return NextResponse.json({ error: "Failed to create the incident. Please try again." }, { status: 500 });
  }
}
