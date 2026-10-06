import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { listFieldAreaTree } from "@/lib/services/field/area-service";
import { EmptyState } from "@/components/ui/empty-state";
import { NewIssueForm } from "@/components/field/new-issue-form";
import { AlertCircle } from "@/components/ui/icons";

export default async function NewIssuePage({
  searchParams,
}: {
  searchParams: Promise<{ siteWalkId?: string; areaId?: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }
  const projectId = membership.projectId;
  const params = await searchParams;
  const canManage = await hasPermission(user.id, "FIELD_MANAGE_ISSUES", { projectId });
  if (!canManage) {
    return (
      <div className="p-6">
        <EmptyState title="You do not have permission to create issues" />
      </div>
    );
  }

  const [areaTree, existingTypeRows, projectMembers] = await Promise.all([
    listFieldAreaTree(projectId),
    prisma.fieldLookup.findMany({ where: { projectId, kind: "ISSUE_TYPE", isActive: true }, orderBy: { name: "asc" } }),
    prisma.projectMember.findMany({ where: { projectId }, include: { user: true }, orderBy: { user: { name: "asc" } } }),
  ]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <AlertCircle size={20} className="text-brand-700" />
        <h1 className="text-lg font-semibold tracking-tight text-text-primary">New Issue</h1>
      </div>
      <div className="mx-auto max-w-xl">
        <Link href="/field/issues" className="mb-3 inline-block text-[12px] text-brand-700 hover:underline">
          ← Back to Site Issues
        </Link>
        <NewIssueForm
          projectId={projectId}
          areaTree={areaTree}
          existingTypes={existingTypeRows.map((t) => t.name)}
          members={projectMembers.map((m) => ({ id: m.user.id, name: m.user.name }))}
          siteWalkId={params.siteWalkId}
          defaultAreaId={params.areaId}
        />
      </div>
    </div>
  );
}
