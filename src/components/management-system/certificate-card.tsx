import Link from "next/link";
import type { ReactNode } from "react";
import { PdfThumbnail } from "@/components/documents/pdf-thumbnail";
import { ShieldCheck, ExternalLink, Download } from "@/components/ui/icons";
import {
  MANAGEMENT_SYSTEM_LABELS,
  ISO_STANDARD_LABELS,
  MANAGEMENT_SYSTEM_DESCRIPTIONS,
} from "@/lib/management-system/status";
import type { ManagementSystemCategory, ManagementSystemCertificate } from "@prisma/client";

function formatDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("en-GB") : "Not specified";
}

/**
 * Shared real-certificate presentation used by both the Overview summary
 * row (compact) and the dedicated ISO Certificates page (full). The preview
 * is always the actual stored PDF's first page (via PdfThumbnail) — never a
 * generated/fabricated certificate image.
 */
export function CertificateCard({
  ms,
  cert,
  canDownload,
  registerHref,
  variant = "compact",
  footer,
}: {
  ms: ManagementSystemCategory;
  cert: ManagementSystemCertificate | null;
  canDownload: boolean;
  registerHref: string;
  variant?: "compact" | "full";
  footer?: ReactNode;
}) {
  const fileHref = cert ? `/api/management-system/certificates/${cert.id}/file` : null;
  const downloadHref = cert ? `/api/management-system/certificates/${cert.id}/file?download=1` : null;

  if (variant === "full") {
    return (
      <div className="flex flex-col overflow-hidden rounded-[3px] border border-border bg-white">
        {fileHref ? (
          <a href={fileHref} target="_blank" rel="noopener noreferrer" className="block h-72 border-b border-border bg-brand-50">
            <PdfThumbnail fileUrl={fileHref} mimeType={cert!.mimeType} alt={`${ISO_STANDARD_LABELS[ms]} certificate preview`} />
          </a>
        ) : (
          <div className="flex h-72 items-center justify-center border-b border-border bg-background text-text-muted">
            <ShieldCheck size={32} strokeWidth={1.25} />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">{MANAGEMENT_SYSTEM_LABELS[ms]}</p>
            <p className="text-[15px] font-semibold text-text-primary">{ISO_STANDARD_LABELS[ms]}</p>
            <p className="text-[12px] text-text-secondary">{MANAGEMENT_SYSTEM_DESCRIPTIONS[ms]}</p>
          </div>

          <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
            <dt className="text-text-muted">Registration No.</dt>
            <dd className="text-text-primary">{cert?.registrationNo ?? "Not specified"}</dd>
            <dt className="text-text-muted">Certifying Body</dt>
            <dd className="text-text-primary">{cert?.certifyingBody ?? "Not specified"}</dd>
            <dt className="text-text-muted">Issue Date</dt>
            <dd className="text-text-primary">{cert ? formatDate(cert.issueDate) : "Not specified"}</dd>
            <dt className="text-text-muted">Valid Until</dt>
            <dd className="text-text-primary">{cert ? formatDate(cert.validUntil) : "Not specified"}</dd>
            <dt className="text-text-muted">Expiry Date</dt>
            <dd className="text-text-primary">{cert ? formatDate(cert.expiryDate) : "Not specified"}</dd>
          </dl>
          {cert?.scope && <p className="text-[11px] text-text-muted">Scope: {cert.scope}</p>}

          <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-border pt-3">
            {fileHref ? (
              <a href={fileHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:underline">
                <ExternalLink size={13} />
                View Certificate
              </a>
            ) : (
              <span className="text-[12px] text-text-muted">No certificate uploaded yet.</span>
            )}
            {canDownload && downloadHref && (
              <a href={downloadHref} className="flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:underline">
                <Download size={13} />
                Download
              </a>
            )}
            <Link href={registerHref} className="ml-auto text-[12px] font-medium text-text-secondary hover:text-brand-700 hover:underline">
              View {MANAGEMENT_SYSTEM_LABELS[ms]} Documents
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[3px] border border-border bg-white p-4">
      <Link
        href={registerHref}
        className="-m-1 flex items-start justify-between gap-2 rounded-[3px] p-1 hover:bg-brand-50/60"
        title={`Filter the register to ${MANAGEMENT_SYSTEM_LABELS[ms]} documents`}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">{MANAGEMENT_SYSTEM_LABELS[ms]}</p>
          <p className="mt-0.5 text-[14px] font-semibold text-text-primary">{ISO_STANDARD_LABELS[ms]}</p>
          <p className="text-[12px] text-text-secondary">{MANAGEMENT_SYSTEM_DESCRIPTIONS[ms]}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] bg-brand-50 text-brand-700">
          <ShieldCheck size={16} />
        </span>
      </Link>

      {fileHref ? (
        <div className="mt-3 flex items-center gap-3">
          <a href={fileHref} target="_blank" rel="noopener noreferrer" className="block h-14 w-11 shrink-0 overflow-hidden rounded-[3px] border border-border bg-brand-50">
            <PdfThumbnail fileUrl={fileHref} mimeType={cert!.mimeType} alt={`${ISO_STANDARD_LABELS[ms]} certificate thumbnail`} />
          </a>
          <div className="flex flex-col gap-1">
            {cert!.registrationNo && <span className="text-[11px] text-text-muted">Reg. {cert!.registrationNo}</span>}
            <a href={fileHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[12px] font-medium text-brand-700 hover:underline">
              <ExternalLink size={12} />
              View Certificate
            </a>
            {canDownload && downloadHref && (
              <a href={downloadHref} className="flex items-center gap-1 text-[12px] font-medium text-brand-700 hover:underline">
                <Download size={12} />
                Download
              </a>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[12px] text-text-muted">No certificate uploaded yet.</p>
      )}

      {footer}
    </div>
  );
}
