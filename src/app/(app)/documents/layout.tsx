import { requirePageContext } from "@/lib/page-context";
import { DocumentsSidebar } from "@/components/documents/documents-sidebar";

export default async function DocumentsLayout({ children }: { children: React.ReactNode }) {
  const { membership } = await requirePageContext();

  if (!membership) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-start">
      <DocumentsSidebar projectId={membership.projectId} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
