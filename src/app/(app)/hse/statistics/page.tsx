import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { resolveDateRange, getHseStatistics, DATE_RANGE_PRESET_LABELS } from "@/lib/hse/statistics";
import { HsePageHeader } from "@/components/hse/hse-page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { HseBarList } from "@/components/hse/hse-bar-list";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button, buttonClass } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertCircle,
  TriangleAlert,
  EyeIcon,
  ClipboardCheck,
  CheckCircle2,
  FileText,
  Wrench,
  Download,
} from "@/components/ui/icons";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatMonth(key: string): string {
  const [year, month] = key.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

function trendText(current: number, previous: number): string {
  if (previous === 0 && current === 0) return "No change vs previous period";
  if (previous === 0) return `${current} more than previous period`;
  const pct = Math.round(((current - previous) / previous) * 100);
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}% vs previous period (${previous})`;
}

export default async function SafetyStatisticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; dateFrom?: string; dateTo?: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }
  const params = await searchParams;
  const projectId = membership.projectId;

  const [canExport] = await Promise.all([hasPermission(user.id, "HSE_EXPORT_REPORTS", { projectId })]);

  const range = resolveDateRange(params.preset, params.dateFrom, params.dateTo);
  const stats = await getHseStatistics(projectId, range);

  const exportHref = `/api/hse/statistics/export?projectId=${projectId}&preset=${range.preset}${
    range.preset === "custom" ? `&dateFrom=${params.dateFrom}&dateTo=${params.dateTo}` : ""
  }`;

  return (
    <div className="p-6">
      <HsePageHeader
        title="Safety Statistics"
        description="Management-level safety performance and trends for the selected period — for detailed records, use Reports."
        action={
          canExport ? (
            <a href={exportHref} className={buttonClass("secondary", "md")}>
              <Download size={14} />
              Export CSV
            </a>
          ) : undefined
        }
      />

      <form action="/hse/statistics" method="GET" className="mt-4 flex flex-wrap items-end gap-2 rounded-[3px] border border-border bg-white px-3 py-2.5">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Date Range
          <Select name="preset" defaultValue={range.preset}>
            {Object.entries(DATE_RANGE_PRESET_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          From
          <Input type="date" name="dateFrom" defaultValue={params.dateFrom ?? ""} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          To
          <Input type="date" name="dateTo" defaultValue={params.dateTo ?? ""} />
        </label>
        <Button type="submit" variant="secondary">Apply</Button>
        <span className="ml-2 text-[12px] text-text-muted">
          {range.from.toLocaleDateString("en-GB")} – {range.to.toLocaleDateString("en-GB")}
        </span>
      </form>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Incidents" value={stats.totals.incidents} icon={AlertCircle} tone="critical" href="/hse/incidents" delta={trendText(stats.totals.incidents, stats.previousTotals.incidents)} />
        <KpiCard label="Near Misses" value={stats.totals.nearMisses} icon={TriangleAlert} tone="warning" href="/hse/near-misses" delta={trendText(stats.totals.nearMisses, stats.previousTotals.nearMisses)} />
        <KpiCard label="Observations" value={stats.totals.observations} icon={EyeIcon} href="/hse/observations" />
        <KpiCard label="Open Hazards" value={stats.totals.openHazards} icon={TriangleAlert} tone="warning" href="/hse/hazards?status=OPEN" />
        <KpiCard label="Inspections Completed" value={stats.totals.inspectionsCompleted} icon={ClipboardCheck} href="/hse/inspections" />
        <KpiCard label="Open Corrective Actions" value={stats.totals.openCorrectiveActions} icon={CheckCircle2} href="/hse/corrective-actions" />
        <KpiCard label="Overdue Actions" value={stats.totals.overdueCorrectiveActions} icon={CheckCircle2} tone="critical" href="/hse/corrective-actions?overdue=1" />
        <KpiCard label="Active Permits" value={stats.totals.activePermits} icon={FileText} href="/hse/permits?status=ACTIVE" />
        <KpiCard label="Equipment Out of Service" value={stats.totals.equipmentOutOfService} icon={Wrench} tone="critical" href="/hse/equipment?status=OUT_OF_SERVICE" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-[3px] border border-border bg-white lg:col-span-2">
          <SectionHeader>Safety Trends</SectionHeader>
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div>
              <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Incidents by Month</p>
              <HseBarList items={stats.incidentsByMonth.map((m) => ({ label: formatMonth(m.month), value: m.count }))} barClassName="bg-red-500" />
            </div>
            <div>
              <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Near Misses by Month</p>
              <HseBarList items={stats.nearMissesByMonth.map((m) => ({ label: formatMonth(m.month), value: m.count }))} barClassName="bg-amber-500" />
            </div>
            <div>
              <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Observations by Month</p>
              <HseBarList items={stats.observationsByMonth.map((m) => ({ label: formatMonth(m.month), value: m.count }))} barClassName="bg-blue-500" />
            </div>
          </div>
        </div>

        <div className="rounded-[3px] border border-border bg-white">
          <SectionHeader>Incident Severity</SectionHeader>
          <HseBarList
            items={Object.entries(stats.incidentSeverity).map(([severity, count]) => ({ label: severity, value: count }))}
            barClassName="bg-red-500"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-[3px] border border-border bg-white">
          <SectionHeader>Corrective Action Performance</SectionHeader>
          <HseBarList
            items={Object.entries(stats.correctiveActionsByStatus).map(([status, count]) => ({ label: status.replaceAll("_", " "), value: count }))}
            barClassName="bg-brand-600"
          />
          {stats.correctiveActionAvgClosureDays !== null && (
            <p className="border-t border-border px-4 py-2 text-[12px] text-text-secondary">
              Average time to close: <strong className="text-text-primary">{stats.correctiveActionAvgClosureDays} days</strong>
            </p>
          )}
        </div>

        <div className="rounded-[3px] border border-border bg-white">
          <SectionHeader>Permit Activity</SectionHeader>
          <HseBarList
            items={Object.entries(stats.permitsByStatus).map(([status, count]) => ({ label: status.replaceAll("_", " "), value: count }))}
            barClassName="bg-blue-600"
          />
        </div>

        <div className="rounded-[3px] border border-border bg-white">
          <SectionHeader>Equipment Safety Performance</SectionHeader>
          <div className="flex flex-col gap-1 px-4 py-3 text-[13px]">
            <div className="flex justify-between">
              <span className="text-text-secondary">Passed</span>
              <span className="font-medium text-text-primary">{stats.equipmentInspectionResults.passed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Failed</span>
              <span className="font-medium text-text-primary">{stats.equipmentInspectionResults.failed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Pass Rate</span>
              <span className="font-medium text-text-primary">
                {stats.equipmentInspectionResults.passRate !== null ? `${stats.equipmentInspectionResults.passRate}%` : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Currently Out of Service</span>
              <span className="font-medium text-text-primary">{stats.totals.equipmentOutOfService}</span>
            </div>
          </div>
          <div className="border-t border-border px-4 py-2">
            <Link href="/hse/equipment" className="text-[12px] font-medium text-brand-700 hover:underline">
              View Equipment Safety →
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[3px] border border-border bg-white">
        <SectionHeader>Period Comparison</SectionHeader>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-text-muted">
              <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-wide">Metric</th>
              <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-wide">Current Period</th>
              <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-wide">Previous Period</th>
              <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-wide">Change</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: "Incidents", current: stats.totals.incidents, previous: stats.previousTotals.incidents },
              { label: "Near Misses", current: stats.totals.nearMisses, previous: stats.previousTotals.nearMisses },
              { label: "Corrective Actions Created", current: Object.values(stats.correctiveActionsByStatus).reduce((a, b) => a + b, 0), previous: stats.previousTotals.correctiveActions },
            ].map((row) => {
              const change = row.previous === 0 ? (row.current === 0 ? "—" : "New") : `${Math.round(((row.current - row.previous) / row.previous) * 100)}%`;
              return (
                <tr key={row.label} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-text-primary">{row.label}</td>
                  <td className="px-4 py-2 text-text-secondary">{row.current}</td>
                  <td className="px-4 py-2 text-text-secondary">{row.previous}</td>
                  <td className="px-4 py-2 text-text-secondary">{change}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="border-t border-border px-4 py-2 text-[11px] text-text-muted">
          Change is a factual period-over-period comparison — an increase or decrease is not inherently good or bad.
        </p>
      </div>
    </div>
  );
}
