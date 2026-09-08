import Link from "next/link";
import { RegisterAsDocumentModal } from "./register-as-document-modal";
import { DeleteTemporaryFileButton } from "./delete-temporary-file-button";
import { Download, Eye } from "@/components/ui/icons";
import type { TemporaryFileStatus } from "@prisma/client";

export function TemporaryFileRowActions({
  id,
  fileName,
  suggestedTitle,
  status,
  canManage,
  documentTypeNames,
}: {
  id: string;
  fileName: string;
  suggestedTitle: string;
  status: TemporaryFileStatus;
  canManage: boolean;
  documentTypeNames: string[];
}) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/documents/temporary-files/${id}`}
        className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-brand-700 hover:underline"
        title="View details"
      >
        <Eye size={13} />
        Details
      </Link>
      <a
        href={`/api/temporary-files/${id}/file?download=1`}
        className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-brand-700 hover:underline"
        title="Download"
      >
        <Download size={13} />
        Download
      </a>
      {canManage && status !== "REGISTERED" && (
        <RegisterAsDocumentModal
          temporaryFileId={id}
          fileName={fileName}
          suggestedTitle={suggestedTitle}
          documentTypeNames={documentTypeNames}
        />
      )}
      {canManage && status !== "REGISTERED" && (
        <DeleteTemporaryFileButton id={id} fileName={fileName} size="sm" />
      )}
    </div>
  );
}
