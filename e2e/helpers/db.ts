import { PrismaClient } from "@prisma/client";

/**
 * Read-only lookups against the same disposable test database the app
 * under test is running against (DATABASE_URL must point at it when
 * `playwright test` is invoked — see e2e/README.md). Used only to resolve
 * IDs for reference/config data that has no list API (e.g. MailType) — every
 * actual business action in a spec still goes through the real HTTP API or
 * real UI, never through this client.
 */
export const prisma = new PrismaClient();

export async function mailTypeId(name: string): Promise<string> {
  const type = await prisma.mailType.findFirstOrThrow({ where: { name } });
  return type.id;
}

export async function workflowOutcomeOptionLabel(label: string): Promise<string> {
  const option = await prisma.workflowOutcomeOption.findFirstOrThrow({ where: { label } });
  return option.label;
}

/** Read-only verification that a real AuditLog row exists for an entity —
 * proves the service layer actually recorded the action, not just that the
 * HTTP call returned 200. */
export async function auditLogActions(entityType: string, entityId: string): Promise<string[]> {
  const rows = await prisma.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "asc" },
    select: { action: true },
  });
  return rows.map((r) => r.action);
}
