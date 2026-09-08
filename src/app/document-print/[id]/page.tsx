import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { PrintTrigger } from "@/components/ui/print-trigger";
import { ShanfariLogo } from "@/components/ui/shanfari-logo";
import { DOCUMENT_STATUS_LABELS } from "@/lib/documents/status";

export default async function DocumentPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { membership } = await requirePageContext();
  const { id } = await params;

  if (!membership) notFound();

  const document = await prisma.document.findFirst({
    where: { id, projectId: membership.projectId },
    include: { type: true, createdBy: { include: { organization: true } } },
  });
  if (!document) notFound();

  const project = await prisma.project.findUnique({ where: { id: membership.projectId } });

  return (
    <div className="print-page">
      <PrintTrigger />
      <style>{`
        @page { size: A4; margin: 16mm; }
        body { background: white; }
        .print-page { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; font-size: 12px; max-width: 210mm; margin: 0 auto; padding: 12px; }
        table.print-meta { width: 100%; border-collapse: collapse; margin: 10px 0; }
        table.print-meta td { padding: 5px 0; vertical-align: top; }
        .print-label { color: #71695f; text-transform: uppercase; font-size: 10px; font-weight: 600; }
        @media screen { .print-page { padding: 24px; box-shadow: 0 0 0 1px #ded6c8; margin: 24px auto; } }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {(project?.name ?? membership.project.name).toUpperCase()}
          </div>
          {project?.clientName && <div>{project.clientName}</div>}
          {project?.location && <div>{project.location}</div>}
        </div>
        <ShanfariLogo variant="stacked" size={20} />
      </div>

      <h1 style={{ fontSize: 15, borderTop: "1px solid #ded6c8", borderBottom: "1px solid #ded6c8", padding: "10px 0", marginTop: 12 }}>
        {document.title}
      </h1>

      <table className="print-meta">
        <tbody>
          <tr>
            <td style={{ width: "33%" }}>
              <div className="print-label">Document No.</div>
              {document.documentNo}
            </td>
            <td style={{ width: "33%" }}>
              <div className="print-label">Revision</div>
              {document.currentRevision || "—"}
            </td>
            <td>
              <div className="print-label">Document Type</div>
              {document.type?.name ?? "—"}
            </td>
          </tr>
          <tr>
            <td>
              <div className="print-label">Status</div>
              {DOCUMENT_STATUS_LABELS[document.status]}
            </td>
            <td>
              <div className="print-label">Discipline</div>
              {document.discipline ?? "—"}
            </td>
            <td>
              <div className="print-label">Uploaded By</div>
              {document.createdBy.name}
            </td>
          </tr>
          <tr>
            <td>
              <div className="print-label">Organization</div>
              {document.createdBy.organization.name}
            </td>
            <td>
              <div className="print-label">Date Uploaded</div>
              {document.createdAt.toLocaleDateString("en-GB")}
            </td>
            <td>
              <div className="print-label">Date Modified</div>
              {document.updatedAt.toLocaleDateString("en-GB")}
            </td>
          </tr>
        </tbody>
      </table>

      {document.description && (
        <div style={{ marginTop: 16 }}>
          <div className="print-label" style={{ marginBottom: 4 }}>Description</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{document.description}</div>
        </div>
      )}
    </div>
  );
}
