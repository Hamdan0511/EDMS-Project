import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { buttonClass } from "@/components/ui/button";
import { RegisterAsDocumentModal } from "@/components/documents/register-as-document-modal";
import { DeleteTemporaryFileButton } from "@/components/documents/delete-temporary-file-button";
import { ChevronLeft, Download } from "@/components/ui/icons";
import { formatBytes } from "@/lib/files/file-types";

export default async function TemporaryFileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { membership } = await requirePageContext();
  const { id } = await params;

  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  const file = await prisma.temporaryFile.findFirst({
    where: { id, projectId: membership.projectId },
    include: { uploadedBy: true, registeredDocument: true },
  });
  if (!file) notFound();

  const documentTypes = await prisma.documentType.findMany({
    where: { projectId: membership.projectId },
    orderBy: { name: "asc" },
  });
  const canManage = membership.role !== "VIEWER";

  return (
    <div>
      <PageHeader
        title="Temporary File Details"
        actions={
          <>
            <Link href="/documents/temporary-files" className={buttonClass("secondary", "md")}>
              <ChevronLeft size={14} />
              Back
            </Link>
            <a
              href={`/api/temporary-files/${file.id}/file?download=1`}
              className={buttonClass("secondary", "md")}
            >
              <Download size={14} />
              Download
            </a>
            {canManage && file.status !== "REGISTERED" && (
              <RegisterAsDocumentModal
                temporaryFileId={file.id}
                fileName={file.originalFileName}
                suggestedTitle={file.originalFileName.replace(/\.[a-z0-9]+$/i, "")}
                documentTypeNames={documentTypes.map((t) => t.name)}
              />
            )}
            {canManage && file.status !== "REGISTERED" && (
              <DeleteTemporaryFileButton id={file.id} fileName={file.originalFileName} redirectTo="/documents/temporary-files" />
            )}
          </>
        }
      />
      <div className="mx-auto w-full max-w-2xl p-6">
        <div className="rounded-[3px] border border-border bg-white">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-base font-semibold text-text-primary">{file.originalFileName}</h2>
          </div>
          <SectionHeader>Details</SectionHeader>
          <div className="flex flex-col gap-2 px-4 py-3 text-[13px]">
            <Row label="Uploaded By" value={file.uploadedBy.name} />
            <Row label="Date Uploaded" value={file.uploadedAt.toLocaleString("en-GB")} />
            <Row label="File Size" value={formatBytes(file.sizeBytes)} />
            <Row label="File Type" value={file.mimeType} />
            <Row label="Project" value={membership.project.name} />
            <Row label="Status" value={file.status === "TEMPORARY" ? "Temporary" : file.status === "PROCESSING" ? "Processing" : "Registered"} />
          </div>

          {file.status === "REGISTERED" && file.registeredDocument && (
            <>
              <SectionHeader>Registered Document</SectionHeader>
              <div className="flex flex-col gap-2 px-4 py-3 text-[13px]">
                <Row label="Document No" value={file.registeredDocument.documentNo} />
                <Row label="Title" value={file.registeredDocument.title} />
                <Row label="Revision" value={file.registeredDocument.currentRevision} />
                <Link
                  href={`/documents?q=${encodeURIComponent(file.registeredDocument.documentNo)}`}
                  className="mt-1 text-brand-700 hover:underline"
                >
                  View in Document Register
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 text-text-muted">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
