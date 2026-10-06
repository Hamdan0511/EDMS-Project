import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { NewInspectionTemplateForm } from "@/components/field/new-inspection-template-form";
import { ClipboardPen } from "@/components/ui/icons";

export default async function NewInspectionTemplatePage() {
  const { user, membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }
  const canManage = await hasPermission(user.id, "FIELD_MANAGE_INSPECTION_TEMPLATES", { projectId: membership.projectId });
  if (!canManage) {
    return (
      <div className="p-6">
        <EmptyState title="You do not have permission to create inspection templates" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardPen size={20} className="text-brand-700" />
        <h1 className="text-lg font-semibold tracking-tight text-text-primary">New Inspection Template</h1>
      </div>
      <div className="mx-auto max-w-2xl">
        <Link href="/field/inspections/templates" className="mb-3 inline-block text-[12px] text-brand-700 hover:underline">
          ← Back to Templates
        </Link>
        <NewInspectionTemplateForm projectId={membership.projectId} />
      </div>
    </div>
  );
}
