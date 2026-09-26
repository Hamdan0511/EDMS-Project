"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Button, buttonClass } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Pencil, Trash2, PhoneCall } from "@/components/ui/icons";
import { EmergencyContactForm, type EmergencyContactRecord } from "@/components/hse/emergency-contact-form";

export type EmergencyContactRow = EmergencyContactRecord & {
  organizationName: string | null;
};

export function EmergencyContactsTable({
  projectId,
  rows,
  organizations,
  canManage,
}: {
  projectId: string;
  rows: EmergencyContactRow[];
  organizations: { id: string; name: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmergencyContactRecord | undefined>(undefined);

  function openCreate() {
    setEditing(undefined);
    setModalOpen(true);
  }
  function openEdit(row: EmergencyContactRecord) {
    setEditing(row);
    setModalOpen(true);
  }

  async function remove(row: EmergencyContactRow) {
    if (!window.confirm(`Delete emergency contact "${row.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/hse/emergency/contacts/${row.id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      window.alert(body.error ?? "Failed to delete the contact.");
    }
  }

  return (
    <>
      {canManage && (
        <div className="mb-3 flex justify-end">
          <Button type="button" variant="primary" onClick={openCreate}>
            Add Contact
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<PhoneCall size={26} strokeWidth={1.25} />}
          title="No emergency contacts have been added yet"
          description="Add HSE managers, fire wardens, first aiders, and other emergency contacts for this project."
          action={
            canManage ? (
              <button type="button" onClick={openCreate} className={buttonClass("primary", "md")}>
                Add Contact
              </button>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Organization</Th>
              <Th>Phone</Th>
              <Th>Email</Th>
              <Th>Emergency Type</Th>
              <Th>Location</Th>
              <Th>Availability</Th>
              {canManage && <Th>Actions</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td className="font-medium text-text-primary">{r.name}</Td>
                <Td className="text-text-secondary">{r.role}</Td>
                <Td className="text-text-secondary">{r.organizationName ?? "—"}</Td>
                <Td className="text-text-secondary">{r.phone}</Td>
                <Td className="text-text-secondary">{r.email ?? "—"}</Td>
                <Td className="text-text-secondary">{r.emergencyType ?? "—"}</Td>
                <Td className="text-text-secondary">{r.location ?? "—"}</Td>
                <Td className="text-text-secondary">{r.availability ?? "—"}</Td>
                {canManage && (
                  <Td>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => openEdit(r)} className="rounded-[3px] p-1 text-text-muted hover:bg-brand-50 hover:text-brand-700" aria-label="Edit">
                        <Pencil size={14} />
                      </button>
                      <button type="button" onClick={() => remove(r)} className="rounded-[3px] p-1 text-text-muted hover:bg-red-50 hover:text-red-700" aria-label="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Emergency Contact" : "Add Emergency Contact"} width="max-w-2xl">
        <EmergencyContactForm projectId={projectId} organizations={organizations} existing={editing} onDone={() => setModalOpen(false)} />
      </Modal>
    </>
  );
}
