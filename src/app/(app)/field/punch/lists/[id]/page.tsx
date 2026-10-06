import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { computePunchlistCompletion } from "@/lib/services/field/punch-service";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { buttonClass } from "@/components/ui/button";
import { ChevronLeft, Plus } from "@/components/ui/icons";
import { AttachIssueToPunchlistButton } from "@/components/field/attach-issue-to-punchlist-button";
import { ISSUE_STATUS_LABELS, ISSUE_STATUS_BADGE_CLASSES, PUNCH_ITEM_STATUS_LABELS, PUNCH_ITEM_STATUS_BADGE_CLASSES } from "@/lib/field/status";

export default async function PunchlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;
  const projectId = membership.projectId;

  const punchlist = await prisma.fieldPunchlist.findFirst({
    where: { id, projectId },
    include: {
      area: true,
      owner: true,
      items: { include: { responsibleUser: true }, orderBy: { createdAt: "desc" } },
      issues: { include: { issue: true } },
    },
  });
  if (!punchlist) notFound();

  const [canManage, completion, attachableIssues] = await Promise.all([
    hasPermission(user.id, "FIELD_MANAGE_PUNCH", { projectId }),
    computePunchlistCompletion(id),
    prisma.fieldIssue.findMany({
      where: { projectId, punchlistLinks: { none: { punchlistId: id } } },
      select: { id: true, issueNumber: true, title: true },
      take: 100,
    }),
  ]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Punchlist</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{punchlist.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Link href={`/field/punch/new?punchlistId=${punchlist.id}`} className={buttonClass("primary", "md")}>
              <Plus size={14} />
              Add Punch Item
            </Link>
          )}
          <Link href="/field/punch" className={buttonClass("secondary", "md")}>
            <ChevronLeft size={14} />
            Back
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl rounded-[3px] border border-border bg-white">
        <SectionHeader>Overview</SectionHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
          <div className="flex gap-2"><span className="w-32 shrink-0 text-text-muted">Location</span><span className="text-text-primary">{punchlist.area?.name ?? "—"}</span></div>
          <div className="flex gap-2"><span className="w-32 shrink-0 text-text-muted">Owner</span><span className="text-text-primary">{punchlist.owner?.name ?? "—"}</span></div>
          <div className="flex gap-2"><span className="w-32 shrink-0 text-text-muted">Due Date</span><span className="text-text-primary">{punchlist.dueDate ? punchlist.dueDate.toLocaleDateString("en-GB") : "—"}</span></div>
          <div className="flex gap-2 col-span-2">
            <span className="w-32 shrink-0 text-text-muted">Completion</span>
            <div className="flex-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-brand-100">
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${completion.percent}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-text-secondary">{completion.percent}% complete ({completion.done}/{completion.total} items)</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-border bg-brand-50 px-4 py-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-brand-800">Punch Items ({punchlist.items.length})</h2>
        </div>
        {punchlist.items.length === 0 ? (
          <p className="px-4 py-3 text-[13px] text-text-muted">No punch items in this punchlist yet.</p>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Item No.</Th>
                <Th>Title</Th>
                <Th>Responsible</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {punchlist.items.map((item) => (
                <Tr key={item.id}>
                  <Td><Link href={`/field/punch/${item.id}`} className="font-medium text-brand-700 hover:underline">{item.punchItemNumber}</Link></Td>
                  <Td className="text-text-secondary">{item.title}</Td>
                  <Td className="text-text-secondary">{item.responsibleUser?.name ?? "—"}</Td>
                  <Td><StatusBadge label={PUNCH_ITEM_STATUS_LABELS[item.status]} className={PUNCH_ITEM_STATUS_BADGE_CLASSES[item.status]} /></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}

        <div className="flex items-center justify-between border-b border-t border-border bg-brand-50 px-4 py-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-brand-800">Attached Issues ({punchlist.issues.length})</h2>
          {canManage && <AttachIssueToPunchlistButton punchlistId={punchlist.id} availableIssues={attachableIssues.map((i) => ({ id: i.id, label: `${i.issueNumber} — ${i.title}` }))} />}
        </div>
        {punchlist.issues.length === 0 ? (
          <p className="px-4 py-3 text-[13px] text-text-muted">No existing issues attached to this punchlist.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {punchlist.issues.map((link) => (
              <li key={link.id} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                <Link href={`/field/issues/${link.issue.id}`} className="text-brand-700 hover:underline">
                  {link.issue.issueNumber} — {link.issue.title}
                </Link>
                <StatusBadge label={ISSUE_STATUS_LABELS[link.issue.status]} className={ISSUE_STATUS_BADGE_CLASSES[link.issue.status]} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
