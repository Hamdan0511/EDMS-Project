"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { Dropdown } from "@/components/ui/dropdown";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, FileText, Plus, Pencil, Trash2 } from "@/components/ui/icons";

type AutoTextItem = {
  id: string;
  name: string;
  contentHtml: string;
  description: string | null;
};

export function AutoTextMenu({ editor, projectId }: { editor: Editor; projectId: string }) {
  const [items, setItems] = useState<AutoTextItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  async function refresh() {
    const res = await fetch(`/api/mail/auto-text?projectId=${projectId}`);
    if (res.ok) setItems(await res.json());
    setLoaded(true);
  }

  return (
    <>
      <Dropdown
        align="left"
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={() => {
              if (!loaded) refresh();
              toggle();
            }}
            className="flex items-center gap-1 rounded-[3px] border border-border bg-white px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-brand-50"
          >
            <FileText size={13} />
            Auto Text
            <ChevronDown size={11} className={open ? "rotate-180" : ""} />
          </button>
        )}
      >
        {(close) => (
          <div className="w-64 py-1">
            {items.length === 0 ? (
              <p className="px-3 py-2 text-[12px] text-text-muted">No Auto Text snippets yet.</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().insertContent(item.contentHtml).run();
                    close();
                  }}
                  className="flex w-full flex-col items-start px-3 py-2 text-left text-[13px] hover:bg-brand-50"
                >
                  <span className="font-medium text-text-primary">{item.name}</span>
                  {item.description && <span className="text-xs text-text-secondary">{item.description}</span>}
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
                Manage Auto Text…
              </button>
            </div>
          </div>
        )}
      </Dropdown>
      <ManageAutoTextModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        projectId={projectId}
        items={items}
        onChanged={refresh}
      />
    </>
  );
}

function ManageAutoTextModal({
  open,
  onClose,
  projectId,
  items,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  items: AutoTextItem[];
  onChanged: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleClose() {
    setEditingId(null);
    setName("");
    setDescription("");
    setContent("");
    setError(null);
    onClose();
  }

  function edit(item: AutoTextItem) {
    setEditingId(item.id);
    setName(item.name);
    setDescription(item.description ?? "");
    setContent(item.contentHtml);
  }

  function startNew() {
    setEditingId("__new__");
    setName("");
    setDescription("");
    setContent("");
  }

  async function save() {
    if (!name.trim() || !content.trim()) {
      setError("Name and content are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const isNew = editingId === "__new__";
    const res = await fetch(isNew ? "/api/mail/auto-text" : `/api/mail/auto-text/${editingId}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, name, description, contentHtml: content }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to save Auto Text.");
      return;
    }
    setEditingId(null);
    onChanged();
  }

  async function remove(id: string) {
    if (!confirm("Delete this Auto Text snippet?")) return;
    await fetch(`/api/mail/auto-text/${id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Manage Auto Text" width="max-w-lg">
      <div className="flex flex-col gap-3">
        {editingId === null ? (
          <>
            <div className="flex flex-col gap-1">
              {items.length === 0 && <p className="text-[13px] text-text-muted">No snippets yet.</p>}
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-[3px] border border-border px-2.5 py-1.5">
                  <span className="text-[13px] text-text-primary">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => edit(item)} className="text-xs text-brand-700 hover:underline">
                      <Pencil size={12} className="inline" /> Edit
                    </button>
                    <button type="button" onClick={() => remove(item.id)} className="text-xs text-red-700 hover:underline">
                      <Trash2 size={12} className="inline" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" onClick={startNew}>
              <Plus size={13} />
              New Auto Text
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
              Description
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Content *
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="w-full rounded-[3px] border border-border bg-white px-2.5 py-1.5 text-[13px] text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="e.g. Dear Sir/Madam,"
              />
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
