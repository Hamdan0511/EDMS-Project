import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { upsertManagementSystemCertificate, ManagementSystemError } from "@/lib/services/management-system/certificate-service";
import { isManagementSystemCategory } from "@/lib/management-system/status";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const form = await request.formData();
  const projectId = form.get("projectId");
  const managementSystem = form.get("managementSystem");
  const file = form.get("file");

  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  if (typeof managementSystem !== "string" || !isManagementSystemCategory(managementSystem)) {
    return NextResponse.json({ error: "A valid managementSystem is required" }, { status: 400 });
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
    const certificate = await upsertManagementSystemCertificate({ projectId, actingUserId: user.id, managementSystem, file });
    return NextResponse.json({ id: certificate.id });
  } catch (err) {
    if (err instanceof ManagementSystemError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/management-system/certificates failed:", err);
    return NextResponse.json({ error: "Failed to upload the certificate. Please try again." }, { status: 500 });
  }
}
