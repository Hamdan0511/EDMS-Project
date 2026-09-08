import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { requireProjectRole, ForbiddenRoleError } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/audit";

/**
 * Onboards an external correspondent into a project's Directory as a
 * lightweight "guest" contact — a real User/ProjectMember row (so it works
 * everywhere the Directory already works: RecipientPicker, mail sender,
 * mail detail) but marked accountType = GUEST and isActive = false, which
 * means the existing login check (`!user.isActive`) blocks sign-in for it
 * with no changes to auth code. Guests get VIEWER project role — they are a
 * correspondence identity, not a working project member.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const organizationName = typeof body?.organizationName === "string" ? body.organizationName.trim() : "";
  const jobTitle = typeof body?.jobTitle === "string" ? body.jobTitle.trim() : "";
  const emailInput = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!organizationName) {
    return NextResponse.json({ error: "Organization is required" }, { status: 400 });
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
      return NextResponse.json({ error: "Viewers cannot create guest contacts" }, { status: 403 });
    }
    throw err;
  }

  if (emailInput) {
    const existingUser = await prisma.user.findUnique({ where: { email: emailInput } });
    if (existingUser) {
      return NextResponse.json(
        { error: "A directory contact with this email already exists. Search for them instead of creating a new one." },
        { status: 409 },
      );
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let organization = await tx.organization.findFirst({
        where: { name: { equals: organizationName, mode: "insensitive" } },
      });
      if (!organization) {
        organization = await tx.organization.create({ data: { name: organizationName } });
      }

      const email = emailInput || `guest-${randomUUID()}@guest.shanfari.local`;
      const guest = await tx.user.create({
        data: {
          email,
          name,
          jobTitle: jobTitle || null,
          organizationId: organization.id,
          passwordHash: await hashPassword(randomUUID()),
          accountType: "GUEST",
          isActive: false,
        },
      });

      await tx.projectMember.create({
        data: { projectId, userId: guest.id, organizationId: organization.id, role: "VIEWER" },
      });

      return { guest, organization };
    });

    await logAudit({
      userId: user.id,
      projectId,
      action: "GUEST_CONTACT_CREATED",
      entityType: "User",
      entityId: result.guest.id,
      metadata: { name: result.guest.name, organization: result.organization.name },
    });

    return NextResponse.json({
      userId: result.guest.id,
      name: result.guest.name,
      email: result.guest.email,
      organization: result.organization.name,
      accountType: "GUEST",
    });
  } catch (err) {
    console.error("POST /api/directory/guests failed:", err);
    return NextResponse.json({ error: "Failed to create the guest contact. Please try again." }, { status: 500 });
  }
}
