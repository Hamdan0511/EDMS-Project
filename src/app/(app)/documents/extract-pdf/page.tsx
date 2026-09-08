import { requirePageContext } from "@/lib/page-context";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ExtractPdfTool } from "@/components/documents/extract-pdf-tool";

export default async function ExtractPdfPage() {
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
      <div>
        <PageHeader title="Extract PDF" />
        <div className="p-6">
          <EmptyState
            title="You do not have permission to extract PDF pages"
            description="Your role on this project is Viewer, which allows reading documents but not creating or uploading them."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Extract PDF" />
      <div className="p-6">
        <ExtractPdfTool projectId={membership.projectId} />
      </div>
    </div>
  );
}
