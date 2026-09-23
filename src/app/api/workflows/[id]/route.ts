import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const workflow = await prisma.workflow.findUnique({ where: { id }, select: { projectId: true } });
  if (!workflow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, workflow.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const full = await prisma.workflow.findUnique({
    where: { id },
    include: {
      initiatedBy: true,
      template: { select: { id: true, name: true } },
      parentWorkflow: { select: { id: true, title: true } },
      subworkflows: { select: { id: true, title: true, status: true } },
      documents: {
        include: {
          document: { select: { id: true, documentNo: true, title: true, currentRevision: true } },
          documentVersion: { select: { id: true, revision: true } },
        },
      },
      steps: {
        orderBy: [{ groupNo: "asc" }, { name: "asc" }],
        include: { reviewers: { include: { user: true } } },
      },
      events: {
        orderBy: { createdAt: "desc" },
        include: { actor: true },
      },
    },
  });
  if (!full) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: full.id,
    title: full.title,
    status: full.status,
    outcomeRule: full.outcomeRule,
    finalOutcomeCode: full.finalOutcomeCode,
    terminatedReason: full.terminatedReason,
    initiatedByName: full.initiatedBy.name,
    templateName: full.template?.name ?? null,
    parentWorkflow: full.parentWorkflow,
    subworkflows: full.subworkflows,
    createdAt: full.createdAt.toISOString(),
    completedAt: full.completedAt?.toISOString() ?? null,
    documents: full.documents.map((d) => ({
      id: d.document.id,
      documentNo: d.document.documentNo,
      title: d.document.title,
      currentRevision: d.document.currentRevision,
      revisionAtStart: d.documentVersion?.revision ?? null,
    })),
    steps: full.steps.map((s) => ({
      id: s.id,
      name: s.name,
      groupNo: s.groupNo,
      status: s.status,
      completionRule: s.completionRule,
      commentsRequired: s.commentsRequired,
      outcomeCode: s.outcomeCode,
      dueDate: s.dueDate?.toISOString() ?? null,
      startedAt: s.startedAt?.toISOString() ?? null,
      completedAt: s.completedAt?.toISOString() ?? null,
      reviewers: s.reviewers.map((r) => ({
        userId: r.userId,
        name: r.user.name,
        outcomeCode: r.outcomeCode,
        comments: r.comments,
        reviewedAt: r.reviewedAt?.toISOString() ?? null,
        canReview: r.userId === user.id && s.status === "ACTIVE" && !r.reviewedAt,
      })),
    })),
    events: full.events.map((e) => ({
      id: e.id,
      action: e.action,
      actorName: e.actor?.name ?? null,
      metadata: e.metadata,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}
