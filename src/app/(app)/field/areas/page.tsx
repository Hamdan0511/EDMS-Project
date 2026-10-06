import { requirePageContext } from "@/lib/page-context";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { listFieldAreaTree } from "@/lib/services/field/area-service";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldPageHeader } from "@/components/field/field-page-header";
import { FieldAreasManager } from "@/components/field/field-areas-manager";

const AREA_MANAGE_PERMISSIONS = [
  "FIELD_MANAGE_OBSERVATIONS",
  "FIELD_MANAGE_INSPECTIONS",
  "FIELD_MANAGE_ISSUES",
  "FIELD_MANAGE_PUNCH",
  "FIELD_MANAGE_ITP",
  "FIELD_MANAGE_TESTS",
  "FIELD_MANAGE_PHOTOS",
];

export default async function FieldAreasPage() {
  const { user, membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }
  const projectId = membership.projectId;
  const canManage = await hasAnyPermission(user.id, AREA_MANAGE_PERMISSIONS, { projectId });
  const tree = await listFieldAreaTree(projectId);

  return (
    <div className="p-6">
      <FieldPageHeader
        title="Site Areas"
        description="The location hierarchy used across Observations, Issues, Inspections, Punch, ITP, Tests, and Photos."
      />
      <div className="mt-4">
        <FieldAreasManager projectId={projectId} tree={tree} canManage={canManage} />
      </div>
    </div>
  );
}
