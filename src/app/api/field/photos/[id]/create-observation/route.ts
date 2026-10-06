import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { createObservationFromPhoto, PhotoError } from "@/lib/services/field/photo-service";
import { ObservationError } from "@/lib/services/field/observation-service";
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

  const photo = await prisma.fieldPhoto.findUnique({ where: { id }, select: { projectId: true } });
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, photo.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.title !== "string" || typeof body.description !== "string") {
    return NextResponse.json({ error: "title and description are required" }, { status: 400 });
  }

  try {
    const observation = await createObservationFromPhoto({
      photoId: id,
      projectId: photo.projectId,
      actingUserId: user.id,
      title: body.title,
      description: body.description,
      priority: typeof body.priority === "string" ? (body.priority as never) : undefined,
      responsibleUserId: typeof body.responsibleUserId === "string" && body.responsibleUserId ? body.responsibleUserId : undefined,
      dueDate: typeof body.dueDate === "string" && body.dueDate ? new Date(body.dueDate) : undefined,
    });
    return NextResponse.json({ id: observation.id, observationNumber: observation.observationNumber });
  } catch (err) {
    if (err instanceof PhotoError || err instanceof ObservationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`POST /api/field/photos/${id}/create-observation failed:`, err);
    return NextResponse.json({ error: "Failed to create the observation. Please try again." }, { status: 500 });
  }
}
