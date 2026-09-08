import { requirePageContext } from "@/lib/page-context";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SplitPdfTool } from "@/components/documents/split-pdf-tool";

export default async function SplitPdfPage() {
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
        <PageHeader title="Split a PDF" />
        <div className="p-6">
          <EmptyState
            title="You do not have permission to split PDFs"
            description="Your role on this project is Viewer, which allows reading documents but not creating or uploading them."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Split a PDF" />
      <div className="p-6">
        <SplitPdfTool projectId={membership.projectId} />
      </div>
    </div>
  );
}
