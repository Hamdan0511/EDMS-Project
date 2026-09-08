import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { getMailDetail, getMailThread } from "@/lib/mail/detail";
import { prisma } from "@/lib/prisma";
import { WORKFLOW_STATUS_LABELS } from "@/lib/mail/workflow-status";
import { PrintTrigger } from "@/components/ui/print-trigger";
import { ShanfariLogo } from "@/components/ui/shanfari-logo";

export default async function MailPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ style?: string }>;
}) {
  const { user, membership } = await requirePageContext();
  const { id } = await params;
  const { style = "screen" } = await searchParams;

  if (!membership) notFound();

  const mail = await getMailDetail(id, membership.projectId);
  if (!mail) notFound();
  if (mail.status === "DRAFT" && mail.senderId !== user.id) notFound();

  const project = await prisma.project.findUnique({ where: { id: membership.projectId } });

  const showThread = style === "screen";
  const thread =
    showThread && mail.status === "SENT"
      ? (await getMailThread(mail)).map((m) => ({
          id: m.id,
          subject: m.subject,
          mailNumber: m.mailNumber,
          typeLabel: m.status,
          senderName: m.sender.name,
          senderOrg: m.sender.organization.name,
          date: (m.sentAt ?? m.createdAt).toLocaleString("en-GB"),
        }))
      : [];

  const to = mail.recipients.filter((r) => r.type === "TO");
  const cc = mail.recipients.filter((r) => r.type === "CC");
  const statusLabel = mail.status === "DRAFT" ? "Draft" : WORKFLOW_STATUS_LABELS[mail.workflowStatus];

  return (
    <div className="print-page">
      <PrintTrigger />
      <style>{`
        @page { size: A4; margin: 16mm; }
        body { background: white; }
        .print-page { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; font-size: 12px; max-width: 210mm; margin: 0 auto; padding: 12px; }
        .print-thread-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2dbcc; font-size: 11px; }
        table.print-meta { width: 100%; border-collapse: collapse; margin: 10px 0; }
        table.print-meta td { padding: 4px 0; vertical-align: top; }
        .print-label { color: #71695f; text-transform: uppercase; font-size: 10px; font-weight: 600; }
        @media screen { .print-page { padding: 24px; box-shadow: 0 0 0 1px #ded6c8; margin: 24px auto; } }
      `}</style>

      {showThread && thread.length > 1 && (
        <div style={{ marginBottom: 16 }}>
          {thread.map((t) => (
            <div key={t.id} className="print-thread-row">
              <span>
                <strong>{t.senderName}</strong> ({t.senderOrg})
              </span>
              <span>{t.subject}</span>
              <span>{t.date}</span>
              <span>{t.mailNumber}</span>
            </div>
          ))}
        </div>
      )}

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

      <table className="print-meta">
        <tbody>
          <tr>
            <td style={{ width: "33%" }}>
              <div className="print-label">Mail Type</div>
              {mail.type.name}
            </td>
            <td style={{ width: "33%" }}>
              <div className="print-label">Mail Number</div>
              {mail.mailNumber}
            </td>
            <td>
              <div className="print-label">Reference Number</div>
              {mail.referenceNumber ?? "—"}
            </td>
          </tr>
        </tbody>
      </table>

      <h1 style={{ fontSize: 15, borderTop: "1px solid #ded6c8", borderBottom: "1px solid #ded6c8", padding: "10px 0" }}>
        {mail.subject}
      </h1>

      <table className="print-meta">
        <tbody>
          <tr>
            <td className="print-label" style={{ width: 90 }}>From</td>
            <td>{mail.sender.name} - {mail.sender.organization.name}</td>
          </tr>
          <tr>
            <td className="print-label">To ({to.length})</td>
            <td>{to.map((r) => `${r.user.name} - ${r.user.organization.name}`).join("; ") || "—"}</td>
          </tr>
          {cc.length > 0 && (
            <tr>
              <td className="print-label">Cc ({cc.length})</td>
              <td>{cc.map((r) => `${r.user.name} - ${r.user.organization.name}`).join("; ")}</td>
            </tr>
          )}
          <tr>
            <td className="print-label">Sent</td>
            <td>{mail.sentAt ? mail.sentAt.toLocaleString("en-GB") : "Not sent"}</td>
          </tr>
          <tr>
            <td className="print-label">Status</td>
            <td>{statusLabel}</td>
          </tr>
        </tbody>
      </table>

      <div className="mail-rich-content" style={{ margin: "16px 0" }} dangerouslySetInnerHTML={{ __html: mail.messageHtml }} />

      <div style={{ borderTop: "1px solid #ded6c8", paddingTop: 10 }}>
        <div className="print-label" style={{ marginBottom: 6 }}>
          File Attachments ({mail.attachments.length})
        </div>
        {mail.attachments.length === 0 ? (
          <div>No attachments.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {mail.attachments.map((a) => (
              <li key={a.id}>
                {a.fileName} ({Math.ceil(a.sizeBytes / 1024)} KB)
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
