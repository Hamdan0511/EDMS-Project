import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { listFieldAreaTree } from "@/lib/services/field/area-service";
import { EmptyState } from "@/components/ui/empty-state";
import { NewInspectionForm } from "@/components/field/new-inspection-form";
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
  const projectId = membership.projectId;
  const canManage = await hasPermission(user.id, "FIELD_MANAGE_INSPECTIONS", { projectId });
  if (!canManage) {
    return (
      <div className="p-6">
        <EmptyState title="You do not have permission to schedule inspections" />
      </div>
    );
  }

  const [templates, areaTree, projectMembers] = await Promise.all([
    prisma.fieldInspectionTemplate.findMany({ where: { projectId, isActive: true }, orderBy: { name: "asc" } }),
    listFieldAreaTree(projectId),
    prisma.projectMember.findMany({ where: { projectId }, include: { user: true }, orderBy: { user: { name: "asc" } } }),
  ]);

  if (templates.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          title="No inspection templates available"
          description="Create a checklist template first before scheduling an inspection."
          action={
            <Link href="/field/inspections/templates/new" className="text-[13px] font-medium text-brand-700 hover:underline">
              Create a Template
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardCheck size={20} className="text-brand-700" />
        <h1 className="text-lg font-semibold tracking-tight text-text-primary">New Inspection</h1>
      </div>
      <div className="mx-auto max-w-xl">
        <Link href="/field/inspections" className="mb-3 inline-block text-[12px] text-brand-700 hover:underline">
          ← Back to Quality Inspections
        </Link>
        <NewInspectionForm
          projectId={projectId}
          templates={templates.map((t) => ({ id: t.id, name: t.name }))}
          areaTree={areaTree}
          members={projectMembers.map((m) => ({ id: m.user.id, name: m.user.name }))}
        />
      </div>
    </div>
  );
}
