import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import type { SearchModule } from "@prisma/client";

const MODULES: SearchModule[] = ["MAIL", "DOCUMENTS", "WORKFLOWS"];

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get("projectId");
  const moduleParam = request.nextUrl.searchParams.get("module");
  if (!projectId || !MODULES.includes(moduleParam as SearchModule)) {
    return NextResponse.json({ error: "projectId and a valid module are required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const searches = await prisma.savedSearch.findMany({
    where: { projectId, userId: user.id, module: moduleParam as SearchModule },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    searches.map((s) => ({ id: s.id, name: s.name, filters: s.filters, createdAt: s.createdAt })),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { projectId, module: moduleParam, name, filters } = body as Record<string, unknown>;

  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  if (!MODULES.includes(moduleParam as SearchModule)) {
    return NextResponse.json({ error: "A valid module is required" }, { status: 400 });
  }
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "A name is required" }, { status: 400 });
  }
  if (typeof filters !== "object" || filters === null) {
    return NextResponse.json({ error: "filters is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const saved = await prisma.savedSearch.upsert({
      where: {
        userId_projectId_module_name: {
          userId: user.id,
          projectId,
          module: moduleParam as SearchModule,
          name: name.trim(),
        },
      },
      update: { filters },
      create: {
        userId: user.id,
        projectId,
        module: moduleParam as SearchModule,
        name: name.trim(),
        filters,
      },
    });
    return NextResponse.json({ id: saved.id, name: saved.name });
  } catch (err) {
    console.error("POST /api/saved-searches failed:", err);
    return NextResponse.json({ error: "Failed to save the search. Please try again." }, { status: 500 });
  }
}
