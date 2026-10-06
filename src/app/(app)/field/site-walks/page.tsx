import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { listSiteWalks, START_WALK_PERMISSIONS } from "@/lib/services/field/site-walk-service";
import { listFieldAreaTree } from "@/lib/services/field/area-service";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { ResultSummary } from "@/components/ui/filter-bar";
import { FieldPageHeader } from "@/components/field/field-page-header";
import { NewSiteWalkForm } from "@/components/field/new-site-walk-form";
import { MapPin } from "@/components/ui/icons";

export default async function SiteWalksPage() {
  const { user, membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }
  const projectId = membership.projectId;
  const canManage = await hasAnyPermission(user.id, START_WALK_PERMISSIONS, { projectId });

  const [walks, areaTree] = await Promise.all([listSiteWalks(projectId), listFieldAreaTree(projectId)]);

  return (
    <div className="p-6">
      <FieldPageHeader
        title="Site Walks"
        description="A guided walk-through capture session — observations, issues, punch items, and photos recorded while a walk is active are grouped together automatically."
        action={canManage ? <NewSiteWalkForm projectId={projectId} areaTree={areaTree} /> : undefined}
      />

      {walks.length === 0 ? (
        <EmptyState
          icon={<MapPin size={26} strokeWidth={1.25} />}
          title="No site walks yet"
          description="Start a site walk to group everything captured during a single walk-through."
          action={canManage ? <NewSiteWalkForm projectId={projectId} areaTree={areaTree} /> : undefined}
        />
      ) : (
        <>
          <ResultSummary count={walks.length} noun="site walk" />
          <Table>
            <Thead>
              <Tr>
                <Th>Purpose</Th>
                <Th>Location</Th>
                <Th>Started By</Th>
                <Th>Started</Th>
                <Th>Captured</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {walks.map((w) => {
                const total = w._count.observations + w._count.issues + w._count.punchItems + w._count.photos;
                return (
                  <Tr key={w.id}>
                    <Td>
                      <Link href={`/field/site-walks/${w.id}`} className="font-medium text-brand-700 hover:underline">
                        {w.purpose}
                      </Link>
                    </Td>
                    <Td className="text-text-secondary">{w.area?.name ?? "—"}</Td>
                    <Td className="text-text-secondary">{w.startedBy.name}</Td>
                    <Td className="text-text-secondary">{w.startedAt.toLocaleString("en-GB")}</Td>
                    <Td className="text-text-secondary">{total} record{total === 1 ? "" : "s"}</Td>
                    <Td>
                      {w.endedAt ? (
                        <StatusBadge label="Completed" className="bg-gray-200 text-gray-700" />
                      ) : (
                        <StatusBadge label="Active" className="bg-emerald-100 text-emerald-800" />
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </>
      )}
    </div>
  );
}
