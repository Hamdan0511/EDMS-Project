import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { listFieldAreaTree } from "@/lib/services/field/area-service";
import { EmptyState } from "@/components/ui/empty-state";
import { NewPunchlistForm } from "@/components/field/new-punchlist-form";
import { ListTodo } from "@/components/ui/icons";

export default async function NewPunchlistPage() {
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
        <EmptyState title="You do not have permission to create punchlists" />
      </div>
    );
  }

  const [areaTree, projectMembers] = await Promise.all([
    listFieldAreaTree(projectId),
    prisma.projectMember.findMany({ where: { projectId }, include: { user: true }, orderBy: { user: { name: "asc" } } }),
  ]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <ListTodo size={20} className="text-brand-700" />
        <h1 className="text-lg font-semibold tracking-tight text-text-primary">New Punchlist</h1>
      </div>
      <div className="mx-auto max-w-xl">
        <Link href="/field/punch" className="mb-3 inline-block text-[12px] text-brand-700 hover:underline">
          ← Back to Punch / Snagging
        </Link>
        <NewPunchlistForm
          projectId={projectId}
          areaTree={areaTree}
          members={projectMembers.map((m) => ({ id: m.user.id, name: m.user.name }))}
        />
      </div>
    </div>
  );
}
