import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button, buttonClass } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar, ResultSummary } from "@/components/ui/filter-bar";
import { HsePageHeader } from "@/components/hse/hse-page-header";
import { ShieldAlert, Plus } from "@/components/ui/icons";
import { RISK_ASSESSMENT_STATUS_LABELS, RISK_ASSESSMENT_STATUS_BADGE_CLASSES } from "@/lib/hse/status";
import { RISK_LEVEL_LABELS, RISK_LEVEL_BADGE_CLASSES } from "@/lib/hse/risk-matrix";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 25;

export default async function RiskAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; risk?: string; page?: string }>;
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
  const page = Math.max(1, Number(params.page) || 1);
  const projectId = membership.projectId;

  const canManage = await hasPermission(user.id, "HSE_MANAGE_RISK_ASSESSMENTS", { projectId });

  const where: Prisma.HseRiskAssessmentWhereInput = {
    projectId,
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.risk ? { initialRisk: params.risk as never } : {}),
    ...(params.q?.trim()
      ? {
          OR: [
            { assessmentNumber: { contains: params.q.trim(), mode: "insensitive" } },
            { activity: { contains: params.q.trim(), mode: "insensitive" } },
            { hazard: { contains: params.q.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.hseRiskAssessment.findMany({
      where,
      include: { responsible: true, controls: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.hseRiskAssessment.count({ where }),
  ]);

  function buildHref(targetPage: number): string {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    if (params.risk) sp.set("risk", params.risk);
    sp.set("page", String(targetPage));
    return `/hse/risk-assessments?${sp.toString()}`;
  }

  return (
    <div className="p-6">
      <HsePageHeader
        title="Risk Assessments"
        description="Formal risk assessments covering activities and hazards on this project."
        action={
          canManage ? (
            <Link href="/hse/risk-assessments/new" className={buttonClass("primary", "md")}>
              <Plus size={14} />
              New Risk Assessment
            </Link>
          ) : undefined
        }
      />

      <form action="/hse/risk-assessments" method="GET" className="mt-4">
        <FilterBar>
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search number, activity, hazard…" className="w-64" />
          <Select name="status" defaultValue={params.status ?? ""} className="w-40">
            <option value="">All Statuses</option>
            {Object.entries(RISK_ASSESSMENT_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Select name="risk" defaultValue={params.risk ?? ""} className="w-40">
            <option value="">All Risk Levels</option>
            {Object.entries(RISK_LEVEL_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Search</Button>
          <Link href="/hse/risk-assessments" className="text-[13px] text-text-secondary hover:underline">Clear</Link>
        </FilterBar>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert size={26} strokeWidth={1.25} />}
          title="No risk assessments found"
          description="Risk assessments created for this project will appear here."
        />
      ) : (
        <>
          <ResultSummary count={total} noun="risk assessment" />
          <Table>
            <Thead>
              <Tr>
                <Th>RA No.</Th>
                <Th>Activity</Th>
                <Th>Hazard</Th>
                <Th>Initial Risk</Th>
                <Th>Controls</Th>
                <Th>Residual Risk</Th>
                <Th>Responsible</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td>
                    <Link href={`/hse/risk-assessments/${r.id}`} className="font-medium text-brand-700 hover:underline">
                      {r.assessmentNumber}
                    </Link>
                  </Td>
                  <Td className="max-w-xs truncate text-text-secondary">{r.activity}</Td>
                  <Td className="max-w-xs truncate text-text-secondary">{r.hazard}</Td>
                  <Td>
                    <StatusBadge label={RISK_LEVEL_LABELS[r.initialRisk]} className={RISK_LEVEL_BADGE_CLASSES[r.initialRisk]} />
                  </Td>
                  <Td className="text-text-secondary">{r.controls.length}</Td>
                  <Td>
                    {r.residualRisk ? (
                      <StatusBadge label={RISK_LEVEL_LABELS[r.residualRisk]} className={RISK_LEVEL_BADGE_CLASSES[r.residualRisk]} />
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </Td>
                  <Td className="text-text-secondary">{r.responsible?.name ?? "—"}</Td>
                  <Td>
                    <StatusBadge label={RISK_ASSESSMENT_STATUS_LABELS[r.status]} className={RISK_ASSESSMENT_STATUS_BADGE_CLASSES[r.status]} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <div className="mt-3">
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} buildHref={buildHref} />
          </div>
        </>
      )}
    </div>
  );
}
