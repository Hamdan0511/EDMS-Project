import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { NewInspectionForm } from "@/components/hse/new-inspection-form";
import { ClipboardCheck } from "@/components/ui/icons";

export default async function NewInspectionPage() {
  const { user, membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  const canManage = await hasPermission(user.id, "HSE_MANAGE_INSPECTIONS", { projectId: membership.projectId });
  if (!canManage) {
    return (
      <div className="p-6">
        <EmptyState title="You do not have permission to schedule inspections" />
      </div>
    );
  }

  const [templates, members] = await Promise.all([
    prisma.hseInspectionTemplate.findMany({ where: { projectId: membership.projectId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.projectMember.findMany({ where: { projectId: membership.projectId }, include: { user: true }, orderBy: { user: { name: "asc" } } }),
  ]);

  if (templates.length === 0) {
    return (
      <div className="p-6">
        <EmptyState title="No inspection templates available" description="An administrator must create an inspection template before inspections can be scheduled." />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardCheck size={20} className="text-amber-600" />
        <h1 className="text-[20px] font-semibold text-text-primary">Schedule Inspection</h1>
      </div>
      <div className="mx-auto max-w-xl">
        <Link href="/hse/inspections" className="mb-3 inline-block text-[12px] text-brand-700 hover:underline">
          ← Back to Inspections
        </Link>
        <NewInspectionForm
          projectId={membership.projectId}
          templates={templates.map((t) => ({ id: t.id, name: t.name }))}
          members={members.map((m) => ({ id: m.user.id, name: m.user.name }))}
          currentUserId={user.id}
        />
      </div>
    </div>
  );
}
