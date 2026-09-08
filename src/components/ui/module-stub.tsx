import type { ComponentType } from "react";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export function ModuleStubPage({
  title,
  icon: Icon,
}: {
  title: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="p-6">
        <EmptyState
          icon={<Icon size={26} strokeWidth={1.25} />}
          title={`${title} is not yet implemented`}
          description="This module's route and navigation entry are in place; its functionality will be built in a later milestone."
        />
      </div>
    </div>
  );
}
