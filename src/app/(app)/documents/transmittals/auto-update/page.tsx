import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";

const MAIL_TYPE_NAME: Record<"transmittal" | "tender", string> = {
  transmittal: "Transmittal",
  tender: "Tender Transmittal",
};

export default async function AutoUpdateTransmittedDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ documentIds?: string; kind?: string }>;
}) {
  const { membership } = await requirePageContext();
  const { documentIds: documentIdsParam, kind: kindParam } = await searchParams;
  const kind: "transmittal" | "tender" = kindParam === "tender" ? "tender" : "transmittal";

  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  const projectId = membership.projectId;
  const documentIds = (documentIdsParam ?? "").split(",").filter(Boolean);

  const references =
    documentIds.length > 0
      ? await prisma.mailDocumentReference.findMany({
          where: {
            documentId: { in: documentIds },
            document: { projectId },
            mail: { type: { name: MAIL_TYPE_NAME[kind] } },
          },
          include: {
            document: true,
            mail: {
              include: {
                recipients: { include: { user: { include: { organization: true } } } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

  const outdated = references.filter(
    (ref) => (ref.revisionAtIssue ?? ref.document.currentRevision) !== ref.document.currentRevision,
  );

  return (
    <div>
      <PageHeader title={kind === "tender" ? "Auto Update Tender Transmitted Documents" : "Auto Update Transmitted Documents"} />
      <div className="p-6">
        {documentIds.length === 0 ? (
          <EmptyState
            title="No documents selected"
            description="Select one or more documents in the Document Register first, then choose this action from the Transmit menu."
          />
        ) : outdated.length === 0 ? (
          <EmptyState
            title="Nothing to update"
            description="None of the selected documents have a newer revision than what was already transmitted."
          />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-text-secondary">
              These documents have been revised since they were last transmitted. Re-transmit the current
              revision to keep recipients up to date — the original transmittal record is preserved unchanged.
            </p>
            {outdated.map((ref) => (
              <div
                key={ref.id}
                className="flex items-center justify-between rounded-[3px] border border-border bg-white p-4"
              >
                <div>
                  <p className="text-[13px] font-medium text-text-primary">
                    {ref.document.documentNo} — {ref.document.title}
                  </p>
                  <p className="text-xs text-text-secondary">
                    Transmitted at Rev {ref.revisionAtIssue ?? "—"} via {ref.mail.mailNumber} — now at Rev{" "}
                    {ref.document.currentRevision}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    Previously sent to:{" "}
                    {ref.mail.recipients.map((r) => `${r.user.name} (${r.user.organization.name})`).join(", ") || "—"}
                  </p>
                </div>
                <Link
                  href={`/documents/transmittals/new?kind=${kind}&documentIds=${ref.document.id}`}
                  className={buttonClass("primary", "md")}
                >
                  Re-transmit current revision
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
