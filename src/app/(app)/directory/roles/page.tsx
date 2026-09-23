import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { ChevronLeft } from "@/components/ui/icons";
import { PermissionMatrix } from "@/components/directory/permission-matrix";

export default async function RolesAdminPage() {
  const { membership } = await requirePageContext();

  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  const projectId = membership.projectId;
  const canAdminister = await hasPermission(membership.userId, "ADMIN_ROLES", { projectId });
  if (!canAdminister) {
    return (
      <div className="p-6">
        <EmptyState title="You do not have permission to manage roles" />
      </div>
    );
  }

  const [roles, permissions, rolePermissions] = await Promise.all([
    prisma.role.findMany({ where: { scope: "PROJECT" }, orderBy: { name: "asc" } }),
    prisma.permission.findMany({ orderBy: [{ category: "asc" }, { code: "asc" }] }),
    prisma.rolePermission.findMany(),
  ]);

  return (
    <div>
      <PageHeader
        title="Roles &amp; Permissions"
        actions={
          <Link href="/directory" className={buttonClass("secondary", "md")}>
            <ChevronLeft size={14} />
            Back to Directory
          </Link>
        }
      />
      <div className="p-6">
        <p className="mb-4 text-[13px] text-text-secondary">
          Real, database-backed role permissions. Changes take effect immediately for every user holding the role.
        </p>
        <PermissionMatrix
          projectId={projectId}
          roles={roles.map((r) => ({ id: r.id, name: r.name, isSystem: r.isSystem }))}
          permissions={permissions.map((p) => ({ id: p.id, code: p.code, description: p.description, category: p.category }))}
          grants={rolePermissions.map((rp) => `${rp.roleId}:${rp.permissionId}`)}
        />
      </div>
    </div>
  );
}
