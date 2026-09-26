import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { createEmergencyEvent, EmergencyError } from "@/lib/services/hse/emergency-service";
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
    emergencyType,
    occurredAt,
    location,
    severity,
    description,
    immediateActions,
    peopleAffected,
    emergencyServicesContacted,
    evacuationRequired,
    assemblyPoint,
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
    const event = await createEmergencyEvent({
      projectId,
      reportedById: user.id,
      emergencyType: typeof emergencyType === "string" ? emergencyType : "OTHER",
      occurredAt: typeof occurredAt === "string" ? new Date(occurredAt) : new Date(),
      location: typeof location === "string" ? location : "",
      severity: (severity as never) ?? "MEDIUM",
      description: typeof description === "string" ? description : "",
      immediateActions: typeof immediateActions === "string" ? immediateActions : undefined,
      peopleAffected: typeof peopleAffected === "string" ? peopleAffected : undefined,
      emergencyServicesContacted: typeof emergencyServicesContacted === "boolean" ? emergencyServicesContacted : undefined,
      evacuationRequired: typeof evacuationRequired === "boolean" ? evacuationRequired : undefined,
      assemblyPoint: typeof assemblyPoint === "string" ? assemblyPoint : undefined,
    });
    return NextResponse.json({ id: event.id, eventNumber: event.eventNumber });
  } catch (err) {
    if (err instanceof EmergencyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/hse/emergency/events failed:", err);
    return NextResponse.json({ error: "Failed to report the emergency event. Please try again." }, { status: 500 });
  }
}
