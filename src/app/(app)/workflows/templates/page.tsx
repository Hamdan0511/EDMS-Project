import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { buttonClass } from "@/components/ui/button";
import { ChevronLeft, ListChecks, Plus } from "@/components/ui/icons";
import { TemplateStatusButton } from "@/components/workflows/template-status-button";
import type { WorkflowTemplateStatus } from "@prisma/client";

const TABS: { key: WorkflowTemplateStatus; label: string }[] = [
  { key: "ACTIVE", label: "Active" },
  { key: "DRAFT", label: "Draft" },
  { key: "INACTIVE", label: "Inactive" },
];

export default async function WorkflowTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { membership } = await requirePageContext();
  const params = await searchParams;

  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  const status: WorkflowTemplateStatus = TABS.some((t) => t.key === params.status)
    ? (params.status as WorkflowTemplateStatus)
    : "ACTIVE";
  const canManage = membership.role !== "VIEWER";

  const templates = await prisma.workflowTemplate.findMany({
    where: { projectId: membership.projectId, status },
    include: {
      createdBy: true,
      steps: { include: { reviewers: { include: { user: true } } }, orderBy: { groupNo: "asc" } },
      _count: { select: { workflows: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Workflow Templates"
        actions={
          <>
            <Link href="/workflows" className={buttonClass("secondary", "md")}>
              <ChevronLeft size={14} />
              Back to Workflows
            </Link>
            {canManage && (
              <Link href="/workflows/templates/new" className={buttonClass("primary", "md")}>
                <Plus size={14} />
                New Template
              </Link>
            )}
          </>
        }
      />
      <div className="flex gap-1 border-b border-border px-6">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/workflows/templates?status=${t.key}`}
            className={[
              "border-b-2 px-3 py-2.5 text-[13px] font-medium",
              status === t.key
                ? "border-brand-700 text-text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div className="p-6">
        {templates.length === 0 ? (
          <EmptyState
            icon={<ListChecks size={28} strokeWidth={1.25} />}
            title="No templates found"
            description="Workflow templates matching this view will appear here."
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Outcome Rule</Th>
                <Th>Steps</Th>
                <Th>Used By</Th>
                <Th>Created By</Th>
                {canManage && <Th>Actions</Th>}
              </Tr>
            </Thead>
            <Tbody>
              {templates.map((t) => (
                <Tr key={t.id}>
                  <Td className="font-medium text-text-primary">{t.name}</Td>
                  <Td className="text-text-secondary">{t.outcomeRule.replaceAll("_", " ")}</Td>
                  <Td className="text-text-secondary">
                    {t.steps.map((s) => `${s.name} (${s.reviewers.map((r) => r.user.name).join(", ")})`).join("  •  ")}
                  </Td>
                  <Td className="text-text-secondary">{t._count.workflows} workflow(s)</Td>
                  <Td className="text-text-secondary">{t.createdBy.name}</Td>
                  {canManage && (
                    <Td>
                      <TemplateStatusButton templateId={t.id} status={t.status} />
                    </Td>
                  )}
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
