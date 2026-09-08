"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolbarButton } from "./toolbar-button";
import { Search } from "@/components/ui/icons";

function findMatches(editor: Editor, query: string): { from: number; to: number }[] {
  const matches: { from: number; to: number }[] = [];
  if (!query) return matches;
  const lowerQuery = query.toLowerCase();
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    const text = (node.text ?? "").toLowerCase();
    let idx = 0;
    while (true) {
      const found = text.indexOf(lowerQuery, idx);
      if (found === -1) break;
      matches.push({ from: pos + found, to: pos + found + query.length });
      idx = found + query.length;
    }
  });
  return matches;
}

export function FindReplaceDialog({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<string | null>(null);

  function focusMatch(matches: { from: number; to: number }[], index: number) {
    if (matches.length === 0) {
      setStatus("No matches found.");
      return;
    }
    const wrapped = ((index % matches.length) + matches.length) % matches.length;
    const match = matches[wrapped];
    editor.chain().focus().setTextSelection(match).scrollIntoView().run();
    setStatus(`Match ${wrapped + 1} of ${matches.length}`);
    setCurrentIndex(wrapped);
  }

  function findNext() {
    focusMatch(findMatches(editor, query), currentIndex + 1);
  }

  function replaceCurrent() {
    const matches = findMatches(editor, query);
    if (matches.length === 0) {
      setStatus("No matches found.");
      return;
    }
    const wrapped = ((currentIndex % matches.length) + matches.length) % matches.length;
    const match = matches[wrapped];
    editor.chain().focus().setTextSelection(match).insertContent(replacement).run();
    setStatus("Replaced. Searching next…");
    setTimeout(() => focusMatch(findMatches(editor, query), wrapped), 0);
  }

  function replaceAll() {
    const matches = findMatches(editor, query);
    const count = matches.length;
    // Replace from the end backwards so earlier positions never shift.
    for (let i = matches.length - 1; i >= 0; i--) {
      editor.chain().setTextSelection(matches[i]).insertContent(replacement).run();
    }
    editor.commands.focus();
    setStatus(`Replaced ${count} occurrence${count === 1 ? "" : "s"}.`);
  }

  return (
    <>
      <ToolbarButton onClick={() => setOpen(true)} label="Find and replace">
        <Search size={14} />
      </ToolbarButton>
      <Modal open={open} onClose={() => setOpen(false)} title="Find and Replace" width="max-w-sm">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Find
            <Input value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Replace with
            <Input value={replacement} onChange={(e) => setReplacement(e.target.value)} />
          </label>
          {status && <p className="text-[12px] text-text-secondary">{status}</p>}
          <div className="mt-1 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={findNext} disabled={!query}>
              Find Next
            </Button>
            <Button type="button" variant="secondary" onClick={replaceCurrent} disabled={!query}>
              Replace
            </Button>
            <Button type="button" variant="primary" onClick={replaceAll} disabled={!query}>
              Replace All
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
