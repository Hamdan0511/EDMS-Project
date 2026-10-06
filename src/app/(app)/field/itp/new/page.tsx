import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { listFieldAreaTree } from "@/lib/services/field/area-service";
import { EmptyState } from "@/components/ui/empty-state";
import { NewItpForm } from "@/components/field/new-itp-form";
import { ClipboardList } from "@/components/ui/icons";

export default async function NewItpPage() {
  const { user, membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }
  const projectId = membership.projectId;
  const canManage = await hasPermission(user.id, "FIELD_MANAGE_ITP", { projectId });
  if (!canManage) {
    return (
      <div className="p-6">
        <EmptyState title="You do not have permission to create ITPs" />
      </div>
    );
  }

  const areaTree = await listFieldAreaTree(projectId);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardList size={20} className="text-brand-700" />
        <h1 className="text-lg font-semibold tracking-tight text-text-primary">New ITP</h1>
      </div>
      <div className="mx-auto max-w-2xl">
        <Link href="/field/itp" className="mb-3 inline-block text-[12px] text-brand-700 hover:underline">
          ← Back to ITP & Hold Points
        </Link>
        <NewItpForm projectId={projectId} areaTree={areaTree} />
      </div>
    </div>
  );
}
