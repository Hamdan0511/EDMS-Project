import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

/**
 * Creates the minimum needed to log in and see a non-empty shell:
 * one organization, one admin user, one project, one mail type.
 * This is dev bootstrap data, not business data — no mail/documents
 * are seeded, so the UI's empty states are exercised honestly.
 */
async function main() {
  const org = await prisma.organization.upsert({
    where: { id: "org-shanfari" },
    update: {},
    create: { id: "org-shanfari", name: "Shanfari Furnishing" },
  });

  const passwordHash = await hashPassword("ChangeMe123!");
  const admin = await prisma.user.upsert({
    where: { email: "admin@shanfari.local" },
    update: {},
    create: {
      email: "admin@shanfari.local",
      passwordHash,
      name: "Mohamed C.",
      jobTitle: "Document Controller",
      organizationId: org.id,
    },
  });

  const project = await prisma.project.upsert({
    where: { id: "project-cultural-complex" },
    update: {
      clientName: "Ministry of Culture, Sports and Youth",
      location: "Sultanate of Oman, Muscat, Oman",
    },
    create: {
      id: "project-cultural-complex",
      name: "Sayyid Tarik Bin Taimur Cultural Complex Project",
      shortName: "Cultural Complex",
      code: "2000006728",
      clientName: "Ministry of Culture, Sports and Youth",
      location: "Sultanate of Oman, Muscat, Oman",
      ownerOrgId: org.id,
    },
  });

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: admin.id } },
    update: {},
    create: {
      projectId: project.id,
      userId: admin.id,
      organizationId: org.id,
      role: "ADMIN",
    },
  });

  await prisma.mailType.upsert({
    where: { projectId_name: { projectId: project.id, name: "Letter" } },
    update: {},
    create: { projectId: project.id, name: "Letter" },
  });
  await prisma.mailType.upsert({
    where: { projectId_name: { projectId: project.id, name: "Transmittal" } },
    update: {},
    create: { projectId: project.id, name: "Transmittal" },
  });
  await prisma.mailType.upsert({
    where: { projectId_name: { projectId: project.id, name: "General Correspondence" } },
    update: {},
    create: { projectId: project.id, name: "General Correspondence" },
  });

  console.log("Seeded:", { org: org.name, admin: admin.email, project: project.name });
  console.log("Login with admin@shanfari.local / ChangeMe123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
