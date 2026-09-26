import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { NewCorrectiveActionForm } from "@/components/hse/new-corrective-action-form";
import { ClipboardCheck } from "@/components/ui/icons";

export default async function NewCorrectiveActionPage({
  searchParams,
}: {
  searchParams: Promise<{ sourceType?: string; sourceId?: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  const canManage = await hasPermission(user.id, "HSE_MANAGE_ACTIONS", { projectId: membership.projectId });
  if (!canManage) {
    return (
      <div className="p-6">
        <EmptyState title="You do not have permission to create corrective actions" />
      </div>
    );
  }

  const params = await searchParams;
  const members = await prisma.projectMember.findMany({
    where: { projectId: membership.projectId },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardCheck size={20} className="text-amber-600" />
        <h1 className="text-[20px] font-semibold text-text-primary">New Corrective Action</h1>
      </div>
      <div className="mx-auto max-w-xl">
        <Link href="/hse/corrective-actions" className="mb-3 inline-block text-[12px] text-brand-700 hover:underline">
          ← Back to Corrective Actions
        </Link>
        <NewCorrectiveActionForm
          projectId={membership.projectId}
          members={members.map((m) => ({ id: m.user.id, name: m.user.name }))}
          sourceType={params.sourceType ?? "manual"}
          sourceId={params.sourceId}
        />
      </div>
    </div>
  );
}
