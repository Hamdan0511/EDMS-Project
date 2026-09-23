import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { buttonClass } from "@/components/ui/button";
import { ChevronLeft } from "@/components/ui/icons";
import { ReviewStepForm } from "@/components/workflows/review-step-form";
import { TerminateWorkflowButton } from "@/components/workflows/terminate-workflow-button";
import {
  WORKFLOW_STATUS_LABELS,
  WORKFLOW_STATUS_BADGE_CLASSES,
  WORKFLOW_STEP_STATUS_LABELS,
  WORKFLOW_STEP_STATUS_BADGE_CLASSES,
} from "@/lib/workflows/status";

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  const { id } = await params;

  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  const workflow = await prisma.workflow.findFirst({
    where: { id, projectId: membership.projectId },
    include: {
      initiatedBy: true,
      parentWorkflow: { select: { id: true, title: true } },
      subworkflows: { select: { id: true, title: true, status: true } },
      documents: {
        include: {
          document: { select: { id: true, documentNo: true, title: true, currentRevision: true } },
          documentVersion: { select: { revision: true } },
        },
      },
      steps: {
        orderBy: [{ groupNo: "asc" }, { name: "asc" }],
        include: { reviewers: { include: { user: true } } },
      },
      events: {
        orderBy: { createdAt: "desc" },
        include: { actor: true },
        take: 100,
      },
    },
  });
  if (!workflow) notFound();

  const outcomeOptions = await prisma.workflowOutcomeOption.findMany({
    where: { projectId: membership.projectId },
    orderBy: { sortOrder: "asc" },
  });

  const canManage = membership.role !== "VIEWER";
  const groupNos = Array.from(new Set(workflow.steps.map((s) => s.groupNo))).sort((a, b) => a - b);

  return (
    <div>
      <PageHeader
        title={`${workflow.workflowNumber} — ${workflow.title}`}
        actions={
          <>
            <Link href="/workflows" className={buttonClass("secondary", "md")}>
              <ChevronLeft size={14} />
              Back
            </Link>
            {canManage && workflow.status === "IN_PROGRESS" && <TerminateWorkflowButton workflowId={workflow.id} />}
          </>
        }
      />

      <div className="mx-auto w-full max-w-4xl p-6">
        <div className="rounded-[3px] border border-border bg-white">
          <SectionHeader>Details</SectionHeader>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
            <Row label="Workflow No." value={workflow.workflowNumber} />
            <Row label="Title" value={workflow.title} />
            <Row
              label="Status"
              value={
                <span className={`rounded-[3px] px-2 py-0.5 text-[11px] font-medium ${WORKFLOW_STATUS_BADGE_CLASSES[workflow.status]}`}>
                  {WORKFLOW_STATUS_LABELS[workflow.status]}
                </span>
              }
            />
            <Row label="Initiated By" value={workflow.initiatedBy.name} />
            <Row label="Started" value={workflow.createdAt.toLocaleString("en-GB")} />
            <Row label="Original Due Date" value={workflow.originalDueDate ? workflow.originalDueDate.toLocaleDateString("en-GB") : "—"} />
            <Row label="Final Outcome" value={workflow.finalOutcomeCode ?? "—"} />
            <Row label="Completed" value={workflow.completedAt ? workflow.completedAt.toLocaleString("en-GB") : "—"} />
            {workflow.terminatedReason && <Row label="Termination Reason" value={workflow.terminatedReason} full />}
            {workflow.parentWorkflow && (
              <Row
                label="Parent Workflow"
                value={
                  <Link href={`/workflows/${workflow.parentWorkflow.id}`} className="text-brand-700 hover:underline">
                    {workflow.parentWorkflow.title}
                  </Link>
                }
              />
            )}
          </div>

          <SectionHeader>Documents ({workflow.documents.length})</SectionHeader>
          <div className="p-4">
            <ul className="flex flex-col gap-1.5 text-[13px]">
              {workflow.documents.map((d) => (
                <li key={d.document.id} className="flex items-center justify-between">
                  <Link href={`/documents/${d.document.id}`} className="text-brand-700 hover:underline">
                    {d.document.documentNo} — {d.document.title}
                  </Link>
                  <span className="text-xs text-text-muted">
                    Rev at start: {d.documentVersion?.revision ?? "—"} · Current: {d.document.currentRevision}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <SectionHeader>Review Steps</SectionHeader>
          <div className="flex flex-col gap-4 p-4">
            {groupNos.map((groupNo, i) => (
              <div key={groupNo}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Group {i + 1}
                  {workflow.steps.filter((s) => s.groupNo === groupNo).length > 1 ? " (Parallel)" : ""}
                </p>
                <div className="flex flex-col gap-3">
                  {workflow.steps
                    .filter((s) => s.groupNo === groupNo)
                    .map((step) => {
                      const myReview = step.reviewers.find((r) => r.userId === user.id);
                      const canReview = step.status === "ACTIVE" && myReview && !myReview.reviewedAt;
                      return (
                        <div key={step.id} className="rounded-[3px] border border-border bg-white p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[13px] font-medium text-text-primary">{step.name}</span>
                            <span
                              className={`rounded-[3px] px-2 py-0.5 text-[11px] font-medium ${WORKFLOW_STEP_STATUS_BADGE_CLASSES[step.status]}`}
                            >
                              {WORKFLOW_STEP_STATUS_LABELS[step.status]}
                            </span>
                          </div>
                          {step.dueDate && (
                            <p className="mb-2 text-xs text-text-muted">
                              Due {step.dueDate.toLocaleDateString("en-GB")}
                              {step.dueDate.getTime() < Date.now() && step.status === "ACTIVE" && (
                                <span className="ml-1.5 font-medium text-red-700">Overdue</span>
                              )}
                            </p>
                          )}
                          <Table>
                            <Thead>
                              <Tr>
                                <Th>Reviewer</Th>
                                <Th>Outcome</Th>
                                <Th>Comments</Th>
                                <Th>Reviewed At</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {step.reviewers.map((r) => (
                                <Tr key={r.id}>
                                  <Td>{r.user.name}</Td>
                                  <Td>{r.outcomeCode ?? "—"}</Td>
                                  <Td className="text-text-secondary">{r.comments ?? "—"}</Td>
                                  <Td className="text-text-secondary">
                                    {r.reviewedAt ? r.reviewedAt.toLocaleString("en-GB") : "—"}
                                  </Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                          {canReview && (
                            <div className="mt-3">
                              <ReviewStepForm
                                workflowId={workflow.id}
                                stepId={step.id}
                                commentsRequired={step.commentsRequired}
                                outcomeOptions={outcomeOptions.map((o) => ({ code: o.code, label: o.label }))}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>

          {workflow.subworkflows.length > 0 && (
            <>
              <SectionHeader>Subworkflows</SectionHeader>
              <div className="p-4">
                <ul className="flex flex-col gap-1.5 text-[13px]">
                  {workflow.subworkflows.map((sw) => (
                    <li key={sw.id}>
                      <Link href={`/workflows/${sw.id}`} className="text-brand-700 hover:underline">
                        {sw.title}
                      </Link>{" "}
                      <span className="text-xs text-text-muted">({WORKFLOW_STATUS_LABELS[sw.status]})</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <SectionHeader>Event Log</SectionHeader>
          <div className="p-4">
            {workflow.events.length === 0 ? (
              <p className="text-[13px] text-text-muted">No events yet.</p>
            ) : (
              <ul className="flex flex-col gap-1.5 text-[13px]">
                {workflow.events.map((e) => (
                  <li key={e.id} className="flex items-center justify-between">
                    <span className="text-text-primary">{e.action.replaceAll("_", " ")}</span>
                    <span className="text-xs text-text-muted">
                      {e.actor?.name ?? "System"} · {e.createdAt.toLocaleString("en-GB")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, full }: { label: string; value: React.ReactNode; full?: boolean }) {
  return (
    <div className={`flex gap-2 ${full ? "col-span-2" : ""}`}>
      <span className="w-40 shrink-0 text-text-muted">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
