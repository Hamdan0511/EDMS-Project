"use client";

import { useState } from "react";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { FieldThumbnail } from "@/components/field/field-thumbnail";
import { ObservationDetailDrawer } from "@/components/field/observation-detail-drawer";
import {
  OBSERVATION_STATUS_LABELS,
  OBSERVATION_STATUS_BADGE_CLASSES,
  PRIORITY_LABELS,
  PRIORITY_BADGE_CLASSES,
} from "@/lib/field/status";
import type { FieldObservationStatus, FieldPriority } from "@prisma/client";

export type ObservationRow = {
  id: string;
  observationNumber: string;
  title: string;
  typeName: string | null;
  areaName: string | null;
  responsibleName: string | null;
  dueDate: string | null;
  priority: FieldPriority;
  status: FieldObservationStatus;
  thumbnailAttachmentId: string | null;
};

/** Clickable register with a slide-over detail drawer — the reference
 * master-detail pattern for Field. Rows stay keyboard/middle-click friendly
 * since they're plain <tr> elements with an onClick, not anchors removed. */
export function ObservationsTable({ rows, projectId }: { rows: ObservationRow[]; projectId: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      <Table>
        <Thead>
          <Tr>
            <Th className="w-12"></Th>
            <Th>Obs. No.</Th>
            <Th>Title</Th>
            <Th>Location</Th>
            <Th>Type</Th>
            <Th>Priority</Th>
            <Th>Responsible</Th>
            <Th>Status</Th>
            <Th>Date</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((r) => (
            <Tr key={r.id} selected={r.id === selectedId} className="cursor-pointer" onClick={() => setSelectedId(r.id)}>
              <Td>
                <FieldThumbnail attachmentId={r.thumbnailAttachmentId} alt={r.title} />
              </Td>
              <Td>
                <span className="font-medium text-brand-700">{r.observationNumber}</span>
              </Td>
              <Td className="max-w-xs truncate text-text-secondary">{r.title}</Td>
              <Td className="text-text-secondary">{r.areaName ?? "—"}</Td>
              <Td className="text-text-secondary">{r.typeName ?? "—"}</Td>
              <Td>
                <StatusBadge label={PRIORITY_LABELS[r.priority]} className={PRIORITY_BADGE_CLASSES[r.priority]} />
              </Td>
              <Td className="text-text-secondary">{r.responsibleName ?? "—"}</Td>
              <Td>
                <StatusBadge label={OBSERVATION_STATUS_LABELS[r.status]} className={OBSERVATION_STATUS_BADGE_CLASSES[r.status]} />
              </Td>
              <Td className="text-text-secondary">{r.dueDate ? new Date(r.dueDate).toLocaleDateString("en-GB") : "—"}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {selectedId && (
        <ObservationDetailDrawer key={selectedId} observationId={selectedId} projectId={projectId} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}
