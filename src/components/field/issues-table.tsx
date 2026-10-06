"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { FieldThumbnail } from "@/components/field/field-thumbnail";
import {
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_BADGE_CLASSES,
  PRIORITY_LABELS,
  PRIORITY_BADGE_CLASSES,
} from "@/lib/field/status";
import type { FieldIssueStatus, FieldPriority } from "@prisma/client";

export type IssueRow = {
  id: string;
  issueNumber: string;
  title: string;
  areaName: string | null;
  typeName: string | null;
  responsibleName: string | null;
  dueDate: string | null;
  priority: FieldPriority;
  status: FieldIssueStatus;
  sourceType: string;
  updatedAt: string;
  thumbnailAttachmentId: string | null;
};

const GROUP_OPTIONS = [
  { key: "none", label: "No Grouping" },
  { key: "areaName", label: "Group by Location" },
  { key: "responsibleName", label: "Group by Responsible" },
  { key: "typeName", label: "Group by Issue Type" },
  { key: "status", label: "Group by Status" },
] as const;

function sourceLabel(sourceType: string): string {
  if (sourceType === "manual") return "Manual";
  return sourceType.replace(/^Field/, "");
}

export function IssuesTable({ rows }: { rows: IssueRow[] }) {
  const [groupBy, setGroupBy] = useState<(typeof GROUP_OPTIONS)[number]["key"]>("none");

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ label: null as string | null, rows }];
    const map = new Map<string, IssueRow[]>();
    for (const r of rows) {
      const key = groupBy === "status" ? ISSUE_STATUS_LABELS[r.status] : (r[groupBy] ?? "—");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, groupRows]) => ({ label, rows: groupRows }));
  }, [rows, groupBy]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as typeof groupBy)} className="w-48">
          {GROUP_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </Select>
      </div>

      {groups.map((group) => (
        <div key={group.label ?? "__all__"}>
          {group.label && (
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
              {group.label} <span className="text-text-muted">({group.rows.length})</span>
            </p>
          )}
          <Table>
            <Thead>
              <Tr>
                <Th className="w-12"></Th>
                <Th>Issue No.</Th>
                <Th>Title</Th>
                <Th>Location</Th>
                <Th>Source</Th>
                <Th>Responsible</Th>
                <Th>Due</Th>
                <Th>Priority</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {group.rows.map((r) => (
                <Tr key={r.id}>
                  <Td>
                    <FieldThumbnail attachmentId={r.thumbnailAttachmentId} alt={r.title} />
                  </Td>
                  <Td>
                    <Link href={`/field/issues/${r.id}`} className="font-medium text-brand-700 hover:underline">
                      {r.issueNumber}
                    </Link>
                  </Td>
                  <Td className="max-w-xs truncate text-text-secondary">{r.title}</Td>
                  <Td className="text-text-secondary">{r.areaName ?? "—"}</Td>
                  <Td className="text-text-secondary">{sourceLabel(r.sourceType)}</Td>
                  <Td className="text-text-secondary">{r.responsibleName ?? "—"}</Td>
                  <Td className="text-text-secondary">{r.dueDate ? new Date(r.dueDate).toLocaleDateString("en-GB") : "—"}</Td>
                  <Td>
                    <StatusBadge label={PRIORITY_LABELS[r.priority]} className={PRIORITY_BADGE_CLASSES[r.priority]} />
                  </Td>
                  <Td>
                    <StatusBadge label={ISSUE_STATUS_LABELS[r.status]} className={ISSUE_STATUS_BADGE_CLASSES[r.status]} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      ))}
    </div>
  );
}
