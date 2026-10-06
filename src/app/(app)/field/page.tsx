import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import {
  getMyOpenFieldItems,
  getFieldDashboardCounts,
  getRecentFieldActivity,
  fieldActivityHref,
} from "@/lib/services/field/dashboard-service";
import { ACTION_LABELS } from "@/lib/field/audit-trail";
import { FieldPageHeader } from "@/components/field/field-page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import {
  ListChecks,
  ShieldAlert,
  FlaskConical,
  AlertCircle,
  EyeIcon,
  ClipboardCheck,
  ListTodo,
  ClipboardList,
  Camera,
  Plus,
} from "@/components/ui/icons";

export default async function FieldOverviewPage() {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const projectId = membership.projectId;

  const [areaCount, myOpenItems, counts, activity] = await Promise.all([
    prisma.fieldArea.count({ where: { projectId, active: true } }),
    getMyOpenFieldItems(projectId, user.id),
    getFieldDashboardCounts(projectId, user.id),
    getRecentFieldActivity(projectId, 15),
  ]);

  return (
    <div className="p-6">
      <FieldPageHeader
        title="Field"
        description={`Construction field operations for this project — ${areaCount} site location${areaCount === 1 ? "" : "s"} configured.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/field/observations/new" className={buttonClass("secondary", "sm")}><EyeIcon size={13} />Observation</Link>
            <Link href="/field/issues/new" className={buttonClass("secondary", "sm")}><AlertCircle size={13} />Issue</Link>
            <Link href="/field/punch/new" className={buttonClass("secondary", "sm")}><ListTodo size={13} />Punch Item</Link>
            <Link href="/field/inspections/new" className={buttonClass("secondary", "sm")}><ClipboardCheck size={13} />Inspection</Link>
            <Link href="/field/photos" className={buttonClass("secondary", "sm")}><Camera size={13} />Photo</Link>
          </div>
        }
      />

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="My Open Items" value={counts.myOpenItems} icon={ListChecks} tone={counts.myOpenItems > 0 ? "warning" : "neutral"} />
        <KpiCard label="Active Hold Points" value={counts.activeHoldPoints} icon={ShieldAlert} href="/field/itp" tone={counts.activeHoldPoints > 0 ? "critical" : "neutral"} />
        <KpiCard label="Failed Tests Pending Retest" value={counts.pendingRetests} icon={FlaskConical} href="/field/tests?resultStatus=FAIL" tone={counts.pendingRetests > 0 ? "warning" : "neutral"} />
        <KpiCard label="Open Issues" value={counts.openIssues} icon={AlertCircle} href="/field/issues" tone="neutral" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <SectionHeader>My Open Items</SectionHeader>
          {myOpenItems.length === 0 ? (
            <EmptyState title="Nothing assigned to you right now" description="Items assigned to you across Observations, Issues, Punch, and Inspections will appear here." />
          ) : (
            <div className="rounded-[3px] border border-border bg-white">
              <ul className="divide-y divide-border">
                {myOpenItems.map((item) => (
                  <li key={`${item.kind}-${item.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 text-[13px]">
                    <div className="min-w-0">
                      <Link href={item.href} className="font-medium text-brand-700 hover:underline">
                        {item.number}
                      </Link>
                      <span className="ml-2 text-text-secondary">{item.title}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-[3px] bg-background px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">{item.kind}</span>
                      {item.dueDate && <span className="text-[11px] text-text-muted">{item.dueDate.toLocaleDateString("en-GB")}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <SectionHeader>Recent Site Activity</SectionHeader>
          {activity.length === 0 ? (
            <EmptyState title="No activity yet" description="Field activity will appear here as records are created and updated." />
          ) : (
            <div className="rounded-[3px] border border-border bg-white">
              <ul className="divide-y divide-border">
                {activity.map((e) => {
                  const href = fieldActivityHref(e.entityType, e.entityId);
                  const label = ACTION_LABELS[e.action] ?? e.action.replaceAll("_", " ").toLowerCase();
                  return (
                    <li key={e.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-[13px]">
                      <span className="min-w-0 truncate text-text-primary">
                        {href ? (
                          <Link href={href} className="text-brand-700 hover:underline">{label}</Link>
                        ) : (
                          label
                        )}
                        <span className="text-text-muted"> · {e.actorName}</span>
                      </span>
                      <span className="shrink-0 text-[11px] text-text-muted">{e.createdAt.toLocaleString("en-GB")}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5">
        <SectionHeader>Quick Links</SectionHeader>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          <Link href="/field/observations" className={buttonClass("secondary", "sm")}><EyeIcon size={13} />Observations</Link>
          <Link href="/field/inspections" className={buttonClass("secondary", "sm")}><ClipboardCheck size={13} />Inspections</Link>
          <Link href="/field/issues" className={buttonClass("secondary", "sm")}><AlertCircle size={13} />Issues</Link>
          <Link href="/field/punch" className={buttonClass("secondary", "sm")}><ListTodo size={13} />Punch</Link>
          <Link href="/field/itp" className={buttonClass("secondary", "sm")}><ClipboardList size={13} />ITP</Link>
          <Link href="/field/tests" className={buttonClass("secondary", "sm")}><FlaskConical size={13} />Tests</Link>
          <Link href="/field/photos" className={buttonClass("secondary", "sm")}><Camera size={13} />Photos</Link>
          <Link href="/field/reports" className={buttonClass("secondary", "sm")}><Plus size={13} />Reports</Link>
        </div>
      </div>
    </div>
  );
}
