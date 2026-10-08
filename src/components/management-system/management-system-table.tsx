import Link from "next/link";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "@/components/ui/icons";
import { docOwnerLabel } from "@/lib/management-system/status";
import type { SortKey } from "@/lib/management-system/query";
import type { ManagementSystemCategory } from "@prisma/client";

export type ManagementSystemRow = {
  id: string;
  documentNo: string;
  title: string;
  revision: string;
  documentType: string;
  managementSystem: ManagementSystemCategory;
  documentDate: string | null;
  author: string | null;
  documentOwner: string | null;
};

function SortHeader({
  label,
  sortKey,
  sort,
  dir,
  buildHref,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortKey;
  dir: "asc" | "desc";
  buildHref: (extra: Record<string, string | undefined>) => string;
}) {
  const active = sort === sortKey;
  const nextDir = active && dir === "asc" ? "desc" : "asc";
  return (
    <Link href={buildHref({ sort: sortKey, dir: nextDir, page: undefined })} className="flex items-center gap-1 hover:text-text-primary">
      {label}
      {active ? (
        dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
      ) : (
        <ArrowUpDown size={11} className="text-text-muted/60" />
      )}
    </Link>
  );
}

/**
 * This is a REGISTER, not a document viewer — Name and Document name are
 * the only interactive elements in a row, and both go straight to the real
 * stored file via the secure authenticated file-serving endpoint. No
 * detail page, no generated preview, no Actions column: the browser's own
 * native handling of the returned file (open inline for PDF, download for
 * DOC/DOCX/XLS/XLSX) is the entire experience.
 */
export function ManagementSystemTable({
  rows,
  sort,
  dir,
  buildHref,
}: {
  rows: ManagementSystemRow[];
  sort: SortKey;
  dir: "asc" | "desc";
  buildHref: (extra: Record<string, string | undefined>) => string;
}) {
  return (
    <Table>
      <Thead>
        <Tr>
          <Th><SortHeader label="Name" sortKey="documentNo" sort={sort} dir={dir} buildHref={buildHref} /></Th>
          <Th><SortHeader label="Document name" sortKey="title" sort={sort} dir={dir} buildHref={buildHref} /></Th>
          <Th><SortHeader label="Last rev" sortKey="revision" sort={sort} dir={dir} buildHref={buildHref} /></Th>
          <Th><SortHeader label="Doc type" sortKey="documentType" sort={sort} dir={dir} buildHref={buildHref} /></Th>
          <Th><SortHeader label="Date" sortKey="documentDate" sort={sort} dir={dir} buildHref={buildHref} /></Th>
          <Th><SortHeader label="Author" sortKey="author" sort={sort} dir={dir} buildHref={buildHref} /></Th>
          <Th><SortHeader label="Doc Owner" sortKey="documentOwner" sort={sort} dir={dir} buildHref={buildHref} /></Th>
        </Tr>
      </Thead>
      <Tbody>
        {rows.map((r) => {
          const fileHref = `/api/management-system/documents/${r.id}/file`;
          return (
            <Tr key={r.id}>
              <Td>
                <a href={fileHref} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 hover:underline">
                  {r.documentNo}
                </a>
              </Td>
              <Td className="max-w-xs truncate text-text-secondary">
                <a href={fileHref} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {r.title}
                </a>
              </Td>
              <Td className="text-text-secondary">{r.revision}</Td>
              <Td className="text-text-secondary">{r.documentType}</Td>
              <Td className="text-text-secondary">{r.documentDate ? new Date(r.documentDate).toLocaleDateString("en-GB") : "Not specified"}</Td>
              <Td className="text-text-secondary">{r.author ?? "Not specified"}</Td>
              <Td className="text-text-secondary">{r.documentOwner ? docOwnerLabel(r.documentOwner) : "Not specified"}</Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
}
