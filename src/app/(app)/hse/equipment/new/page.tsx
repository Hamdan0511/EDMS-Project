import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { NewEquipmentForm } from "@/components/hse/new-equipment-form";
import { HardHat } from "@/components/ui/icons";

export default async function NewEquipmentPage() {
  const { user, membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  const canManage = await hasPermission(user.id, "HSE_MANAGE_EQUIPMENT", { projectId: membership.projectId });
  if (!canManage) {
    return (
      <div className="p-6">
        <EmptyState title="You do not have permission to register equipment" />
      </div>
    );
  }

  const [members, projectMembers] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId: membership.projectId },
      include: { organization: true, user: true },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.projectMember.findMany({
      where: { projectId: membership.projectId },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const organizations = Array.from(
    new Map(members.map((m) => [m.organization.id, { id: m.organization.id, name: m.organization.name }])).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <HardHat size={20} className="text-brand-700" />
        <h1 className="text-lg font-semibold tracking-tight text-text-primary">Register Equipment</h1>
      </div>
      <div className="mx-auto max-w-xl">
        <Link href="/hse/equipment" className="mb-3 inline-block text-[12px] text-brand-700 hover:underline">
          ← Back to Equipment Safety
        </Link>
        <NewEquipmentForm
          projectId={membership.projectId}
          organizations={organizations}
          members={projectMembers.map((m) => ({ id: m.user.id, name: m.user.name }))}
        />
      </div>
    </div>
  );
}
