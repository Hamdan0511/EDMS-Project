import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { recordDrillAttendance, EmergencyError } from "@/lib/services/hse/emergency-service";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

type AttendeeInput = { userId?: string; organizationName?: string; present: boolean; role?: string };

function parseAttendees(raw: unknown): AttendeeInput[] | null {
  if (!Array.isArray(raw)) return null;
  const attendees: AttendeeInput[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return null;
    const { userId, organizationName, present, role } = entry as Record<string, unknown>;
    if (typeof present !== "boolean") return null;
    attendees.push({
      userId: typeof userId === "string" ? userId : undefined,
      organizationName: typeof organizationName === "string" ? organizationName : undefined,
      present,
      role: typeof role === "string" ? role : undefined,
    });
  }
  return attendees;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const record = await prisma.hseEmergencyDrill.findUnique({ where: { id }, select: { projectId: true } });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, record.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const attendees = parseAttendees(body?.attendees);
  if (!attendees) {
    return NextResponse.json({ error: "A valid attendees[] list is required." }, { status: 400 });
  }

  try {
    await recordDrillAttendance({ drillId: id, projectId: record.projectId, actingUserId: user.id, attendees });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof EmergencyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`POST /api/hse/emergency/drills/${id}/attendance failed:`, err);
    return NextResponse.json({ error: "Failed to record attendance. Please try again." }, { status: 500 });
  }
}
