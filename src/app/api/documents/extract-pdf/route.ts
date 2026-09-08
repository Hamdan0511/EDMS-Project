import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requireProjectRole, ForbiddenRoleError } from "@/lib/auth/roles";
import { extractPdfPages, ExtractPdfError, MAX_SIZE_BYTES } from "@/lib/documents/extract-pdf-service";

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
      return NextResponse.json({ error: "Viewers cannot extract PDF pages" }, { status: 403 });
    }
    throw err;
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A PDF file is required" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "The file is too large. Maximum file size is 200MB." },
      { status: 400 },
    );
  }

  const pageSelection = form.get("pageSelection");
  const keepOriginalOrder = form.get("keepOriginalOrder") !== "false";
  const outputFileName = form.get("outputFileName");

  if (typeof pageSelection !== "string" || !pageSelection.trim()) {
    return NextResponse.json({ error: "Select at least one page to extract" }, { status: 400 });
  }

  try {
    const result = await extractPdfPages({
      file,
      pageSelection,
      keepOriginalOrder,
      outputFileName: typeof outputFileName === "string" ? outputFileName : undefined,
    });

    return new NextResponse(new Uint8Array(result.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(result.fileName)}"`,
        "X-Extracted-Page-Count": String(result.pageCount),
        "X-Source-Page-Count": String(result.sourcePageCount),
        "X-Output-File-Name": encodeURIComponent(result.fileName),
      },
    });
  } catch (err) {
    if (err instanceof ExtractPdfError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Extract PDF failed:", err);
    return NextResponse.json(
      { error: "Failed to extract pages from the PDF. Please try again." },
      { status: 500 },
    );
  }
}
