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
  await prisma.mailType.upsert({
    where: { projectId_name: { projectId: project.id, name: "Request for Information" } },
    update: {},
    create: { projectId: project.id, name: "Request for Information" },
  });

  // Document/Drawing classification configuration — project reference
  // metadata (not business data), matching the MailType bootstrap above.
  const drawingTypes = [
    "Design Drawing",
    "Material Approval Request",
    "Material Inspection Request",
    "Method Statement",
    "Minutes of Meeting",
    "Mock-up",
    "Plan",
    "Shop Drawing",
  ];
  for (const name of drawingTypes) {
    await prisma.documentType.upsert({
      where: { projectId_name: { projectId: project.id, name } },
      update: { isDrawingType: true },
      create: { projectId: project.id, name, isDrawingType: true },
    });
  }

  const metadataOptions: { category: "DISCIPLINE" | "FUNCTIONAL_BREAKDOWN" | "SPATIAL_BREAKDOWN"; name: string }[] = [
    { category: "DISCIPLINE", name: "Interior Design" },
    { category: "DISCIPLINE", name: "Multiple Disciplines" },
    { category: "DISCIPLINE", name: "Other Discipline" },
    { category: "FUNCTIONAL_BREAKDOWN", name: "CP-Central Plaza" },
    { category: "FUNCTIONAL_BREAKDOWN", name: "F1-Facilities 1" },
    { category: "FUNCTIONAL_BREAKDOWN", name: "F2-Facilities 2" },
    { category: "FUNCTIONAL_BREAKDOWN", name: "F3-Facilities 3" },
    { category: "FUNCTIONAL_BREAKDOWN", name: "F4-Facilities 4" },
    { category: "FUNCTIONAL_BREAKDOWN", name: "MA-Main Contractor" },
    { category: "FUNCTIONAL_BREAKDOWN", name: "NA-National Archives" },
    { category: "FUNCTIONAL_BREAKDOWN", name: "NL-National Library" },
    { category: "SPATIAL_BREAKDOWN", name: "00-Ground Floor_Plaza Level" },
    { category: "SPATIAL_BREAKDOWN", name: "01-Level 01" },
    { category: "SPATIAL_BREAKDOWN", name: "02-Level 02" },
    { category: "SPATIAL_BREAKDOWN", name: "03-Level 03" },
    { category: "SPATIAL_BREAKDOWN", name: "04-Level 04" },
    { category: "SPATIAL_BREAKDOWN", name: "B1-Basement_Garden Level" },
    { category: "SPATIAL_BREAKDOWN", name: "MS-Multiple Spatial Subdivisions" },
    { category: "SPATIAL_BREAKDOWN", name: "NS-No Spatial Subdivision" },
  ];
  for (const opt of metadataOptions) {
    await prisma.documentMetadataOption.upsert({
      where: { projectId_category_name: { projectId: project.id, category: opt.category, name: opt.name } },
      update: {},
      create: { projectId: project.id, category: opt.category, name: opt.name },
    });
  }

  // Real, project-configurable workflow review outcomes (Aconex-style A/B/C/D
  // review status set) — master data, never hard-coded in application code.
  const workflowOutcomeOptions: { code: string; label: string; severityRank: number; isRejection: boolean }[] = [
    { code: "A", label: "A - No Objection", severityRank: 1, isRejection: false },
    { code: "B", label: "B - No Objection With Comments", severityRank: 2, isRejection: false },
    { code: "C", label: "C - Correction, Revise & Resubmit", severityRank: 3, isRejection: true },
    { code: "D", label: "D - Rejected", severityRank: 4, isRejection: true },
  ];
  for (const opt of workflowOutcomeOptions) {
    await prisma.workflowOutcomeOption.upsert({
      where: { projectId_code: { projectId: project.id, code: opt.code } },
      update: {},
      create: { projectId: project.id, ...opt, createdById: admin.id },
    });
  }

  // ---------------------------------------------------------------------
  // RBAC — real permission catalogue, system roles, and a backfill of every
  // existing ProjectMember into the equivalent new role assignment. Only
  // permissions that are actually enforced by real code are seeded here
  // (Directory/Mailing-Group/RBAC-admin, and — as of this hardening phase —
  // Documents/Mail/Workflow mutations previously gated only by the legacy
  // requireProjectRole(["ADMIN","MEMBER"]) check) — no placeholder checkboxes.
  // ---------------------------------------------------------------------
  const permissions: { code: string; description: string; category: string }[] = [
    { code: "DIRECTORY_VIEW", description: "View the project Directory", category: "Directory" },
    { code: "DIRECTORY_SEARCH", description: "Search the project/global Directory", category: "Directory" },
    { code: "DIRECTORY_CREATE_USER", description: "Create a new full user account", category: "Directory" },
    { code: "DIRECTORY_EDIT_USER", description: "Edit a Directory user's details", category: "Directory" },
    { code: "DIRECTORY_CREATE_GUEST", description: "Create a guest contact", category: "Directory" },
    { code: "DIRECTORY_INVITE_USER", description: "Invite an existing user onto the project", category: "Directory" },
    { code: "DIRECTORY_CREATE_GROUP", description: "Create a mailing group", category: "Directory" },
    { code: "DIRECTORY_EDIT_GROUP", description: "Edit a mailing group's name/lock state", category: "Directory" },
    { code: "DIRECTORY_MANAGE_GROUP_MEMBERS", description: "Add or remove mailing group members", category: "Directory" },
    { code: "ADMIN_ROLES", description: "Manage roles and the permission matrix", category: "Administration" },
    // Documents
    { code: "DOCUMENT_CREATE", description: "Create documents, placeholders, and register temporary files", category: "Documents" },
    { code: "DOCUMENT_UPDATE", description: "Edit document metadata, add revisions, bulk-update, and manage metadata options", category: "Documents" },
    { code: "DOCUMENT_DELETE", description: "Delete documents and temporary files", category: "Documents" },
    // Mail
    { code: "MAIL_SEND", description: "Create and send mail, register incoming mail, and issue transmittals", category: "Mail" },
    { code: "MAIL_CLOSE_OUT", description: "Change a mail's workflow status (Closed-Out / No Action Required)", category: "Mail" },
    { code: "MAIL_MANAGE_SETTINGS", description: "Manage auto-text, signatures/inline images, and mail type attribute options", category: "Mail" },
    { code: "MAIL_EXPORT", description: "Export the Mail register to Excel", category: "Mail" },
    // Workflows
    { code: "WORKFLOW_CREATE", description: "Start a workflow on selected documents", category: "Workflows" },
    { code: "WORKFLOW_TERMINATE", description: "Terminate an in-progress workflow", category: "Workflows" },
    { code: "WORKFLOW_TEMPLATE_MANAGE", description: "Create workflow templates and change their status", category: "Workflows" },
    // Health & Safety
    { code: "HSE_VIEW", description: "View Health & Safety registers and the dashboard", category: "Health & Safety" },
    { code: "HSE_REPORT", description: "Report a hazard, incident, near miss, or observation", category: "Health & Safety" },
    { code: "HSE_MANAGE_OBSERVATIONS", description: "Edit and close observations", category: "Health & Safety" },
    { code: "HSE_MANAGE_INCIDENTS", description: "Manage incident investigation and status", category: "Health & Safety" },
    { code: "HSE_MANAGE_NEAR_MISSES", description: "Manage near misses", category: "Health & Safety" },
    { code: "HSE_MANAGE_HAZARDS", description: "Manage the hazard register and controls", category: "Health & Safety" },
    { code: "HSE_MANAGE_RISK_ASSESSMENTS", description: "Create and manage risk assessments", category: "Health & Safety" },
    { code: "HSE_MANAGE_INSPECTIONS", description: "Schedule and complete inspections", category: "Health & Safety" },
    { code: "HSE_MANAGE_ACTIONS", description: "Assign, update, and verify corrective actions", category: "Health & Safety" },
    { code: "HSE_MANAGE_PERMITS", description: "Create, approve, and manage permits to work", category: "Health & Safety" },
    { code: "HSE_EXPORT_REPORTS", description: "Export Health & Safety reports", category: "Health & Safety" },
    { code: "HSE_MANAGE_EQUIPMENT", description: "Manage the equipment register, perform inspections, and reinspect out-of-service equipment", category: "Health & Safety" },
    { code: "HSE_MANAGE_EMERGENCY", description: "Manage emergency contacts, procedures, events, and drills", category: "Health & Safety" },
    { code: "FIELD_VIEW", description: "View Field registers and the Field landing page", category: "Field" },
    { code: "FIELD_MANAGE_OBSERVATIONS", description: "Create and manage site observations", category: "Field" },
    { code: "FIELD_MANAGE_INSPECTIONS", description: "Schedule, perform, and submit quality inspections", category: "Field" },
    { code: "FIELD_MANAGE_INSPECTION_TEMPLATES", description: "Create and manage inspection checklist templates", category: "Field" },
    { code: "FIELD_MANAGE_ISSUES", description: "Create, assign, and update site issues", category: "Field" },
    { code: "FIELD_ISSUE_VERIFY", description: "Independently verify completed site issues", category: "Field" },
    { code: "FIELD_MANAGE_PUNCH", description: "Create and manage punchlists and punch items", category: "Field" },
    { code: "FIELD_MANAGE_ITP", description: "Create and manage ITPs and hold points", category: "Field" },
    { code: "FIELD_ITP_APPROVE", description: "Approve or reject hold points and release work", category: "Field" },
    { code: "FIELD_MANAGE_TESTS", description: "Record tests and retests", category: "Field" },
    { code: "FIELD_TEST_APPROVE", description: "Approve test results", category: "Field" },
    { code: "FIELD_MANAGE_PHOTOS", description: "Upload and manage site photos and evidence", category: "Field" },
    { code: "FIELD_EXPORT_REPORTS", description: "Export Field reports", category: "Field" },
    // Management System
    { code: "MANAGEMENT_SYSTEM_VIEW", description: "View the Management System document register and certificates", category: "Management System" },
    { code: "MANAGEMENT_SYSTEM_DOWNLOAD", description: "Download Management System controlled documents and certificates", category: "Management System" },
    { code: "MANAGEMENT_SYSTEM_MANAGE", description: "Upload, replace versions, and manage Management System document metadata", category: "Management System" },
  ];
  const permissionRows = new Map<string, { id: string }>();
  for (const perm of permissions) {
    const row = await prisma.permission.upsert({
      where: { code: perm.code },
      update: { description: perm.description, category: perm.category },
      create: perm,
    });
    permissionRows.set(perm.code, row);
  }

  const systemRoles: { name: string; description: string; permissionCodes: string[] }[] = [
    {
      name: "Project Administrator",
      description: "Full Directory and RBAC administration on this project — maps from the legacy ADMIN role.",
      permissionCodes: permissions.map((p) => p.code),
    },
    {
      name: "Project Member",
      description:
        "Can search the Directory, create guest contacts, invite users, and manage Documents/Mail/Workflows — maps from the legacy MEMBER role, which held identical mutation rights to ADMIN on every existing gated route.",
      permissionCodes: [
        "DIRECTORY_VIEW",
        "DIRECTORY_SEARCH",
        "DIRECTORY_CREATE_GUEST",
        "DIRECTORY_INVITE_USER",
        "DOCUMENT_CREATE",
        "DOCUMENT_UPDATE",
        "DOCUMENT_DELETE",
        "MAIL_SEND",
        "MAIL_CLOSE_OUT",
        "MAIL_MANAGE_SETTINGS",
        "MAIL_EXPORT",
        "WORKFLOW_CREATE",
        "WORKFLOW_TERMINATE",
        "WORKFLOW_TEMPLATE_MANAGE",
        "HSE_VIEW",
        "HSE_REPORT",
        "HSE_MANAGE_OBSERVATIONS",
        "HSE_MANAGE_INCIDENTS",
        "HSE_MANAGE_NEAR_MISSES",
        "HSE_MANAGE_HAZARDS",
        "HSE_MANAGE_RISK_ASSESSMENTS",
        "HSE_MANAGE_INSPECTIONS",
        "HSE_MANAGE_ACTIONS",
        "HSE_MANAGE_PERMITS",
        "HSE_EXPORT_REPORTS",
        "HSE_MANAGE_EQUIPMENT",
        "HSE_MANAGE_EMERGENCY",
        "FIELD_VIEW",
        "FIELD_MANAGE_OBSERVATIONS",
        "FIELD_MANAGE_INSPECTIONS",
        "FIELD_MANAGE_INSPECTION_TEMPLATES",
        "FIELD_MANAGE_ISSUES",
        "FIELD_ISSUE_VERIFY",
        "FIELD_MANAGE_PUNCH",
        "FIELD_MANAGE_ITP",
        "FIELD_ITP_APPROVE",
        "FIELD_MANAGE_TESTS",
        "FIELD_TEST_APPROVE",
        "FIELD_MANAGE_PHOTOS",
        "FIELD_EXPORT_REPORTS",
        "MANAGEMENT_SYSTEM_VIEW",
        "MANAGEMENT_SYSTEM_DOWNLOAD",
        "MANAGEMENT_SYSTEM_MANAGE",
      ],
    },
    {
      name: "Project Viewer",
      description: "Read-only Directory access — maps from the legacy VIEWER role.",
      permissionCodes: ["DIRECTORY_VIEW", "DIRECTORY_SEARCH", "HSE_VIEW", "FIELD_VIEW", "MANAGEMENT_SYSTEM_VIEW"],
    },
  ];
  const roleRows = new Map<string, { id: string }>();
  for (const roleDef of systemRoles) {
    const role = await prisma.role.upsert({
      where: { name_scope: { name: roleDef.name, scope: "PROJECT" } },
      update: { description: roleDef.description, isSystem: true },
      create: { name: roleDef.name, description: roleDef.description, scope: "PROJECT", isSystem: true },
    });
    roleRows.set(roleDef.name, role);
    for (const code of roleDef.permissionCodes) {
      const permission = permissionRows.get(code)!;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  const roleForLegacy: Record<string, string> = {
    ADMIN: "Project Administrator",
    MEMBER: "Project Member",
    VIEWER: "Project Viewer",
  };
  const allMembers = await prisma.projectMember.findMany({ select: { userId: true, projectId: true, role: true } });
  for (const m of allMembers) {
    const role = roleRows.get(roleForLegacy[m.role]);
    if (!role) continue;
    const existing = await prisma.userRoleAssignment.findFirst({
      where: { userId: m.userId, roleId: role.id, projectId: m.projectId, organizationId: null },
    });
    if (!existing) {
      await prisma.userRoleAssignment.create({ data: { userId: m.userId, roleId: role.id, projectId: m.projectId } });
    }
  }

  // ---------------------------------------------------------------------
  // A real, usable starting Inspection template — reference configuration
  // (like the MailType/DocumentType bootstrap above), not business data.
  // ---------------------------------------------------------------------
  const inspectionTemplate = await prisma.hseInspectionTemplate.upsert({
    where: { projectId_name: { projectId: project.id, name: "General Site Safety Inspection" } },
    update: {},
    create: {
      projectId: project.id,
      name: "General Site Safety Inspection",
      description: "A general-purpose walkthrough checklist covering housekeeping, PPE, and access.",
      createdById: admin.id,
    },
  });
  const inspectionQuestions: { section: string; text: string; type: "YES_NO" | "PASS_FAIL" | "TEXT"; sortOrder: number }[] = [
    { section: "Housekeeping", text: "Are walkways and access routes clear of obstructions?", type: "YES_NO", sortOrder: 1 },
    { section: "Housekeeping", text: "Is waste being segregated and stored correctly?", type: "YES_NO", sortOrder: 2 },
    { section: "PPE", text: "Are workers wearing the required PPE for the task?", type: "YES_NO", sortOrder: 3 },
    { section: "PPE", text: "Is PPE in good, usable condition?", type: "PASS_FAIL", sortOrder: 4 },
    { section: "Access & Egress", text: "Are emergency exits and access routes unobstructed?", type: "YES_NO", sortOrder: 5 },
    { section: "General", text: "Additional observations", type: "TEXT", sortOrder: 6 },
  ];
  for (const q of inspectionQuestions) {
    const existing = await prisma.hseInspectionQuestion.findFirst({
      where: { templateId: inspectionTemplate.id, sortOrder: q.sortOrder },
    });
    if (!existing) {
      await prisma.hseInspectionQuestion.create({
        data: { templateId: inspectionTemplate.id, section: q.section, text: q.text, type: q.type, sortOrder: q.sortOrder },
      });
    }
  }

  console.log("Seeded:", { org: org.name, admin: admin.email, project: project.name });
  console.log("RBAC backfill:", { permissions: permissions.length, roles: systemRoles.length, assignments: allMembers.length });
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
