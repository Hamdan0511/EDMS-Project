import "server-only";

import type { Prisma, MailWorkflowStatus, RecipientType } from "@prisma/client";

export const MAIL_PAGE_SIZE = 50;

export type MailTab = "all" | "inbox" | "sent" | "drafts";

export type MailSearchParams = {
  tab?: string;
  q?: string;
  myMailOnly?: string;
  myUnread?: string;
  recipientType?: string;
  mailNo?: string;
  subject?: string;
  from?: string;
  fromOrg?: string;
  toOrg?: string;
  recipients?: string;
  status?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
};

export function normalizeTab(tab: string | undefined): MailTab {
  return tab === "inbox" || tab === "sent" || tab === "drafts" ? tab : "all";
}

function recipientInvolvement(userId: string, recipientType: string | undefined) {
  if (recipientType === "to") {
    return { recipients: { some: { userId, type: "TO" as RecipientType } } };
  }
  if (recipientType === "cc") {
    return { recipients: { some: { userId, type: "CC" as RecipientType } } };
  }
  return { recipients: { some: { userId } } };
}

/** Base visibility scope for a tab — this is the authorization boundary: a
 * user only ever sees mail where they are the sender or a recipient. */
export function tabWhere(
  tab: MailTab,
  projectId: string,
  userId: string,
  recipientType?: string,
): Prisma.MailWhereInput {
  if (tab === "inbox") {
    return { projectId, status: "SENT", ...recipientInvolvement(userId, recipientType) };
  }
  if (tab === "sent") {
    return { projectId, status: "SENT", senderId: userId };
  }
  if (tab === "drafts") {
    // Outgoing drafts are personal (only their author can see/resume them).
    // Incoming-mail drafts are a correspondence-register entry in progress,
    // not a personal draft — senderId there is the external contact, not
    // whoever is registering it — so any project member can see and resume
    // one, matching saveIncomingMail's draft-ownership rule.
    return {
      projectId,
      status: "DRAFT",
      OR: [{ senderId: userId }, { direction: "INCOMING" }],
    };
  }
  if (recipientType === "to" || recipientType === "cc") {
    return { projectId, status: "SENT", ...recipientInvolvement(userId, recipientType) };
  }
  return {
    projectId,
    status: "SENT",
    OR: [{ senderId: userId }, { recipients: { some: { userId } } }],
  };
}

function dayRange(dateStr: string): { gte: Date; lt: Date } {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { gte: start, lt: end };
}

/** Builds the full AND-list of extra filters on top of the tab's base
 * scope: global search, per-column filters, and the checkbox toggles. */
export function buildMailFilters(
  params: MailSearchParams,
  userId: string,
): Prisma.MailWhereInput[] {
  const filters: Prisma.MailWhereInput[] = [];

  const q = params.q?.trim();
  if (q) {
    filters.push({
      OR: [
        { mailNumber: { contains: q, mode: "insensitive" } },
        { subject: { contains: q, mode: "insensitive" } },
        { messageText: { contains: q, mode: "insensitive" } },
        { sender: { name: { contains: q, mode: "insensitive" } } },
        { sender: { organization: { name: { contains: q, mode: "insensitive" } } } },
        { recipients: { some: { user: { name: { contains: q, mode: "insensitive" } } } } },
        {
          recipients: {
            some: { user: { organization: { name: { contains: q, mode: "insensitive" } } } },
          },
        },
      ],
    });
  }

  if (params.mailNo?.trim()) {
    filters.push({ mailNumber: { contains: params.mailNo.trim(), mode: "insensitive" } });
  }
  if (params.subject?.trim()) {
    filters.push({ subject: { contains: params.subject.trim(), mode: "insensitive" } });
  }
  if (params.from?.trim()) {
    filters.push({ sender: { name: { contains: params.from.trim(), mode: "insensitive" } } });
  }
  if (params.fromOrg?.trim()) {
    filters.push({
      sender: { organization: { name: { contains: params.fromOrg.trim(), mode: "insensitive" } } },
    });
  }
  if (params.toOrg?.trim()) {
    filters.push({
      recipients: {
        some: { user: { organization: { name: { contains: params.toOrg.trim(), mode: "insensitive" } } } },
      },
    });
  }
  if (params.recipients?.trim()) {
    filters.push({
      recipients: { some: { user: { name: { contains: params.recipients.trim(), mode: "insensitive" } } } },
    });
  }
  const statusFilter = params.status?.trim();
  if (statusFilter) {
    // OVERDUE is never persisted (computed at render time in
    // effectiveWorkflowStatus from OUTSTANDING + an elapsed due date), so a
    // literal equality match against workflowStatus would always return zero
    // rows for it — and would incorrectly still include now-overdue mail
    // under "Outstanding". Both directions are corrected here to match what
    // the UI actually displays.
    const now = new Date();
    if (statusFilter === "OVERDUE") {
      filters.push({
        OR: [
          { workflowStatus: "OVERDUE" },
          { workflowStatus: "OUTSTANDING", responseDueDate: { lt: now } },
        ],
      });
    } else if (statusFilter === "OUTSTANDING") {
      filters.push({
        workflowStatus: "OUTSTANDING",
        OR: [{ responseDueDate: null }, { responseDueDate: { gte: now } }],
      });
    } else {
      filters.push({ workflowStatus: statusFilter as MailWorkflowStatus });
    }
  }
  if (params.type?.trim()) {
    filters.push({ typeId: params.type.trim() });
  }

  if (params.dateFrom && params.dateTo) {
    const from = new Date(`${params.dateFrom}T00:00:00.000Z`);
    const to = new Date(`${params.dateTo}T23:59:59.999Z`);
    filters.push({
      OR: [
        { sentAt: { gte: from, lte: to } },
        { AND: [{ sentAt: null }, { createdAt: { gte: from, lte: to } }] },
      ],
    });
  } else if (params.dateFrom) {
    const { gte, lt } = dayRange(params.dateFrom);
    filters.push({
      OR: [
        { sentAt: { gte, lt } },
        { AND: [{ sentAt: null }, { createdAt: { gte, lt } }] },
      ],
    });
  }

  if (params.myMailOnly === "1") {
    filters.push({ OR: [{ senderId: userId }, { recipients: { some: { userId } } }] });
  }
  if (params.myUnread === "1") {
    filters.push({ recipients: { some: { userId, readAt: null } } });
  }

  return filters;
}

export function parsePage(pageParam: string | undefined): number {
  const n = Number(pageParam);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}
