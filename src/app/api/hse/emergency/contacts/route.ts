import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { createEmergencyContact, EmergencyError } from "@/lib/services/hse/emergency-service";
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
  const { projectId, name, role, organizationId, phone, email, emergencyType, location, availability, notes } = body as Record<string, unknown>;
  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const contact = await createEmergencyContact({
      projectId,
      createdById: user.id,
      name: typeof name === "string" ? name : "",
      role: typeof role === "string" ? role : "",
      organizationId: typeof organizationId === "string" ? organizationId : undefined,
      phone: typeof phone === "string" ? phone : "",
      email: typeof email === "string" ? email : undefined,
      emergencyType: typeof emergencyType === "string" ? emergencyType : undefined,
      location: typeof location === "string" ? location : undefined,
      availability: typeof availability === "string" ? availability : undefined,
      notes: typeof notes === "string" ? notes : undefined,
    });
    return NextResponse.json({ id: contact.id });
  } catch (err) {
    if (err instanceof EmergencyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/hse/emergency/contacts failed:", err);
    return NextResponse.json({ error: "Failed to create the emergency contact. Please try again." }, { status: 500 });
  }
}
