import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Mail as MailIcon, Plus } from "@/components/ui/icons";
import { MailTabs } from "@/components/mail/mail-tabs";
import { MailFilters } from "@/components/mail/mail-filters";
import { MailTable, type MailRow } from "@/components/mail/mail-table";
import { AdvancedSearchModal } from "@/components/mail/advanced-search-modal";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  normalizeTab,
  tabWhere,
  buildMailFilters,
  buildStandardSearchFilter,
  parsePage,
  MAIL_PAGE_SIZE,
  type MailSearchParams,
} from "@/lib/mail/query";
import { WORKFLOW_STATUS_OPTIONS, WORKFLOW_STATUS_LABELS } from "@/lib/mail/workflow-status";
import { effectiveWorkflowStatus } from "@/lib/mail/overdue";

export default async function MailListPage({
  searchParams,
}: {
  searchParams: Promise<MailSearchParams>;
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
  const tab = normalizeTab(params.tab);
  const page = parsePage(params.page);

  const stdKey = params.std;
  // "Org" standard searches show correspondence across the whole
  // organization (any teammate as sender/recipient), not just mail
  // addressed to me — so they must not inherit tabWhere's per-user
  // authorization scope, only the org-membership scope baked into the
  // standard search filter itself.
  const isOrgStd = stdKey === "orgClosedOut" || stdKey === "orgReceived30d";

  const baseWhere: Prisma.MailWhereInput = isOrgStd
    ? { projectId }
    : tabWhere(tab, projectId, user.id, params.recipientType);
  const extraFilters = buildMailFilters(params, user.id);
  let where: Prisma.MailWhereInput =
    extraFilters.length > 0 ? { AND: [baseWhere, ...extraFilters] } : baseWhere;

  if (stdKey) {
    const rfiType =
      stdKey === "rfiReceived"
        ? await prisma.mailType.findUnique({
            where: { projectId_name: { projectId, name: "Request for Information" } },
            select: { id: true },
          })
        : null;
    const stdFilter = buildStandardSearchFilter(stdKey, {
      userId: user.id,
      organizationId: membership.organizationId,
      rfiTypeId: rfiType?.id ?? null,
    });
    if (stdFilter) {
      where = { AND: [where, stdFilter] };
    }
  }

  const [mails, total, allCount, inboxCount, sentCount, draftsCount, mailTypes] = await Promise.all([
    prisma.mail.findMany({
      where,
      include: {
        sender: { include: { organization: true } },
        type: true,
        recipients: { include: { user: { include: { organization: true } } } },
        replies: { select: { sentAt: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { attachments: true, replies: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * MAIL_PAGE_SIZE,
      take: MAIL_PAGE_SIZE,
    }),
    prisma.mail.count({ where }),
    prisma.mail.count({ where: tabWhere("all", projectId, user.id) }),
    prisma.mail.count({ where: tabWhere("inbox", projectId, user.id) }),
    prisma.mail.count({ where: tabWhere("sent", projectId, user.id) }),
    prisma.mail.count({ where: tabWhere("drafts", projectId, user.id) }),
    prisma.mailType.findMany({ where: { projectId }, orderBy: { name: "asc" } }),
  ]);

  const rows: MailRow[] = mails.map((m) => {
    const toOrgs = [
      ...new Set(
        m.recipients.filter((r) => r.type === "TO").map((r) => r.user.organization.name),
      ),
    ];
    return {
      id: m.id,
      href:
        m.status === "DRAFT"
          ? m.direction === "INCOMING"
            ? `/mail/register-incoming?draftId=${m.id}`
            : m.type.name === "Transmittal"
              ? `/documents/transmittals/new?draftId=${m.id}`
              : m.type.name === "Tender Transmittal"
                ? `/documents/transmittals/new?kind=tender&draftId=${m.id}`
                : `/mail/new?draftId=${m.id}`
          : `/mail/${m.id}`,
      mailNumber: m.mailNumber,
      subject: m.subject,
      date: (m.sentAt ?? m.createdAt).toLocaleDateString("en-GB"),
      from: m.sender.name,
      fromOrg: m.sender.organization.name,
      toOrg: toOrgs.join(", ") || "—",
      recipientsText: m.recipients.map((r) => r.user.name).join(", ") || "—",
      statusLabel: m.status === "DRAFT" ? "Draft" : WORKFLOW_STATUS_LABELS[effectiveWorkflowStatus(m)],
      typeLabel: m.type.name,
      typeId: m.typeId,
      hasAttachments: m._count.attachments > 0,
      repliesCount: m._count.replies,
      replyDate: m.replies[0] ? (m.replies[0].sentAt ?? m.replies[0].createdAt).toLocaleDateString("en-GB") : "—",
      due: m.responseDueDate ? m.responseDueDate.toLocaleDateString("en-GB") : "—",
    };
  });

  const typeOptions = mailTypes.map((t) => ({ value: t.id, label: t.name }));

  function buildHref(targetPage: number): string {
    const sp = new URLSearchParams();
    sp.set("tab", tab);
    if (params.q) sp.set("q", params.q);
    if (params.myMailOnly) sp.set("myMailOnly", params.myMailOnly);
    if (params.myUnread) sp.set("myUnread", params.myUnread);
    if (params.recipientType) sp.set("recipientType", params.recipientType);
    if (params.mailNo) sp.set("mailNo", params.mailNo);
    if (params.subject) sp.set("subject", params.subject);
    if (params.from) sp.set("from", params.from);
    if (params.fromOrg) sp.set("fromOrg", params.fromOrg);
    if (params.toOrg) sp.set("toOrg", params.toOrg);
    if (params.recipients) sp.set("recipients", params.recipients);
    if (params.status) sp.set("status", params.status);
    if (params.type) sp.set("type", params.type);
    if (params.dateField) sp.set("dateField", params.dateField);
    if (params.dateFrom) sp.set("dateFrom", params.dateFrom);
    if (params.dateTo) sp.set("dateTo", params.dateTo);
    if (params.dateQueries) sp.set("dateQueries", params.dateQueries);
    if (params.std) sp.set("std", params.std);
    sp.set("page", String(targetPage));
    return `/mail?${sp.toString()}`;
  }

  const STANDARD_SEARCH_LABELS: Record<string, string> = {
    receivedToday: "My mail received today",
    sentToday: "My mail sent today",
    orgClosedOut: "Org mail Closed Out",
    orgReceived30d: "Org mail received in last 30 days",
    rfiReceived: "RFIs received report",
  };
  const pageTitle = stdKey && STANDARD_SEARCH_LABELS[stdKey] ? `Mail — ${STANDARD_SEARCH_LABELS[stdKey]}` : "Mail";

  return (
    <div>
      <PageHeader
        title={pageTitle}
        actions={
          membership.role !== "VIEWER" ? (
            <Link href="/mail/new" className={buttonClass("primary", "md")}>
              <Plus size={14} />
              New Mail
            </Link>
          ) : undefined
        }
      />
      <MailTabs
        active={tab}
        counts={{ all: allCount, inbox: inboxCount, sent: sentCount, drafts: draftsCount }}
      />
      <div className="p-6">
        <form action="/mail" method="GET">
          <input type="hidden" name="tab" value={tab} />
          <MailFilters
            q={params.q ?? ""}
            myMailOnly={params.myMailOnly === "1"}
            myUnread={params.myUnread === "1"}
            recipientType={params.recipientType ?? "any"}
          />

          <div className="mb-3 flex items-center justify-end">
            <AdvancedSearchModal statusOptions={WORKFLOW_STATUS_OPTIONS} typeOptions={typeOptions} />
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={<MailIcon size={28} strokeWidth={1.25} />}
              title="No mail found"
              description="Mail matching this view will appear here once it exists."
            />
          ) : (
            <>
              <MailTable
                rows={rows}
                filters={{
                  mailNo: params.mailNo ?? "",
                  subject: params.subject ?? "",
                  dateFrom: params.dateFrom ?? "",
                  from: params.from ?? "",
                  fromOrg: params.fromOrg ?? "",
                  toOrg: params.toOrg ?? "",
                  recipients: params.recipients ?? "",
                  status: params.status ?? "",
                  type: params.type ?? "",
                }}
                statusOptions={WORKFLOW_STATUS_OPTIONS}
                typeOptions={typeOptions}
              />
              <div className="mt-4">
                <Pagination page={page} pageSize={MAIL_PAGE_SIZE} total={total} buildHref={buildHref} />
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
