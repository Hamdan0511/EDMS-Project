import Link from "next/link";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { TemporaryFileRowActions } from "./temporary-file-row-actions";
import { FileText, ImageIcon, File as FileIcon, ArrowUp, ArrowDown, ArrowUpDown } from "@/components/ui/icons";
import { fileTypeCategory, formatBytes } from "@/lib/files/file-types";
import type { SortKey } from "@/lib/temporary-files/query";
import type { TemporaryFileStatus } from "@prisma/client";

export type TemporaryFileRow = {
  id: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByName: string;
  uploadedAt: string;
  status: TemporaryFileStatus;
};

const STATUS_LABELS: Record<TemporaryFileStatus, string> = {
  TEMPORARY: "Temporary",
  PROCESSING: "Processing",
  REGISTERED: "Registered",
};

const STATUS_CLASSES: Record<TemporaryFileStatus, string> = {
  TEMPORARY: "bg-brand-100 text-brand-800",
  PROCESSING: "bg-amber-100 text-amber-800",
  REGISTERED: "bg-emerald-100 text-emerald-800",
};

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  const category = fileTypeCategory(mimeType);
  if (category === "pdf") return <FileText size={16} className="text-brand-700" />;
  if (category === "image") return <ImageIcon size={16} className="text-brand-700" />;
  return <FileIcon size={16} className="text-text-secondary" />;
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown size={11} className="text-text-muted" />;
  return dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />;
}

function SortableTh({
  label,
  sortKey,
  sort,
  dir,
  buildSortHref,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortKey;
  dir: "asc" | "desc";
  buildSortHref: (key: SortKey) => string;
}) {
  return (
    <Th>
      <Link href={buildSortHref(sortKey)} className="flex items-center gap-1 hover:text-brand-700">
        {label}
        <SortIcon active={sort === sortKey} dir={dir} />
      </Link>
    </Th>
  );
}

export function TemporaryFilesTable({
  rows,
  projectLabel,
  sort,
  dir,
  buildSortHref,
  canManage,
  documentTypeNames,
}: {
  rows: TemporaryFileRow[];
  projectLabel: string;
  sort: SortKey;
  dir: "asc" | "desc";
  buildSortHref: (key: SortKey) => string;
  canManage: boolean;
  documentTypeNames: string[];
}) {
  return (
    <Table>
      <Thead>
        <Tr>
          <Th className="w-10">File</Th>
          <SortableTh label="File Name" sortKey="fileName" sort={sort} dir={dir} buildSortHref={buildSortHref} />
          <SortableTh label="Uploaded By" sortKey="uploadedBy" sort={sort} dir={dir} buildSortHref={buildSortHref} />
          <SortableTh label="Date Uploaded" sortKey="uploadedAt" sort={sort} dir={dir} buildSortHref={buildSortHref} />
          <Th>Project</Th>
          <SortableTh label="File Size" sortKey="sizeBytes" sort={sort} dir={dir} buildSortHref={buildSortHref} />
          <SortableTh label="Status" sortKey="status" sort={sort} dir={dir} buildSortHref={buildSortHref} />
          <Th>Actions</Th>
        </Tr>
      </Thead>
      <Tbody>
        {rows.map((f) => (
          <Tr key={f.id}>
            <Td>
              <FileTypeIcon mimeType={f.mimeType} />
            </Td>
            <Td>
              <a
                href={`/api/temporary-files/${f.id}/file`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-700 hover:underline"
              >
                {f.originalFileName}
              </a>
            </Td>
            <Td className="text-text-secondary">{f.uploadedByName}</Td>
            <Td className="text-text-secondary">{f.uploadedAt}</Td>
            <Td className="text-text-secondary">{projectLabel}</Td>
            <Td className="text-text-secondary">{formatBytes(f.sizeBytes)}</Td>
            <Td>
              <span className={`rounded-[3px] px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASSES[f.status]}`}>
                {STATUS_LABELS[f.status]}
              </span>
            </Td>
            <Td>
              <TemporaryFileRowActions
                id={f.id}
                fileName={f.originalFileName}
                suggestedTitle={f.originalFileName.replace(/\.[a-z0-9]+$/i, "")}
                status={f.status}
                canManage={canManage}
                documentTypeNames={documentTypeNames}
              />
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
