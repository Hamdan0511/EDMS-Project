import "server-only";

import type { Prisma, PrismaClient, MailWorkflowStatus, RecipientType } from "@prisma/client";

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
  /** Date field for the first (always-present) date query row — "sent"
   * (default, matches the Date column) or "due" (responseDueDate). */
  dateField?: string;
  dateFrom?: string;
  dateTo?: string;
  /** JSON-encoded array of additional {field,from,to} date queries added via
   * "Add another date query" in Advanced Search — AND-combined with the
   * first row and with each other, never replacing it. */
  dateQueries?: string;
  page?: string;
  /** Identifies one of the fixed Standard Searches in the Mail nav menu —
   * resolved into a real, dynamically-computed Prisma filter server-side
   * (see buildStandardSearchFilter) rather than a baked-in date/org value. */
  std?: string;
};

export type MailDateField = "sent" | "due";

export type MailDateQuery = { field: MailDateField; from?: string; to?: string };

export function parseDateQueries(raw: string | undefined): MailDateQuery[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((q): q is MailDateQuery => q && typeof q === "object" && (q.field === "sent" || q.field === "due"))
      .filter((q) => q.from || q.to);
  } catch {
    return [];
  }
}

export const STANDARD_SEARCH_KEYS = ["receivedToday", "sentToday", "orgClosedOut", "orgReceived30d", "rfiReceived"] as const;
export type StandardSearchKey = (typeof STANDARD_SEARCH_KEYS)[number];

/** Builds the extra filter for a Standard Search, computed fresh from the
 * server clock and the caller's real identity/organization on every
 * request — never a hardcoded date or organization name. Returns null for
 * an unrecognized/absent key (no extra restriction). */
export function buildStandardSearchFilter(
  std: string | undefined,
  ctx: { userId: string; organizationId: string; rfiTypeId: string | null },
): Prisma.MailWhereInput | null {
  if (!STANDARD_SEARCH_KEYS.includes(std as StandardSearchKey)) return null;

  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  switch (std as StandardSearchKey) {
    case "receivedToday":
      return {
        status: "SENT",
        recipients: { some: { userId: ctx.userId } },
        sentAt: { gte: startOfToday, lt: startOfTomorrow },
      };
    case "sentToday":
      return {
        status: "SENT",
        senderId: ctx.userId,
        sentAt: { gte: startOfToday, lt: startOfTomorrow },
      };
    case "orgClosedOut":
      return {
        status: "SENT",
        workflowStatus: "CLOSED_OUT",
        OR: [
          { sender: { organizationId: ctx.organizationId } },
          { recipients: { some: { user: { organizationId: ctx.organizationId } } } },
        ],
      };
    case "orgReceived30d":
      return {
        status: "SENT",
        recipients: { some: { user: { organizationId: ctx.organizationId } } },
        sentAt: { gte: thirtyDaysAgo },
      };
    case "rfiReceived":
      // If the project has never configured a "Request for Information"
      // mail type (or genuinely has no such mail yet), this must resolve to
      // zero results — never a fabricated classification of other mail.
      return {
        status: "SENT",
        recipients: { some: { userId: ctx.userId } },
        typeId: ctx.rfiTypeId ?? "__no_rfi_type_configured__",
      };
  }
}

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

/** One real date condition — "sent" matches the Date column (sentAt, or
 * createdAt for records with no sentAt), "due" matches responseDueDate. */
function dateQueryFilter(
  field: MailDateField,
  from: string | undefined,
  to: string | undefined,
): Prisma.MailWhereInput | null {
  if (!from && !to) return null;

  if (field === "due") {
    const range: { gte?: Date; lte?: Date } = {};
    if (from) range.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) range.lte = new Date(`${to}T23:59:59.999Z`);
    return { responseDueDate: range };
  }

  if (from && !to) {
    // Preserves the original single-day behavior for a lone "from" value
    // (the only case any existing UI/link ever actually submits).
    const { gte, lt } = dayRange(from);
    return { OR: [{ sentAt: { gte, lt } }, { AND: [{ sentAt: null }, { createdAt: { gte, lt } }] }] };
  }
  const range: { gte?: Date; lte?: Date } = {};
  if (from) range.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) range.lte = new Date(`${to}T23:59:59.999Z`);
  return { OR: [{ sentAt: range }, { AND: [{ sentAt: null }, { createdAt: range }] }] };
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

  // Row 0 (always present, backward-compatible with existing dateFrom/dateTo
  // links/bookmarks — dateField defaults to "sent" when absent).
  const row0 = dateQueryFilter((params.dateField as MailDateField) || "sent", params.dateFrom, params.dateTo);
  if (row0) filters.push(row0);

  // Additional compound date queries added via "Add another date query" —
  // AND-combined with row 0 and each other, never replacing it.
  for (const q of parseDateQueries(params.dateQueries)) {
    const extra = dateQueryFilter(q.field, q.from, q.to);
    if (extra) filters.push(extra);
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

/** The exact same tab + filter + standard-search composition the Mail
 * register itself uses, extracted so the View Mail page's result
 * navigation (Previous/Next/position) can rebuild the identical ordered
 * result set the user was actually looking at — never a broader or
 * differently-scoped query. `userId`/`organizationId`/`projectId` always
 * come from the authenticated session, never from client-supplied params,
 * so this cannot be used to widen a user's own authorization boundary. */
export async function buildFullMailWhere(
  params: MailSearchParams,
  ctx: { projectId: string; userId: string; organizationId: string },
  prismaClient: PrismaClient,
): Promise<Prisma.MailWhereInput> {
  const tab = normalizeTab(params.tab);
  const stdKey = params.std;
  const isOrgStd = stdKey === "orgClosedOut" || stdKey === "orgReceived30d";

  const baseWhere: Prisma.MailWhereInput = isOrgStd
    ? { projectId: ctx.projectId }
    : tabWhere(tab, ctx.projectId, ctx.userId, params.recipientType);
  const extraFilters = buildMailFilters(params, ctx.userId);
  let where: Prisma.MailWhereInput = extraFilters.length > 0 ? { AND: [baseWhere, ...extraFilters] } : baseWhere;

  if (stdKey) {
    const rfiType =
      stdKey === "rfiReceived"
        ? await prismaClient.mailType.findUnique({
            where: { projectId_name: { projectId: ctx.projectId, name: "Request for Information" } },
            select: { id: true },
          })
        : null;
    const stdFilter = buildStandardSearchFilter(stdKey, {
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      rfiTypeId: rfiType?.id ?? null,
    });
    if (stdFilter) {
      where = { AND: [where, stdFilter] };
    }
  }

  return where;
}
