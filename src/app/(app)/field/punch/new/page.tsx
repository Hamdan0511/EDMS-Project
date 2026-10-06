import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { listFieldAreaTree } from "@/lib/services/field/area-service";
import { EmptyState } from "@/components/ui/empty-state";
import { NewPunchItemForm } from "@/components/field/new-punch-item-form";
import { ListTodo } from "@/components/ui/icons";

export default async function NewPunchItemPage({
  searchParams,
}: {
  searchParams: Promise<{ punchlistId?: string; siteWalkId?: string; areaId?: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }
  const projectId = membership.projectId;
  const canManage = await hasPermission(user.id, "FIELD_MANAGE_PUNCH", { projectId });
  if (!canManage) {
    return (
      <div className="p-6">
        <EmptyState title="You do not have permission to create punch items" />
      </div>
    );
  }
  const params = await searchParams;

  const [punchlists, areaTree, existingTradeRows, projectMembers] = await Promise.all([
    prisma.fieldPunchlist.findMany({ where: { projectId }, orderBy: { title: "asc" } }),
    listFieldAreaTree(projectId),
    prisma.fieldLookup.findMany({ where: { projectId, kind: "PUNCH_TRADE", isActive: true }, orderBy: { name: "asc" } }),
    prisma.projectMember.findMany({ where: { projectId }, include: { user: true }, orderBy: { user: { name: "asc" } } }),
  ]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <ListTodo size={20} className="text-brand-700" />
        <h1 className="text-lg font-semibold tracking-tight text-text-primary">New Punch Item</h1>
      </div>
      <div className="mx-auto max-w-xl">
        <Link href="/field/punch" className="mb-3 inline-block text-[12px] text-brand-700 hover:underline">
          ← Back to Punch / Snagging
        </Link>
        <NewPunchItemForm
          projectId={projectId}
          punchlists={punchlists.map((p) => ({ id: p.id, title: p.title }))}
          defaultPunchlistId={params.punchlistId}
          areaTree={areaTree}
          existingTrades={existingTradeRows.map((t) => t.name)}
          members={projectMembers.map((m) => ({ id: m.user.id, name: m.user.name }))}
          siteWalkId={params.siteWalkId}
          defaultAreaId={params.areaId}
        />
      </div>
    </div>
  );
}
