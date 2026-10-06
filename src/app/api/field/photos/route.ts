import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { uploadFieldPhoto, PhotoError } from "@/lib/services/field/photo-service";
import { SiteWalkError } from "@/lib/services/field/site-walk-service";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const form = await request.formData();
  const projectId = form.get("projectId");
  const file = form.get("file");
  const areaId = form.get("areaId");
  const siteWalkId = form.get("siteWalkId");
  const category = form.get("category");
  const capturedAt = form.get("capturedAt");

  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const photo = await uploadFieldPhoto({
      projectId,
      uploadedById: user.id,
      file,
      areaId: typeof areaId === "string" && areaId ? areaId : undefined,
      siteWalkId: typeof siteWalkId === "string" && siteWalkId ? siteWalkId : undefined,
      category: typeof category === "string" && category ? category : undefined,
      capturedAt: typeof capturedAt === "string" && capturedAt ? new Date(capturedAt) : undefined,
    });
    return NextResponse.json({ id: photo.id, attachmentId: photo.attachmentId });
  } catch (err) {
    if (err instanceof PhotoError || err instanceof SiteWalkError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/field/photos failed:", err);
    return NextResponse.json({ error: "Failed to upload the photo. Please try again." }, { status: 500 });
  }
}
