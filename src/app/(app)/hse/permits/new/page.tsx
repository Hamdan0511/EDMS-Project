import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { NewPermitForm } from "@/components/hse/new-permit-form";
import { FileWarning } from "@/components/ui/icons";

export default async function NewPermitPage() {
  const { user, membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  const canManage = await hasPermission(user.id, "HSE_MANAGE_PERMITS", { projectId: membership.projectId });
  if (!canManage) {
    return (
      <div className="p-6">
        <EmptyState title="You do not have permission to create permits to work" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <FileWarning size={20} className="text-amber-600" />
        <h1 className="text-[20px] font-semibold text-text-primary">New Permit to Work</h1>
      </div>
      <div className="mx-auto max-w-xl">
        <Link href="/hse/permits" className="mb-3 inline-block text-[12px] text-brand-700 hover:underline">
          ← Back to Permits to Work
        </Link>
        <NewPermitForm projectId={membership.projectId} />
      </div>
    </div>
  );
}
