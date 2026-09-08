import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { buttonClass } from "@/components/ui/button";
import { NewRevisionButton } from "@/components/documents/new-revision-modal";
import { EditMetadataButton } from "@/components/documents/edit-metadata-modal";
import { DeleteDocumentButton } from "@/components/documents/delete-document-button";
import { ChevronLeft, Download, Printer } from "@/components/ui/icons";
import { DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_BADGE_CLASSES } from "@/lib/documents/status";
import { formatBytes } from "@/lib/files/file-types";

export default async function DocumentDetailPage({
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

  const document = await prisma.document.findFirst({
    where: { id, projectId: membership.projectId },
    include: {
      type: true,
      createdBy: { include: { organization: true } },
      versions: { orderBy: { versionNo: "desc" }, include: { uploadedBy: true } },
    },
  });
  if (!document) notFound();

  const currentVersion = document.versions[0] ?? null;
  const canManage = membership.role !== "VIEWER";
  const documentTypes = await prisma.documentType.findMany({
    where: { projectId: membership.projectId },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title={`${document.documentNo} — ${document.title}`}
        actions={
          <>
            <Link href="/documents" className={buttonClass("secondary", "md")}>
              <ChevronLeft size={14} />
              Back
            </Link>
            {currentVersion && (
              <a href={`/api/documents/${document.id}/file?download=1`} className={buttonClass("secondary", "md")}>
                <Download size={14} />
                Download
              </a>
            )}
            {currentVersion && (
              <a
                href={`/document-print/${document.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass("secondary", "md")}
              >
                <Printer size={14} />
                Print
              </a>
            )}
            {canManage && (
              <NewRevisionButton documentId={document.id} suggestedRevision={nextRevisionGuess(document.currentRevision)} />
            )}
            {canManage && (
              <EditMetadataButton
                documentId={document.id}
                initial={{
                  title: document.title,
                  typeName: document.type?.name ?? "",
                  discipline: document.discipline ?? "",
                  status: document.status,
                  description: document.description ?? "",
                }}
                documentTypeNames={documentTypes.map((t) => t.name)}
              />
            )}
            {canManage && <DeleteDocumentButton documentId={document.id} documentNo={document.documentNo} title={document.title} />}
          </>
        }
      />

      <div className="mx-auto w-full max-w-4xl p-6">
        <div className="rounded-[3px] border border-border bg-white">
          <SectionHeader>Details</SectionHeader>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
            <Row label="Document No." value={document.documentNo} />
            <Row label="Current Revision" value={document.currentRevision || "—"} />
            <Row label="Title" value={document.title} />
            <Row label="Document Type" value={document.type?.name ?? "—"} />
            <Row
              label="Status"
              value={
                <span className={`rounded-[3px] px-2 py-0.5 text-[11px] font-medium ${DOCUMENT_STATUS_BADGE_CLASSES[document.status]}`}>
                  {DOCUMENT_STATUS_LABELS[document.status]}
                </span>
              }
            />
            <Row label="Discipline" value={document.discipline ?? "—"} />
            <Row label="Uploaded By" value={document.createdBy.name} />
            <Row label="Organization" value={document.createdBy.organization.name} />
            <Row label="Date Uploaded" value={document.createdAt.toLocaleDateString("en-GB")} />
            <Row label="Date Modified" value={document.updatedAt.toLocaleDateString("en-GB")} />
            <Row label="Workflow Status" value="—" />
            {document.description && <Row label="Description" value={document.description} full />}
          </div>

          {currentVersion && currentVersion.mimeType === "application/pdf" && (
            <>
              <SectionHeader>Preview</SectionHeader>
              <div className="p-4">
                <iframe
                  src={`/api/documents/${document.id}/file`}
                  className="h-[600px] w-full rounded-[3px] border border-border"
                  title={`Preview of ${document.title}`}
                />
              </div>
            </>
          )}

          <SectionHeader>Document History</SectionHeader>
          <div className="p-4">
            {document.versions.length === 0 ? (
              <p className="text-[13px] text-text-muted">No file versions yet.</p>
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Revision</Th>
                    <Th>Date</Th>
                    <Th>Uploaded By</Th>
                    <Th>File</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {document.versions.map((v, i) => (
                    <Tr key={v.id}>
                      <Td className="font-medium text-text-primary">
                        {v.revision}
                        {i === 0 && (
                          <span className="ml-2 rounded-[3px] bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-800">
                            Current
                          </span>
                        )}
                      </Td>
                      <Td className="text-text-secondary">{v.uploadedAt.toLocaleString("en-GB")}</Td>
                      <Td className="text-text-secondary">{v.uploadedBy.name}</Td>
                      <Td>
                        <span className="flex items-center gap-1.5">
                          {v.fileName}
                          <span className="text-text-muted">({formatBytes(v.sizeBytes)})</span>
                        </span>
                      </Td>
                      <Td>
                        <a
                          href={`/api/documents/versions/${v.id}/file`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-700 hover:underline"
                        >
                          Open
                        </a>
                        <span className="mx-1.5 text-text-muted">·</span>
                        <a
                          href={`/api/documents/versions/${v.id}/file?download=1`}
                          className="text-brand-700 hover:underline"
                        >
                          Download
                        </a>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, full }: { label: string; value: React.ReactNode; full?: boolean }) {
  return (
    <div className={`flex gap-2 ${full ? "col-span-2" : ""}`}>
      <span className="w-36 shrink-0 text-text-muted">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}

function nextRevisionGuess(current: string): string {
  const match = /^([A-Za-z]*)(\d+)$/.exec(current.trim());
  if (match) {
    return `${match[1]}${Number(match[2]) + 1}`;
  }
  return current;
}
