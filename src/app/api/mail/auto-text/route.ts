import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requireProjectRole, ForbiddenRoleError } from "@/lib/auth/roles";
import { listAutoTexts, createAutoText, AutoTextError } from "@/lib/mail/auto-text-service";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const items = await listAutoTexts(projectId);
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  if (!projectId) {
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
      return NextResponse.json({ error: "Viewers cannot create Auto Text" }, { status: 403 });
    }
    throw err;
  }

  try {
    const item = await createAutoText({
      projectId,
      userId: user.id,
      name: typeof body?.name === "string" ? body.name : "",
      contentHtml: typeof body?.contentHtml === "string" ? body.contentHtml : "",
      description: typeof body?.description === "string" ? body.description : undefined,
    });
    return NextResponse.json(item);
  } catch (err) {
    if (err instanceof AutoTextError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
