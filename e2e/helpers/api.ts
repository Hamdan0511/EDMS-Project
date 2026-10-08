import { APIRequestContext, request as playwrightRequest } from "@playwright/test";
import { readFileSync } from "fs";
import { BASE_URL, PROJECT_ID, USERS } from "../constants";

export type RoleName = keyof typeof USERS;

/** A fresh, pre-authenticated APIRequestContext for fast setup/teardown calls — no browser needed. */
export async function apiContextFor(role: RoleName): Promise<APIRequestContext> {
  const user = USERS[role];
  const storageState = JSON.parse(readFileSync(user.storageState, "utf8"));
  return playwrightRequest.newContext({ baseURL: BASE_URL, storageState });
}

async function json<T>(res: { ok(): boolean; status(): number; json(): Promise<unknown>; url(): string }): Promise<T> {
  if (!res.ok()) {
    throw new Error(`Request to ${res.url()} failed: ${res.status()} ${JSON.stringify(await res.json().catch(() => null))}`);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------

export async function createTemporaryFile(
  api: APIRequestContext,
  opts: { fileName: string; mimeType: string; buffer: Buffer },
): Promise<{ id: string; originalFileName: string }> {
  const res = await api.post("/api/temporary-files", {
    multipart: {
      projectId: PROJECT_ID,
      file: { name: opts.fileName, mimeType: opts.mimeType, buffer: opts.buffer },
    },
  });
  return json(res);
}

export async function registerDocument(
  api: APIRequestContext,
  opts: { temporaryFileId: string; documentNo: string; title: string; revision?: string },
): Promise<{ id: string; documentNo: string }> {
  const res = await api.post(`/api/temporary-files/${opts.temporaryFileId}/register`, {
    data: { documentNo: opts.documentNo, title: opts.title, revision: opts.revision ?? "A" },
  });
  return json(res);
}

// ---------------------------------------------------------------------
// Directory
// ---------------------------------------------------------------------

export async function searchDirectory(
  api: APIRequestContext,
  q: string,
): Promise<{ kind: string; userId?: string; email?: string; name?: string }[]> {
  const res = await api.get(`/api/directory/search?projectId=${PROJECT_ID}&q=${encodeURIComponent(q)}`);
  return json(res);
}

export async function getUserId(api: APIRequestContext, email: string): Promise<string> {
  const results = await searchDirectory(api, email);
  const match = results.find((r) => r.kind === "user" && r.email === email);
  if (!match?.userId) throw new Error(`No directory member found for ${email}`);
  return match.userId;
}

// ---------------------------------------------------------------------
// Mail
// ---------------------------------------------------------------------

export async function sendMail(
  api: APIRequestContext,
  opts: {
    typeId: string;
    subject: string;
    messageHtml: string;
    toUserIds: string[];
    action?: "draft" | "send";
    parentMailId?: string;
  },
): Promise<{ id: string; mailNumber: string; status: string }> {
  const res = await api.post("/api/mail", {
    multipart: {
      projectId: PROJECT_ID,
      action: opts.action ?? "send",
      typeId: opts.typeId,
      subject: opts.subject,
      messageHtml: opts.messageHtml,
      toUserIds: JSON.stringify(opts.toUserIds),
      ccUserIds: JSON.stringify([]),
      removeAttachmentIds: JSON.stringify([]),
      forwardAttachmentIds: JSON.stringify([]),
      ...(opts.parentMailId ? { parentMailId: opts.parentMailId } : {}),
    },
  });
  return json(res);
}

// ---------------------------------------------------------------------
// Workflows
// ---------------------------------------------------------------------

export async function createWorkflowTemplate(
  api: APIRequestContext,
  opts: { name: string; reviewerUserId: string },
): Promise<{ id: string }> {
  const res = await api.post("/api/workflow-templates", {
    data: {
      projectId: PROJECT_ID,
      name: opts.name,
      outcomeRule: "FINAL_STEP_OUTCOME",
      steps: [
        {
          name: "Review",
          groupNo: 1,
          durationDays: 5,
          completionRule: "ALL_REVIEWERS",
          commentsRequired: false,
          reviewerUserIds: [opts.reviewerUserId],
        },
      ],
    },
  });
  return json(res);
}

export async function activateWorkflowTemplate(api: APIRequestContext, templateId: string): Promise<void> {
  const res = await api.patch(`/api/workflow-templates/${templateId}`, { data: { status: "ACTIVE" } });
  await json(res);
}

export async function startWorkflow(
  api: APIRequestContext,
  opts: { templateId: string; documentId: string; title: string },
): Promise<{ id: string }> {
  const res = await api.post("/api/workflows", {
    data: { projectId: PROJECT_ID, templateId: opts.templateId, documentIds: [opts.documentId], title: opts.title },
  });
  return json(res);
}

export async function getWorkflow(api: APIRequestContext, id: string): Promise<{
  id: string;
  status: string;
  finalOutcomeCode: string | null;
  steps: { id: string; status: string }[];
}> {
  const res = await api.get(`/api/workflows/${id}`);
  return json(res);
}

export async function submitStepReview(
  api: APIRequestContext,
  opts: { workflowId: string; stepId: string; outcomeCode: string },
): Promise<{ stepCompleted: boolean; workflowCompleted: boolean; workflowStatus: string }> {
  const res = await api.post(`/api/workflows/${opts.workflowId}/steps/${opts.stepId}/review`, {
    data: { outcomeCode: opts.outcomeCode },
  });
  return json(res);
}

// ---------------------------------------------------------------------
// HSE
// ---------------------------------------------------------------------

export async function createCorrectiveAction(
  api: APIRequestContext,
  opts: { description: string; assignedToId?: string },
): Promise<{ id: string; actionNumber: string }> {
  const res = await api.post("/api/hse/corrective-actions", {
    data: { projectId: PROJECT_ID, sourceType: "manual", description: opts.description, assignedToId: opts.assignedToId },
  });
  return json(res);
}

export async function transitionCorrectiveAction(
  api: APIRequestContext,
  id: string,
  status: string,
): Promise<{ status: number; body: unknown }> {
  const res = await api.patch(`/api/hse/corrective-actions/${id}`, { data: { status } });
  return { status: res.status(), body: await res.json().catch(() => null) };
}

export async function createIncident(
  api: APIRequestContext,
  opts: { title: string; description: string },
): Promise<{ status: number; body: { id: string; incidentNumber: string } | null }> {
  const res = await api.post("/api/hse/incidents", {
    data: {
      projectId: PROJECT_ID,
      type: "INJURY",
      title: opts.title,
      description: opts.description,
      location: "Site A, Level 2",
      severity: "MEDIUM",
      incidentDate: new Date().toISOString(),
    },
  });
  return { status: res.status(), body: await res.json().catch(() => null) };
}

export async function transitionIncident(
  api: APIRequestContext,
  id: string,
  status: string,
): Promise<{ status: number; body: unknown }> {
  const res = await api.patch(`/api/hse/incidents/${id}`, { data: { status } });
  return { status: res.status(), body: await res.json().catch(() => null) };
}

export async function createPermit(
  api: APIRequestContext,
  opts: { workDescription: string },
): Promise<{ status: number; body: { id: string; permitNumber: string } | null }> {
  const now = Date.now();
  const res = await api.post("/api/hse/permits", {
    data: {
      projectId: PROJECT_ID,
      type: "HOT_WORK",
      location: "Workshop B",
      workDescription: opts.workDescription,
      startDate: new Date(now).toISOString(),
      endDate: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    },
  });
  return { status: res.status(), body: await res.json().catch(() => null) };
}

export async function transitionPermit(
  api: APIRequestContext,
  id: string,
  status: string,
): Promise<{ status: number; body: unknown }> {
  const res = await api.patch(`/api/hse/permits/${id}`, { data: { status } });
  return { status: res.status(), body: await res.json().catch(() => null) };
}

// ---------------------------------------------------------------------
// Field
// ---------------------------------------------------------------------

export async function createFieldIssue(
  api: APIRequestContext,
  opts: { title: string; description: string; responsibleUserId?: string },
): Promise<{ id: string; issueNumber: string }> {
  const res = await api.post("/api/field/issues", {
    data: { projectId: PROJECT_ID, title: opts.title, description: opts.description, responsibleUserId: opts.responsibleUserId },
  });
  return json(res);
}

export async function transitionFieldIssue(
  api: APIRequestContext,
  id: string,
  status: string,
): Promise<{ status: number; body: unknown }> {
  const res = await api.patch(`/api/field/issues/${id}`, { data: { status } });
  return { status: res.status(), body: await res.json().catch(() => null) };
}

export async function createPunchItem(
  api: APIRequestContext,
  opts: { title: string; description: string; responsibleUserId?: string },
): Promise<{ status: number; body: { id: string; punchItemNumber: string } | null }> {
  const res = await api.post("/api/field/punch-items", {
    data: { projectId: PROJECT_ID, title: opts.title, description: opts.description, responsibleUserId: opts.responsibleUserId },
  });
  return { status: res.status(), body: await res.json().catch(() => null) };
}

export async function transitionPunchItem(
  api: APIRequestContext,
  id: string,
  status: string,
): Promise<{ status: number; body: unknown }> {
  const res = await api.patch(`/api/field/punch-items/${id}`, { data: { status } });
  return { status: res.status(), body: await res.json().catch(() => null) };
}

export async function createItp(
  api: APIRequestContext,
  opts: { title: string },
): Promise<{ status: number; body: { id: string; itpNumber: string; items: { id: string; inspectionType: string }[] } | null }> {
  const res = await api.post("/api/field/itp", {
    data: {
      projectId: PROJECT_ID,
      title: opts.title,
      items: [{ activity: "Pour concrete slab", inspectionType: "H", acceptanceCriteria: "Slump test within spec" }],
    },
  });
  return { status: res.status(), body: await res.json().catch(() => null) };
}

export async function decideItp(
  api: APIRequestContext,
  id: string,
  status: "APPROVED" | "REJECTED",
): Promise<{ status: number; body: unknown }> {
  const res = await api.patch(`/api/field/itp/${id}`, { data: { status } });
  return { status: res.status(), body: await res.json().catch(() => null) };
}

/** No GET route exists for a single ITP (the real app only ever renders it
 * through a Server Component) — read-only, same boundary as helpers/db.ts's
 * other reference lookups, not a substitute for the real create/decision
 * API calls above. */
export async function getItpItems(itpId: string): Promise<{ id: string; status: string; inspectionType: string }[]> {
  const { prisma } = await import("./db");
  return prisma.fieldItpItem.findMany({ where: { itpId }, select: { id: true, status: true, inspectionType: true } });
}

export async function requestHoldPointInspection(api: APIRequestContext, itemId: string): Promise<{ status: number; body: unknown }> {
  const res = await api.post(`/api/field/itp-items/${itemId}/request-inspection`, { data: {} });
  return { status: res.status(), body: await res.json().catch(() => null) };
}

export async function decideHoldPoint(
  api: APIRequestContext,
  itemId: string,
  decision: "approve" | "reject",
): Promise<{ status: number; body: unknown }> {
  const res = await api.post(`/api/field/itp-items/${itemId}/decision`, { data: { decision } });
  return { status: res.status(), body: await res.json().catch(() => null) };
}
