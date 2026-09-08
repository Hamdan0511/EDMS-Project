import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requireProjectRole, ForbiddenRoleError } from "@/lib/auth/roles";
import { uploadInlineImage, InlineImageError } from "@/lib/mail/inline-image-service";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const form = await request.formData();
  const projectId = form.get("projectId");
  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  let membership;
  try {
    membership = await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    requireProjectRole(membership, ["ADMIN", "MEMBER"]);
  } catch (err) {
    if (err instanceof ForbiddenRoleError) {
      return NextResponse.json({ error: "Viewers cannot insert images into mail" }, { status: 403 });
    }
    throw err;
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "An image file is required" }, { status: 400 });
  }

  try {
    const image = await uploadInlineImage({ projectId, uploadedById: user.id, file });
    return NextResponse.json({ id: image.id, url: `/api/mail/inline-images/${image.id}` });
  } catch (err) {
    if (err instanceof InlineImageError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Inline image upload failed:", err);
    return NextResponse.json({ error: "Failed to upload the image. Please try again." }, { status: 500 });
  }
}
