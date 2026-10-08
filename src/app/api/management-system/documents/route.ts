import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { createManagementSystemDocument, ManagementSystemError } from "@/lib/services/management-system/document-service";
import { isManagementSystemCategory } from "@/lib/management-system/status";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const form = await request.formData();
  const projectId = form.get("projectId");
  const documentNo = form.get("documentNo");
  const title = form.get("title");
  const managementSystem = form.get("managementSystem");
  const documentType = form.get("documentType");
  const revision = form.get("revision");
  const documentDate = form.get("documentDate");
  const author = form.get("author");
  const documentOwner = form.get("documentOwner");
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
    const document = await createManagementSystemDocument({
      projectId,
      actingUserId: user.id,
      documentNo: typeof documentNo === "string" ? documentNo : "",
      title: typeof title === "string" ? title : "",
      managementSystem,
      documentType: typeof documentType === "string" ? documentType : "",
      revision: typeof revision === "string" ? revision : undefined,
      documentDate: typeof documentDate === "string" && documentDate ? new Date(documentDate) : undefined,
      author: typeof author === "string" ? author : undefined,
      documentOwner: typeof documentOwner === "string" ? documentOwner : undefined,
      file,
    });
    return NextResponse.json({ id: document.id, documentNo: document.documentNo });
  } catch (err) {
    if (err instanceof ManagementSystemError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("POST /api/management-system/documents failed:", err);
    return NextResponse.json({ error: "Failed to create the document. Please try again." }, { status: 500 });
  }
}
