import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { IconInput } from "@/components/ui/input";
import { Search, FileText } from "@/components/ui/icons";
import type { Prisma } from "@prisma/client";

export async function DocumentRegisterView({
  projectId,
  q,
  searchAction,
  extraWhere,
  emptyTitle,
  emptyDescription,
}: {
  projectId: string;
  q: string;
  searchAction: string;
  extraWhere?: Prisma.DocumentWhereInput;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const documents = await prisma.document.findMany({
    where: {
      projectId,
      ...extraWhere,
      ...(q.trim()
        ? {
            OR: [
              { title: { contains: q.trim(), mode: "insensitive" } },
              { documentNo: { contains: q.trim(), mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { type: true, createdBy: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <div className="p-6">
      <form className="mb-4 flex gap-2" action={searchAction} method="GET">
        <div className="w-80">
          <IconInput
            icon={<Search size={14} />}
            name="q"
            defaultValue={q}
            placeholder="Search document number or title…"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {documents.length === 0 ? (
        <EmptyState
          icon={<FileText size={26} strokeWidth={1.25} />}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Document No</Th>
              <Th>Title</Th>
              <Th>Type</Th>
              <Th>Revision</Th>
              <Th>Status</Th>
              <Th>Created By</Th>
            </Tr>
          </Thead>
          <Tbody>
            {documents.map((d) => (
              <Tr key={d.id}>
                <Td className="font-medium text-brand-700">{d.documentNo}</Td>
                <Td>{d.title}</Td>
                <Td className="text-text-secondary">{d.type?.name ?? "—"}</Td>
                <Td className="text-text-secondary">{d.currentRevision}</Td>
                <Td className="text-text-secondary">{d.status}</Td>
                <Td className="text-text-secondary">{d.createdBy.name}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
