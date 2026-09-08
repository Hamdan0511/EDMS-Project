"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { Dropdown } from "@/components/ui/dropdown";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, PenLine, Plus, Pencil, Trash2 } from "@/components/ui/icons";

export type SignatureItem = {
  id: string;
  name: string;
  contentHtml: string;
  isDefault: boolean;
};

export function SignatureMenu({
  editor,
  signatures,
  onRefresh,
}: {
  editor: Editor;
  signatures: SignatureItem[];
  onRefresh: () => void;
}) {
  const [manageOpen, setManageOpen] = useState(false);

  return (
    <>
      <Dropdown
        align="left"
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-1 rounded-[3px] border border-border bg-white px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-brand-50"
          >
            <PenLine size={13} />
            Signature
            <ChevronDown size={11} className={open ? "rotate-180" : ""} />
          </button>
        )}
      >
        {(close) => (
          <div className="w-56 py-1">
            {signatures.length === 0 ? (
              <p className="px-3 py-2 text-[12px] text-text-muted">No signatures yet.</p>
            ) : (
              signatures.map((sig) => (
                <button
                  key={sig.id}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().insertContent(sig.contentHtml).run();
                    close();
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-brand-50"
                >
                  <span className="text-text-primary">{sig.name}</span>
                  {sig.isDefault && <span className="text-[10px] uppercase text-text-muted">Default</span>}
                </button>
              ))
            )}
            <div className="mt-1 border-t border-border pt-1">
              <button
                type="button"
                onClick={() => {
                  close();
                  setManageOpen(true);
                }}
                className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[13px] text-brand-700 hover:bg-brand-50"
              >
                <Pencil size={13} />
                Manage Signatures…
              </button>
            </div>
          </div>
        )}
      </Dropdown>
      <ManageSignaturesModal open={manageOpen} onClose={() => setManageOpen(false)} signatures={signatures} onChanged={onRefresh} />
    </>
  );
}

function ManageSignaturesModal({
  open,
  onClose,
  signatures,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  signatures: SignatureItem[];
  onChanged: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleClose() {
    setEditingId(null);
    setName("");
    setContent("");
    setIsDefault(false);
    setError(null);
    onClose();
  }

  function edit(sig: SignatureItem) {
    setEditingId(sig.id);
    setName(sig.name);
    setContent(sig.contentHtml);
    setIsDefault(sig.isDefault);
  }

  function startNew() {
    setEditingId("__new__");
    setName("");
    setContent("");
    setIsDefault(signatures.length === 0);
  }

  async function save() {
    if (!name.trim() || !content.trim()) {
      setError("Name and content are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const isNew = editingId === "__new__";
    const res = await fetch(isNew ? "/api/mail/signatures" : `/api/mail/signatures/${editingId}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, contentHtml: content, isDefault }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to save signature.");
      return;
    }
    setEditingId(null);
    onChanged();
  }

  async function remove(id: string) {
    if (!confirm("Delete this signature?")) return;
    await fetch(`/api/mail/signatures/${id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Manage Signatures" width="max-w-lg">
      <div className="flex flex-col gap-3">
        {editingId === null ? (
          <>
            <div className="flex flex-col gap-1">
              {signatures.length === 0 && <p className="text-[13px] text-text-muted">No signatures yet.</p>}
              {signatures.map((sig) => (
                <div key={sig.id} className="flex items-center justify-between rounded-[3px] border border-border px-2.5 py-1.5">
                  <span className="text-[13px] text-text-primary">
                    {sig.name}
                    {sig.isDefault && <span className="ml-2 text-[10px] uppercase text-text-muted">Default</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => edit(sig)} className="text-xs text-brand-700 hover:underline">
                      <Pencil size={12} className="inline" /> Edit
                    </button>
                    <button type="button" onClick={() => remove(sig.id)} className="text-xs text-red-700 hover:underline">
                      <Trash2 size={12} className="inline" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" onClick={startNew}>
              <Plus size={13} />
              New Signature
            </Button>
          </>
        ) : (
          <>
            {error && <p className="text-[13px] text-red-700">{error}</p>}
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Name *
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Content *
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder={"Mohamed C\nShanfari Furnishing\nMuscat, Oman"}
              />
            </label>
            <label className="flex items-center gap-1.5 text-[13px] text-text-primary">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-3.5 w-3.5 accent-brand-700"
              />
              Set as default signature
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditingId(null)} disabled={saving}>
                Back
              </Button>
              <Button type="button" variant="primary" onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
