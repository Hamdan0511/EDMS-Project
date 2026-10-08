import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

/**
 * Extra, deterministic, idempotent fixture users needed only by the E2E
 * suite — e.g. to prove a Viewer gets 403'd, or that an issue's responsible
 * person cannot verify their own work. Kept separate from prisma/seed.ts so
 * the normal dev-bootstrap seed's contract never changes for this reason.
 * Must be run AFTER prisma/seed.ts (it depends on the project, org, and the
 * "Project Member"/"Project Viewer" roles that script creates).
 */
async function main() {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: "org-shanfari" } });
  const project = await prisma.project.findUniqueOrThrow({ where: { id: "project-cultural-complex" } });
  const passwordHash = await hashPassword("ChangeMe123!");

  const users = [
    { email: "e2e-member@shanfari.local", name: "E2E Member", legacyRole: "MEMBER" as const, roleName: "Project Member" },
    { email: "e2e-viewer@shanfari.local", name: "E2E Viewer", legacyRole: "VIEWER" as const, roleName: "Project Viewer" },
    { email: "e2e-verifier@shanfari.local", name: "E2E Verifier", legacyRole: "MEMBER" as const, roleName: "Project Member" },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, passwordHash, name: u.name, organizationId: org.id },
    });

    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: user.id } },
      update: {},
      create: { projectId: project.id, userId: user.id, organizationId: org.id, role: u.legacyRole },
    });

    const role = await prisma.role.findUniqueOrThrow({ where: { name_scope: { name: u.roleName, scope: "PROJECT" } } });
    const existingAssignment = await prisma.userRoleAssignment.findFirst({
      where: { userId: user.id, roleId: role.id, projectId: project.id },
    });
    if (!existingAssignment) {
      await prisma.userRoleAssignment.create({ data: { userId: user.id, roleId: role.id, projectId: project.id } });
    }
  }

  console.log(
    "E2E fixture users ready:",
    users.map((u) => u.email),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
