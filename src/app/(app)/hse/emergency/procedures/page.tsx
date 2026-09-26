import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button, buttonClass } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar, ResultSummary } from "@/components/ui/filter-bar";
import { HsePageHeader } from "@/components/hse/hse-page-header";
import { BookOpen, Plus } from "@/components/ui/icons";
import { EMERGENCY_PROCEDURE_STATUS_LABELS, EMERGENCY_PROCEDURE_STATUS_BADGE_CLASSES } from "@/lib/hse/status";
import { EMERGENCY_TYPES } from "@/lib/hse/emergency";
import type { Prisma } from "@prisma/client";

export default async function EmergencyProceduresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string }>;
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
  const canManage = await hasPermission(user.id, "HSE_MANAGE_EMERGENCY", { projectId });

  const where: Prisma.HseEmergencyProcedureWhereInput = {
    projectId,
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.type ? { emergencyType: params.type } : {}),
    ...(params.q?.trim() ? { title: { contains: params.q.trim(), mode: "insensitive" } } : {}),
  };

  const procedures = await prisma.hseEmergencyProcedure.findMany({
    where,
    include: { reviewedBy: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6">
      <HsePageHeader
        title="Emergency Procedures"
        description="Fire, medical, chemical spill, and other emergency response procedures for this project."
        action={
          canManage ? (
            <Link href="/hse/emergency/procedures/new" className={buttonClass("primary", "md")}>
              <Plus size={14} />
              New Procedure
            </Link>
          ) : undefined
        }
      />

      <form action="/hse/emergency/procedures" method="GET" className="mt-4">
        <FilterBar>
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search title…" className="w-64" />
          <Select name="type" defaultValue={params.type ?? ""} className="w-44">
            <option value="">All Types</option>
            {EMERGENCY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
          <Select name="status" defaultValue={params.status ?? ""} className="w-40">
            <option value="">All Statuses</option>
            {Object.entries(EMERGENCY_PROCEDURE_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Search</Button>
          <Link href="/hse/emergency/procedures" className="text-[13px] text-text-secondary hover:underline">Clear</Link>
        </FilterBar>
      </form>

      {procedures.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={26} strokeWidth={1.25} />}
          title="No emergency procedures have been created yet"
          description="Create procedures for fire, medical, chemical spill, and other emergencies specific to this project."
          action={
            canManage ? (
              <Link href="/hse/emergency/procedures/new" className={buttonClass("primary", "md")}>
                New Procedure
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <ResultSummary count={procedures.length} noun="procedure" />
          <Table>
            <Thead>
              <Tr>
                <Th>Title</Th>
                <Th>Emergency Type</Th>
                <Th>Status</Th>
                <Th>Last Reviewed</Th>
                <Th>Reviewed By</Th>
              </Tr>
            </Thead>
            <Tbody>
              {procedures.map((p) => (
                <Tr key={p.id}>
                  <Td>
                    <Link href={`/hse/emergency/procedures/${p.id}`} className="font-medium text-brand-700 hover:underline">
                      {p.title}
                    </Link>
                  </Td>
                  <Td className="text-text-secondary">{p.emergencyType}</Td>
                  <Td>
                    <StatusBadge label={EMERGENCY_PROCEDURE_STATUS_LABELS[p.status]} className={EMERGENCY_PROCEDURE_STATUS_BADGE_CLASSES[p.status]} />
                  </Td>
                  <Td className="text-text-secondary">{p.lastReviewedAt ? p.lastReviewedAt.toLocaleDateString("en-GB") : "Not yet reviewed"}</Td>
                  <Td className="text-text-secondary">{p.reviewedBy?.name ?? "—"}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </>
      )}
    </div>
  );
}
