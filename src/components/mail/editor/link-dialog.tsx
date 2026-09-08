"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolbarButton } from "./toolbar-button";
import { Link2, Link2Off } from "@/components/ui/icons";

const SAFE_URL_PATTERN = /^(https?:\/\/|mailto:)/i;

export function LinkDialog({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isActive = editor.isActive("link");

  function openDialog() {
    setUrl(editor.getAttributes("link").href ?? "");
    setError(null);
    setOpen(true);
  }

  function apply() {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Enter a URL.");
      return;
    }
    const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    if (!SAFE_URL_PATTERN.test(withScheme)) {
      setError("Only http(s) and mailto links are allowed.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: withScheme }).run();
    setOpen(false);
  }

  function remove() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setOpen(false);
  }

  return (
    <>
      <ToolbarButton onClick={openDialog} label="Insert link" active={isActive}>
        <Link2 size={14} />
      </ToolbarButton>
      {isActive && (
        <ToolbarButton onClick={remove} label="Remove link">
          <Link2Off size={14} />
        </ToolbarButton>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={isActive ? "Edit Link" : "Insert Link"} width="max-w-sm">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            URL
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              autoFocus
            />
          </label>
          {error && <p className="text-[12px] text-red-700">{error}</p>}
          <div className="mt-1 flex justify-end gap-2">
            {isActive && (
              <Button type="button" variant="ghost" onClick={remove}>
                Remove Link
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={apply}>
              {isActive ? "Update Link" : "Insert Link"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
