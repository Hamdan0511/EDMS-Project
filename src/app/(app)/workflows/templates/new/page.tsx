import { requirePageContext } from "@/lib/page-context";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/app-shell/page-header";
import { NewWorkflowTemplateForm } from "@/components/workflows/new-workflow-template-form";

export default async function NewWorkflowTemplatePage() {
  const { membership } = await requirePageContext();

  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }
  if (membership.role === "VIEWER") {
    return (
      <div className="p-6">
        <EmptyState title="You do not have permission to create workflow templates" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="New Workflow Template" />
      <div className="mx-auto w-full max-w-3xl p-6">
        <NewWorkflowTemplateForm projectId={membership.projectId} />
      </div>
    </div>
  );
}
