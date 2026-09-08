import { requirePageContext } from "@/lib/page-context";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DocumentRegisterView } from "@/components/documents/document-register-view";

export default async function DrawingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { membership } = await requirePageContext();
  const { q = "" } = await searchParams;

  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Drawings" subtitle="Document register filtered to drawing-type documents" />
      <DocumentRegisterView
        projectId={membership.projectId}
        q={q}
        searchAction="/documents/drawings"
        extraWhere={{ type: { name: { contains: "drawing", mode: "insensitive" } } }}
        emptyTitle="No drawings found"
        emptyDescription="Documents whose type contains 'Drawing' will appear here."
      />
    </div>
  );
}
