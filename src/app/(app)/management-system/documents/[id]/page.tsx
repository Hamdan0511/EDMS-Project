import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonClass } from "@/components/ui/button";
import { ChevronLeft, Download, ExternalLink } from "@/components/ui/icons";
import { PrintButton } from "@/components/management-system/print-button";
import { ReplaceVersionButton } from "@/components/management-system/replace-version-button";
import {
  MANAGEMENT_SYSTEM_LABELS,
  MANAGEMENT_SYSTEM_BADGE_CLASSES,
  ISO_STANDARD_LABELS,
} from "@/lib/management-system/status";

/**
 * This is the version-control / metadata record for a controlled document —
 * not a document viewer, and not linked to from the main register (Name/
 * Document name there go straight to the real file). This page exists
 * purely for revision history and the Replace Version action.
 */
export default async function ManagementSystemDocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;
  const projectId = membership.projectId;

  const document = await prisma.managementSystemDocument.findFirst({
    where: { id, projectId },
    include: {
      createdBy: true,
      versions: { orderBy: { versionNo: "desc" } },
    },
  });
  if (!document) notFound();

  const canManage = await hasPermission(user.id, "MANAGEMENT_SYSTEM_MANAGE", { projectId });
  const canDownload = await hasPermission(user.id, "MANAGEMENT_SYSTEM_DOWNLOAD", { projectId });

  const currentVersion = document.versions.find((v) => v.isCurrent) ?? document.versions[0];

  return (
    <div className="p-6 print:p-0">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4 print:hidden">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Management System Document</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{document.documentNo}</h1>
        </div>
        <div className="flex items-center gap-2">
          {canManage && currentVersion && <ReplaceVersionButton documentId={document.id} currentRevision={document.currentRevision} />}
          <Link href="/management-system" className={buttonClass("secondary", "md")}>
            <ChevronLeft size={14} />
            Back
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl rounded-[3px] border border-border bg-white print:max-w-none print:border-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 print:hidden">
          <StatusBadge label={MANAGEMENT_SYSTEM_LABELS[document.managementSystem]} className={MANAGEMENT_SYSTEM_BADGE_CLASSES[document.managementSystem]} />
          <span className="text-[13px] text-text-secondary">{ISO_STANDARD_LABELS[document.managementSystem]}</span>
          <span className="text-[13px] text-text-secondary">· {document.documentType}</span>
        </div>

        <SectionHeader
          actions={
            <div className="flex items-center gap-2 print:hidden">
              {currentVersion && (
                <a href={`/api/management-system/documents/${document.id}/file`} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm")}>
                  <ExternalLink size={13} />
                  Open Original File
                </a>
              )}
              {currentVersion && canDownload && (
                <a href={`/api/management-system/documents/${document.id}/file?download=1`} className={buttonClass("secondary", "sm")}>
                  <Download size={13} />
                  Download
                </a>
              )}
              <PrintButton />
            </div>
          }
        >
          Document Information
        </SectionHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
          <Row label="Document No" value={document.documentNo} />
          <Row label="Document Name" value={document.title} />
          <Row label="Management System" value={MANAGEMENT_SYSTEM_LABELS[document.managementSystem]} />
          <Row label="Standard" value={ISO_STANDARD_LABELS[document.managementSystem]} />
          <Row label="Revision" value={document.currentRevision} />
          <Row label="Date" value={document.documentDate ? document.documentDate.toLocaleDateString("en-GB") : "Not specified"} />
          <Row label="Author" value={document.author ?? "Not specified"} />
          <Row label="Document Owner" value={document.documentOwner ?? "Not specified"} />
          <Row label="Document Type" value={document.documentType} />
          <Row label="File" value={currentVersion?.fileName ?? "Not available"} />
        </div>

        <SectionHeader>Version History</SectionHeader>
        <ul className="flex flex-col divide-y divide-border">
          {document.versions.map((v) => (
            <li key={v.id} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
              <div>
                <span className="font-medium text-text-primary">Revision {v.revision}</span>
                <span className="ml-2 text-text-muted">{v.fileName}</span>
                {v.notes && <p className="text-[11px] text-text-muted">{v.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                {v.isCurrent && <StatusBadge label="Current" className="bg-emerald-100 text-emerald-800" />}
                <span className="text-[11px] text-text-muted">{v.uploadedAt.toLocaleDateString("en-GB")}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-36 shrink-0 text-text-muted">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
