import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { SearchWorkflowsForm } from "@/components/workflows/search-workflows-form";
import {
  buildWorkflowSearchWhere,
  buildOrderBy,
  parsePage,
  parsePageSize,
  parseSort,
  parseGroupBy,
  parseDateField,
  type WorkflowSearchParams,
} from "@/lib/workflows/search";
import { WORKFLOW_STATUS_LABELS, WORKFLOW_STATUS_BADGE_CLASSES } from "@/lib/workflows/status";

export default async function WorkflowsPage({
  searchParams,
}: {
  searchParams: Promise<WorkflowSearchParams>;
}) {
  const { user, membership } = await requirePageContext();
  const params = await searchParams;

  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  const projectId = membership.projectId;

  const [templates, outcomeOptions] = await Promise.all([
    prisma.workflowTemplate.findMany({ where: { projectId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.workflowOutcomeOption.findMany({ where: { projectId }, orderBy: { sortOrder: "asc" }, select: { code: true, label: true } }),
  ]);

  const searched = params.searched === "1";
  const page = parsePage(params.page);
  const pageSize = parsePageSize(params.pageSize);
  const sort = parseSort(params.sort);
  const groupBy = parseGroupBy(params.groupBy);

  const buildHref = (targetPage: number): string => {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "page") sp.set(key, String(value));
    }
    sp.set("page", String(targetPage));
    return `/workflows?${sp.toString()}`;
  };

  return (
    <div>
      <PageHeader title="Workflows" />
      <div className="p-6">
        <SearchWorkflowsForm
          projectId={projectId}
          templates={templates}
          outcomeOptions={outcomeOptions}
          initial={{
            workflowStatus: params.workflowStatus ?? "",
            templateId: params.templateId ?? "",
            workflowNo: params.workflowNo ?? "",
            initiator: params.initiator ?? "",
            workflowName: params.workflowName ?? "",
            dateField: parseDateField(params.dateField),
            dateFrom: params.dateFrom ?? "",
            dateTo: params.dateTo ?? "",
            superSearch: params.superSearch ?? "",
            stepStatus: params.stepStatus ?? "",
            stepOutcome: params.stepOutcome ?? "",
            documentNo: params.documentNo ?? "",
            assignedTo: params.assignedTo ?? "",
            myTasksOnly: params.myTasksOnly === "1",
            groupBy,
            sort,
            pageSize: String(pageSize),
          }}
        />

        <div className="mt-4">
          {!searched ? (
            <div className="rounded-[3px] border border-border bg-white px-4 py-10 text-center text-[13px] text-text-muted">
              Enter search criteria above, then click the Search button.
              <br />
              Add search criteria to refine the results until you find what you&apos;re looking for.
            </div>
          ) : (
            <WorkflowResults
              projectId={projectId}
              userId={user.id}
              params={params}
              page={page}
              pageSize={pageSize}
              sort={sort}
              groupBy={groupBy}
              buildHref={buildHref}
            />
          )}
        </div>
      </div>
    </div>
  );
}

async function WorkflowResults({
  projectId,
  userId,
  params,
  page,
  pageSize,
  sort,
  groupBy,
  buildHref,
}: {
  projectId: string;
  userId: string;
  params: WorkflowSearchParams;
  page: number;
  pageSize: number;
  sort: ReturnType<typeof parseSort>;
  groupBy: ReturnType<typeof parseGroupBy>;
  buildHref: (page: number) => string;
}) {
  const where = buildWorkflowSearchWhere({ projectId, userId, search: params });
  const orderBy = buildOrderBy(sort);

  const [workflows, total] = await Promise.all([
    prisma.workflow.findMany({
      where,
      include: {
        initiatedBy: true,
        template: { select: { name: true } },
        documents: { include: { document: { select: { id: true, documentNo: true } } } },
        steps: { where: { status: "ACTIVE" }, include: { reviewers: { include: { user: true } } } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.workflow.count({ where }),
  ]);

  if (workflows.length === 0) {
    return (
      <EmptyState
        title="No matching results"
        description="Please try again with different search criteria."
      />
    );
  }

  function groupKeyOf(w: (typeof workflows)[number]): string {
    if (groupBy === "status") return WORKFLOW_STATUS_LABELS[w.status];
    if (groupBy === "template") return w.template?.name ?? "(No Template)";
    if (groupBy === "workflowNo") return w.workflowNumber;
    return "";
  }

  const groups: { key: string; rows: typeof workflows }[] = [];
  if (groupBy === "none") {
    groups.push({ key: "", rows: workflows });
  } else {
    for (const w of workflows) {
      const key = groupKeyOf(w);
      const existing = groups.find((g) => g.key === key);
      if (existing) existing.rows.push(w);
      else groups.push({ key, rows: [w] });
    }
  }

  return (
    <div className="rounded-[3px] border border-border bg-white">
      {groups.map((group) => (
        <div key={group.key || "all"}>
          {groupBy !== "none" && (
            <div className="border-b border-border bg-background px-4 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-text-muted">
              {group.key} ({group.rows.length})
            </div>
          )}
          <Table>
            <Thead>
              <Tr>
                <Th>Workflow No.</Th>
                <Th>Workflow Name</Th>
                <Th>Template</Th>
                <Th>Status</Th>
                <Th>Documents</Th>
                <Th>Current Step(s)</Th>
                <Th>Initiator</Th>
                <Th>Date In</Th>
                <Th>Date Due</Th>
              </Tr>
            </Thead>
            <Tbody>
              {group.rows.map((w) => {
                const overdue = w.steps.some((s) => s.dueDate && s.dueDate.getTime() < Date.now());
                return (
                  <Tr key={w.id}>
                    <Td>
                      <Link href={`/workflows/${w.id}`} className="font-medium text-brand-700 hover:underline">
                        {w.workflowNumber}
                      </Link>
                    </Td>
                    <Td className="text-text-secondary">{w.title}</Td>
                    <Td className="text-text-secondary">{w.template?.name ?? "—"}</Td>
                    <Td>
                      <span className={`rounded-[3px] px-2 py-0.5 text-[11px] font-medium ${WORKFLOW_STATUS_BADGE_CLASSES[w.status]}`}>
                        {WORKFLOW_STATUS_LABELS[w.status]}
                      </span>
                      {overdue && (
                        <span className="ml-1.5 rounded-[3px] bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-800">
                          Overdue
                        </span>
                      )}
                    </Td>
                    <Td className="text-text-secondary">{w.documents.map((d) => d.document.documentNo).join(", ") || "—"}</Td>
                    <Td className="text-text-secondary">
                      {w.steps.length > 0 ? w.steps.map((s) => `${s.name} (${s.reviewers.map((r) => r.user.name).join(", ")})`).join("  •  ") : "—"}
                    </Td>
                    <Td className="text-text-secondary">{w.initiatedBy.name}</Td>
                    <Td className="text-text-secondary">{w.createdAt.toLocaleDateString("en-GB")}</Td>
                    <Td className="text-text-secondary">
                      {w.steps[0]?.dueDate ? w.steps[0].dueDate.toLocaleDateString("en-GB") : "—"}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </div>
      ))}
      <div className="border-t border-border px-4 py-2">
        <Pagination page={page} pageSize={pageSize} total={total} buildHref={buildHref} />
      </div>
    </div>
  );
}
