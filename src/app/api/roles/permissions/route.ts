import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requirePermission, ForbiddenPermissionError } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { projectId, roleId, permissionId, granted } = body as Record<string, unknown>;
  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  if (typeof roleId !== "string" || typeof permissionId !== "string" || typeof granted !== "boolean") {
    return NextResponse.json({ error: "roleId, permissionId, and granted are required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await requirePermission(user.id, "ADMIN_ROLES", { projectId });
  } catch (err) {
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }
  const permission = await prisma.permission.findUnique({ where: { id: permissionId } });
  if (!permission) {
    return NextResponse.json({ error: "Permission not found" }, { status: 404 });
  }

  if (!granted && permission.code === "ADMIN_ROLES") {
    const holders = await prisma.rolePermission.count({ where: { permission: { code: "ADMIN_ROLES" } } });
    if (holders <= 1) {
      return NextResponse.json(
        { error: "Cannot remove ADMIN_ROLES from the last role that holds it — this would lock everyone out of role administration." },
        { status: 400 },
      );
    }
  }

  if (granted) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      update: {},
      create: { roleId, permissionId },
    });
  } else {
    await prisma.rolePermission.deleteMany({ where: { roleId, permissionId } });
  }

  await logAudit({
    userId: user.id,
    projectId,
    action: "ROLE_PERMISSION_CHANGED",
    entityType: "Role",
    entityId: roleId,
    metadata: { permission: permission.code, granted },
  });

  return NextResponse.json({ ok: true });
}
