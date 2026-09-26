import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { NewEmergencyProcedureForm } from "@/components/hse/new-emergency-procedure-form";
import { BookOpen } from "@/components/ui/icons";

export default async function NewEmergencyProcedurePage() {
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
        <EmptyState title="You do not have permission to create emergency procedures" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <BookOpen size={20} className="text-brand-700" />
        <h1 className="text-lg font-semibold tracking-tight text-text-primary">New Emergency Procedure</h1>
      </div>
      <div className="mx-auto max-w-2xl">
        <Link href="/hse/emergency/procedures" className="mb-3 inline-block text-[12px] text-brand-700 hover:underline">
          ← Back to Emergency Procedures
        </Link>
        <NewEmergencyProcedureForm projectId={membership.projectId} />
      </div>
    </div>
  );
}
