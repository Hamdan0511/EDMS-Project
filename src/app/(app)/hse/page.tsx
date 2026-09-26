import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { getHseDashboardData, type AttentionRow } from "@/lib/hse/dashboard";
import {
  ShieldAlert,
  AlertCircle,
  TriangleAlert,
  EyeIcon,
  ClipboardCheck,
  CheckCircle2,
  FileText,
} from "@/components/ui/icons";
import { HseDateRangeForm } from "@/components/hse/hse-date-range-form";
import { HsePageHeader } from "@/components/hse/hse-page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/ui/empty-state";

const KPI_CARDS = [
  { key: "incidents", label: "Incidents", href: "/hse/incidents", icon: AlertCircle, tone: "critical" as const },
  { key: "nearMisses", label: "Near Misses", href: "/hse/near-misses", icon: TriangleAlert, tone: "warning" as const },
  { key: "observations", label: "Observations", href: "/hse/observations", icon: EyeIcon, tone: "neutral" as const },
  { key: "hazards", label: "Hazards", href: "/hse/hazards", icon: TriangleAlert, tone: "warning" as const },
  { key: "inspections", label: "Inspections", href: "/hse/inspections", icon: ClipboardCheck, tone: "neutral" as const },
  { key: "correctiveActions", label: "Corrective Actions", href: "/hse/corrective-actions", icon: CheckCircle2, tone: "neutral" as const },
  { key: "permits", label: "Permits to Work", href: "/hse/permits", icon: FileText, tone: "neutral" as const },
] as const;

const QUICK_LINKS = [
  { label: "Hazard Register", href: "/hse/hazards" },
  { label: "Risk Assessments", href: "/hse/risk-assessments" },
  { label: "Inspection Register", href: "/hse/inspections" },
  { label: "Corrective Actions", href: "/hse/corrective-actions" },
  { label: "Permits to Work", href: "/hse/permits" },
  { label: "HSE Reports", href: "/hse/reports" },
];

const ATTENTION_TONE: Record<AttentionRow["kind"], string> = {
  "Critical Incident": "bg-red-100 text-red-800",
  "High-Risk Hazard": "bg-orange-100 text-orange-800",
  "Overdue Action": "bg-red-100 text-red-800",
  "Permit Expiring": "bg-amber-100 text-amber-800",
};

export default async function HseDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string }>;
}) {
  const { membership } = await requirePageContext();
  if (!membership) return null;

  const params = await searchParams;
  const dateFrom = params.dateFrom ? new Date(`${params.dateFrom}T00:00:00.000Z`) : undefined;
  const dateTo = params.dateTo ? new Date(`${params.dateTo}T23:59:59.999Z`) : undefined;

  const data = await getHseDashboardData({
    projectId: membership.projectId,
    userId: membership.userId,
    dateFrom,
    dateTo,
  });

  const openItemsList = [
    { label: "Open Hazards", count: data.openItems.openHazards, href: "/hse/hazards?status=OPEN", icon: TriangleAlert },
    { label: "Open Incidents", count: data.openItems.openIncidents, href: "/hse/incidents?status=OPEN", icon: AlertCircle },
    { label: "Open Near Misses", count: data.openItems.openNearMisses, href: "/hse/near-misses?status=OPEN", icon: TriangleAlert },
    { label: "Open Observations", count: data.openItems.openObservations, href: "/hse/observations?status=OPEN", icon: EyeIcon },
    { label: "Pending Inspections", count: data.openItems.pendingInspections, href: "/hse/inspections?status=SCHEDULED", icon: ClipboardCheck },
    { label: "Overdue Corrective Actions", count: data.openItems.overdueActions, href: "/hse/corrective-actions?overdue=1", icon: CheckCircle2 },
    { label: "Permits Expiring Soon", count: data.openItems.permitsExpiringSoon, href: "/hse/permits?expiringSoon=1", icon: FileText },
  ];

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <HsePageHeader
          title="Health & Safety"
          description="Monitor site safety performance, active risks, incidents, inspections and actions."
        />
        <HseDateRangeForm dateFrom={params.dateFrom ?? ""} dateTo={params.dateTo ?? ""} projectName={membership.project.name} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {KPI_CARDS.map((card) => (
          <KpiCard
            key={card.key}
            label={card.label}
            value={data.counts[card.key]}
            href={card.href}
            icon={card.icon}
            tone={card.tone}
          />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-[3px] border border-border bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-[13px] font-semibold text-text-primary">Attention Required</h2>
            <span className="text-[11px] text-text-secondary">{data.attentionRequired.length} items</span>
          </div>
          {data.attentionRequired.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Nothing requires attention"
                description="Critical incidents, high-risk hazards, overdue actions and expiring permits will appear here."
                className="border-none bg-transparent py-6"
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {data.attentionRequired.map((row) => (
                <li key={`${row.kind}-${row.id}`}>
                  <Link href={row.href} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-brand-50/60">
                    <div className="flex min-w-0 flex-col">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${ATTENTION_TONE[row.kind]}`}>
                          {row.kind}
                        </span>
                        <span className="truncate text-[13px] font-medium text-text-primary">{row.title}</span>
                      </div>
                      <span className="mt-0.5 text-[11px] text-text-secondary">{row.detail}</span>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-brand-700">View →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-[3px] border border-border bg-brand-950 p-5 text-white">
          <ShieldAlert size={20} className="text-amber-400" />
          <h3 className="mt-2 text-[14px] font-semibold">Report a Safety Issue</h3>
          <p className="mt-1 text-[12px] text-brand-200">
            See a hazard? Unsafe condition? Near miss? Report it in seconds.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/hse/report?type=hazard" className="rounded-[3px] bg-white/10 px-3 py-2 text-[12px] font-medium hover:bg-white/20">
              Report Hazard
            </Link>
            <Link href="/hse/report?type=incident" className="rounded-[3px] bg-white/10 px-3 py-2 text-[12px] font-medium hover:bg-white/20">
              Report Incident
            </Link>
            <Link href="/hse/report?type=near-miss" className="rounded-[3px] bg-white/10 px-3 py-2 text-[12px] font-medium hover:bg-white/20">
              Report Near Miss
            </Link>
            <Link href="/hse/report?type=observation" className="rounded-[3px] bg-white/10 px-3 py-2 text-[12px] font-medium hover:bg-white/20">
              Report Observation
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-[3px] border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-[13px] font-semibold text-text-primary">Open Items</h2>
          </div>
          <ul className="divide-y divide-border">
            {openItemsList.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="flex items-center justify-between px-4 py-2 text-[13px] hover:bg-brand-50/60">
                  <span className="flex items-center gap-2 text-text-secondary">
                    <item.icon size={14} className="text-text-muted" />
                    {item.label}
                  </span>
                  <span className="font-semibold text-text-primary">{item.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[3px] border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-[13px] font-semibold text-text-primary">My Actions</h2>
            <Link href="/hse/corrective-actions?assignedToMe=1" className="text-[11px] font-medium text-brand-700 hover:underline">
              View All
            </Link>
          </div>
          {data.myActions.length === 0 ? (
            <p className="p-4 text-[13px] text-text-muted">You have no open corrective actions.</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-wide">Action No.</th>
                  <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-wide">Title</th>
                  <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-wide">Due</th>
                  <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.myActions.map((a) => {
                  const overdue = a.dueDate && a.dueDate < new Date() && a.status !== "CLOSED" && a.status !== "VERIFIED";
                  return (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-brand-50/60">
                      <td className="px-4 py-2">
                        <Link href={`/hse/corrective-actions/${a.id}`} className="font-medium text-brand-700 hover:underline">
                          {a.actionNumber}
                        </Link>
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-2 text-text-secondary">{a.description}</td>
                      <td className="px-4 py-2 text-text-secondary">{a.dueDate ? a.dueDate.toLocaleDateString("en-GB") : "—"}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-[3px] px-1.5 py-0.5 text-[11px] font-medium ${
                            overdue ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {overdue ? "Overdue" : a.status.replaceAll("_", " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-[3px] border border-border bg-white">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-[13px] font-semibold text-text-primary">Quick Links</h2>
          </div>
          <ul className="divide-y divide-border">
            {QUICK_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="flex items-center justify-between px-4 py-2 text-[13px] text-text-secondary hover:bg-brand-50/60 hover:text-brand-700">
                  {l.label}
                  <span>→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-[3px] border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[13px] font-semibold text-text-primary">Recent Activity</h2>
        </div>
        {data.recentActivity.length === 0 ? (
          <p className="p-4 text-[13px] text-text-muted">
            No Health &amp; Safety records yet. Use Report an Issue to get started.
          </p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-wide">Ref No.</th>
                <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-wide">Type</th>
                <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-wide">Title</th>
                <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-wide">Location</th>
                <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-wide">Date</th>
                <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentActivity.map((row) => (
                <tr key={`${row.kind}-${row.id}`} className="border-b border-border last:border-0 hover:bg-brand-50/60">
                  <td className="px-4 py-2">
                    <Link href={row.href} className="font-medium text-brand-700 hover:underline">
                      {row.refNo}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-text-secondary">{row.kind}</td>
                  <td className="max-w-xs truncate px-4 py-2 text-text-secondary">{row.title}</td>
                  <td className="px-4 py-2 text-text-secondary">{row.location || "—"}</td>
                  <td className="px-4 py-2 text-text-secondary">{row.date.toLocaleDateString("en-GB")}</td>
                  <td className="px-4 py-2 text-text-secondary">{row.status.replaceAll("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
