import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import type { DocumentMetadataCategory } from "@prisma/client";

const CATEGORIES: DocumentMetadataCategory[] = ["DISCIPLINE", "FUNCTIONAL_BREAKDOWN", "SPATIAL_BREAKDOWN"];

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get("projectId");
  const category = request.nextUrl.searchParams.get("category") as DocumentMetadataCategory | null;
  if (!projectId || !category || !CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "projectId and a valid category are required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const options = await prisma.documentMetadataOption.findMany({
    where: { projectId, category },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(options.map((o) => ({ id: o.id, name: o.name })));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const category = body?.category as DocumentMetadataCategory;
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!projectId || !CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "projectId and a valid category are required" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "A value is required" }, { status: 400 });
  }
  if (name.length > 200) {
    return NextResponse.json({ error: "Value is too long" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    await requirePermission(user.id, "DOCUMENT_UPDATE", { projectId });
  } catch (err) {
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: "Viewers cannot add configuration values" }, { status: 403 });
    }
    throw err;
  }

  const option = await prisma.documentMetadataOption.upsert({
    where: { projectId_category_name: { projectId, category, name } },
    update: {},
    create: { projectId, category, name },
  });
  return NextResponse.json({ id: option.id, name: option.name });
}
