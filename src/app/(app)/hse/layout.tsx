import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { HseSidebar } from "@/components/hse/hse-sidebar";

export default async function HseLayout({ children }: { children: React.ReactNode }) {
  const { membership } = await requirePageContext();

  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  const canView = await hasPermission(membership.userId, "HSE_VIEW", { projectId: membership.projectId });
  if (!canView) {
    return (
      <div className="p-6">
        <EmptyState title="You do not have permission to access Health & Safety" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-6rem)] items-stretch bg-[#f5f2ec]">
      <HseSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
