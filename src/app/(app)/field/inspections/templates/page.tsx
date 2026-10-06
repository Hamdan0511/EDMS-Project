import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { buttonClass } from "@/components/ui/button";
import { FieldPageHeader } from "@/components/field/field-page-header";
import { ClipboardPen, Plus } from "@/components/ui/icons";

export default async function InspectionTemplatesPage() {
  const { user, membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }
  const projectId = membership.projectId;
  const canManage = await hasPermission(user.id, "FIELD_MANAGE_INSPECTION_TEMPLATES", { projectId });

  const templates = await prisma.fieldInspectionTemplate.findMany({
    where: { projectId, isActive: true },
    include: { _count: { select: { groups: true, inspections: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6">
      <FieldPageHeader
        title="Inspection Templates"
        description="Reusable checklists used to create quality inspection instances."
        action={
          canManage ? (
            <Link href="/field/inspections/templates/new" className={buttonClass("primary", "md")}>
              <Plus size={14} />
              New Template
            </Link>
          ) : undefined
        }
      />

      <div className="mt-4">
        {templates.length === 0 ? (
          <EmptyState
            icon={<ClipboardPen size={26} strokeWidth={1.25} />}
            title="No inspection templates have been created yet"
            description="Create a reusable checklist (e.g. Door Installation Inspection) to start running quality inspections."
            action={
              canManage ? (
                <Link href="/field/inspections/templates/new" className={buttonClass("primary", "md")}>
                  New Template
                </Link>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Description</Th>
                <Th>Groups</Th>
                <Th>Inspections Run</Th>
              </Tr>
            </Thead>
            <Tbody>
              {templates.map((t) => (
                <Tr key={t.id}>
                  <Td>
                    <Link href={`/field/inspections/templates/${t.id}`} className="font-medium text-brand-700 hover:underline">
                      {t.name}
                    </Link>
                  </Td>
                  <Td className="text-text-secondary">{t.description ?? "—"}</Td>
                  <Td className="text-text-secondary">{t._count.groups}</Td>
                  <Td className="text-text-secondary">{t._count.inspections}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
