import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Button, buttonClass } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar, ResultSummary } from "@/components/ui/filter-bar";
import { StatusTabs, type StatusTab } from "@/components/ui/status-tabs";
import { FieldPageHeader } from "@/components/field/field-page-header";
import { FlaskConical, Plus } from "@/components/ui/icons";
import { TEST_RESULT_LABELS, TEST_RESULT_BADGE_CLASSES } from "@/lib/field/status";
import type { FieldTestResult, Prisma } from "@prisma/client";

const TEST_RESULT_ORDER: FieldTestResult[] = ["PASS", "FAIL", "PENDING", "NOT_APPLICABLE"];

export default async function TestsPage({
  searchParams,
}: {
  searchParams: Promise<{ resultStatus?: string; areaId?: string }>;
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
  const canManage = await hasPermission(user.id, "FIELD_MANAGE_TESTS", { projectId });

  const baseFilters = { projectId, ...(params.areaId ? { areaId: params.areaId } : {}) } as Prisma.FieldTestWhereInput;
  const where: Prisma.FieldTestWhereInput = { ...baseFilters, ...(params.resultStatus ? { resultStatus: params.resultStatus as never } : {}) };

  const [tests, resultCounts, allCount] = await Promise.all([
    prisma.fieldTest.findMany({
      where,
      include: { area: true, type: true, previousTest: true, retest: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.fieldTest.groupBy({ by: ["resultStatus"], where: baseFilters, _count: true }),
    prisma.fieldTest.count({ where: baseFilters }),
  ]);

  function buildHref(resultStatus?: string): string {
    const sp = new URLSearchParams();
    if (params.areaId) sp.set("areaId", params.areaId);
    if (resultStatus) sp.set("resultStatus", resultStatus);
    const qs = sp.toString();
    return `/field/tests${qs ? `?${qs}` : ""}`;
  }
  const countByResult = Object.fromEntries(resultCounts.map((r) => [r.resultStatus, r._count]));
  const tabs: StatusTab[] = [
    { key: "all", label: "All", count: allCount, href: buildHref() },
    ...TEST_RESULT_ORDER.map((r) => ({ key: r, label: TEST_RESULT_LABELS[r], count: countByResult[r] ?? 0, href: buildHref(r) })),
  ];

  return (
    <div className="p-6">
      <FieldPageHeader
        title="Test & Inspection Results"
        description="Every test result is preserved — a failed test is never overwritten, only retested with the full history kept visible."
        action={
          canManage ? (
            <Link href="/field/tests/new" className={buttonClass("primary", "md")}>
              <Plus size={14} />
              Record Test
            </Link>
          ) : undefined
        }
      />

      <div className="mt-4">
        <StatusTabs tabs={tabs} active={params.resultStatus || "all"} />
      </div>

      <form action="/field/tests" method="GET" className="mt-1">
        <FilterBar>
          <Select name="resultStatus" defaultValue={params.resultStatus ?? ""} className="w-56">
            <option value="">All Results</option>
            {Object.entries(TEST_RESULT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Search</Button>
          <Link href="/field/tests" className="text-[13px] text-text-secondary hover:underline">Clear All</Link>
        </FilterBar>
      </form>

      {tests.length === 0 ? (
        <EmptyState
          icon={<FlaskConical size={26} strokeWidth={1.25} />}
          title="No tests recorded yet"
          description="Once a test result is recorded, it will appear here."
          action={
            canManage ? (
              <Link href="/field/tests/new" className={buttonClass("primary", "md")}>
                Record Test
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <ResultSummary count={tests.length} noun="test" />
          <Table>
            <Thead>
              <Tr>
                <Th>Test No.</Th>
                <Th>Type</Th>
                <Th>Location</Th>
                <Th>Tested By</Th>
                <Th>Date</Th>
                <Th>Result</Th>
                <Th>Chain</Th>
              </Tr>
            </Thead>
            <Tbody>
              {tests.map((t) => (
                <Tr key={t.id}>
                  <Td>
                    <Link href={`/field/tests/${t.id}`} className="font-medium text-brand-700 hover:underline">
                      {t.testNumber}
                    </Link>
                  </Td>
                  <Td className="text-text-secondary">{t.type?.name ?? "—"}</Td>
                  <Td className="text-text-secondary">{t.area?.name ?? "—"}</Td>
                  <Td className="text-text-secondary">{t.testedByName}</Td>
                  <Td className="text-text-secondary">{t.testDate.toLocaleDateString("en-GB")}</Td>
                  <Td>
                    <StatusBadge label={TEST_RESULT_LABELS[t.resultStatus]} className={TEST_RESULT_BADGE_CLASSES[t.resultStatus]} />
                  </Td>
                  <Td className="text-[11px] text-text-muted">
                    {t.previousTest ? `Retest of ${t.previousTest.testNumber}` : t.retest ? `Retested as ${t.retest.testNumber}` : "—"}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </>
      )}
    </div>
  );
}
