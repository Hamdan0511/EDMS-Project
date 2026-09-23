import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

function parseSlot(value: string | null): 1 | 2 | null {
  return value === "1" ? 1 : value === "2" ? 2 : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mailTypeId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { mailTypeId } = await params;
  const slot = parseSlot(request.nextUrl.searchParams.get("slot"));
  if (!slot) {
    return NextResponse.json({ error: "A valid slot (1 or 2) is required" }, { status: 400 });
  }

  const mailType = await prisma.mailType.findUnique({ where: { id: mailTypeId } });
  if (!mailType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, mailType.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const options = await prisma.mailTypeAttributeOption.findMany({
    where: { mailTypeId, slot },
    orderBy: { value: "asc" },
  });

  return NextResponse.json(options.map((o) => ({ id: o.id, value: o.value })));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ mailTypeId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { mailTypeId } = await params;
  const mailType = await prisma.mailType.findUnique({ where: { id: mailTypeId } });
  if (!mailType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, mailType.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await requirePermission(user.id, "MAIL_MANAGE_SETTINGS", { projectId: mailType.projectId });
  } catch (err) {
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: "Viewers cannot add attribute values" }, { status: 403 });
    }
    throw err;
  }

  const body = await request.json().catch(() => null);
  const slot = body?.slot === 1 || body?.slot === 2 ? body.slot : null;
  const value = typeof body?.value === "string" ? body.value.trim() : "";

  if (!slot) {
    return NextResponse.json({ error: "A valid slot (1 or 2) is required" }, { status: 400 });
  }
  if (!value) {
    return NextResponse.json({ error: "A value is required" }, { status: 400 });
  }
  if (value.length > 200) {
    return NextResponse.json({ error: "Value is too long" }, { status: 400 });
  }

  const option = await prisma.mailTypeAttributeOption.upsert({
    where: { mailTypeId_slot_value: { mailTypeId, slot, value } },
    update: {},
    create: { mailTypeId, slot, value, createdById: user.id },
  });

  return NextResponse.json({ id: option.id, value: option.value });
}
