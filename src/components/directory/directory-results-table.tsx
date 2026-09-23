"use client";

import { useState } from "react";
import Link from "next/link";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Users } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { EditMailingGroupModal } from "./edit-mailing-group-modal";
import type { DirectoryRow } from "@/lib/directory/search";

export function DirectoryResultsTable({ rows, projectId }: { rows: DirectoryRow[]; projectId: string }) {
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Users size={28} strokeWidth={1.25} />}
        title="No matching results"
        description="Please try again with different search criteria."
      />
    );
  }

  return (
    <>
      <Table>
        <Thead>
          <Tr>
            <Th>User / Group</Th>
            <Th>Organization</Th>
            <Th>Account Type</Th>
            <Th>Job Title</Th>
            <Th>Division</Th>
            <Th>Email</Th>
            <Th>Address</Th>
            <Th>Phone</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((r) =>
            r.kind === "user" ? (
              <Tr key={`u-${r.id}`}>
                <Td>
                  <Link href={`/directory/${r.id}`} className="font-medium text-brand-700 hover:underline">
                    {r.displayName}
                  </Link>
                </Td>
                <Td className="text-text-secondary">{r.organizationName}</Td>
                <Td className="text-text-secondary">{r.accountType === "FULL" ? "Full user" : "Guest user"}</Td>
                <Td className="text-text-secondary">{r.jobTitle ?? "—"}</Td>
                <Td className="text-text-secondary">{r.division ?? "—"}</Td>
                <Td className="text-text-secondary">{r.email}</Td>
                <Td className="text-text-secondary">{r.address ?? "—"}</Td>
                <Td className="text-text-secondary">{r.phone ?? "—"}</Td>
              </Tr>
            ) : (
              <Tr key={`g-${r.id}`}>
                <Td>
                  <button
                    type="button"
                    onClick={() => setEditingGroupId(r.id)}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {r.displayName}
                    {r.locked && <span className="ml-1.5 text-text-muted">(Locked)</span>}
                  </button>
                </Td>
                <Td className="text-text-secondary">{r.organizationName ?? "—"}</Td>
                <Td className="text-text-secondary">Group</Td>
                <Td className="text-text-secondary">—</Td>
                <Td className="text-text-secondary">—</Td>
                <Td className="text-text-secondary">{r.memberCount} member{r.memberCount === 1 ? "" : "s"}</Td>
                <Td className="text-text-secondary">—</Td>
                <Td className="text-text-secondary">—</Td>
              </Tr>
            ),
          )}
        </Tbody>
      </Table>
      {editingGroupId && (
        <EditMailingGroupModal groupId={editingGroupId} projectId={projectId} onClose={() => setEditingGroupId(null)} />
      )}
    </>
  );
}
