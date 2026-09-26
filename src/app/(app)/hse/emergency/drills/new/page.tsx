import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { NewEmergencyDrillForm } from "@/components/hse/new-emergency-drill-form";
import { CalendarClock } from "@/components/ui/icons";

export default async function NewEmergencyDrillPage() {
  const { user, membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  const canManage = await hasPermission(user.id, "HSE_MANAGE_EMERGENCY", { projectId: membership.projectId });
  if (!canManage) {
    return (
      <div className="p-6">
        <EmptyState title="You do not have permission to schedule emergency drills" />
      </div>
    );
  }

  const projectMembers = await prisma.projectMember.findMany({
    where: { projectId: membership.projectId },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <CalendarClock size={20} className="text-brand-700" />
        <h1 className="text-lg font-semibold tracking-tight text-text-primary">Schedule Emergency Drill</h1>
      </div>
      <div className="mx-auto max-w-2xl">
        <Link href="/hse/emergency/drills" className="mb-3 inline-block text-[12px] text-brand-700 hover:underline">
          ← Back to Emergency Drills
        </Link>
        <NewEmergencyDrillForm
          projectId={membership.projectId}
          members={projectMembers.map((m) => ({ id: m.user.id, name: m.user.name }))}
        />
      </div>
    </div>
  );
}
