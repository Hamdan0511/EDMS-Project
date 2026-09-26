"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** The date range genuinely narrows the dashboard's period-based KPI counts
 * (server-scoped in getHseDashboardData) — Open Items/My Actions remain
 * "current state" regardless of the selected period, matching what those
 * sections mean. */
export function HseDateRangeForm({
  dateFrom,
  dateTo,
  projectName,
}: {
  dateFrom: string;
  dateTo: string;
  projectName: string;
}) {
  return (
    <form action="/hse" method="GET" className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-secondary">
        {projectName}
      </div>
      <Input type="date" name="dateFrom" defaultValue={dateFrom} className="w-36" />
      <span className="text-text-muted">–</span>
      <Input type="date" name="dateTo" defaultValue={dateTo} className="w-36" />
      <Button type="submit" variant="secondary" size="sm">
        Apply
      </Button>
    </form>
  );
}
