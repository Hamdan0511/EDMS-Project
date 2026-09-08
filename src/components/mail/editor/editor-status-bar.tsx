"use client";

import type { Editor } from "@tiptap/react";

export function EditorStatusBar({ editor }: { editor: Editor }) {
  const words = editor.storage.characterCount?.words?.() ?? 0;
  const characters = editor.storage.characterCount?.characters?.() ?? 0;

  return (
    <div className="flex items-center justify-between border-t border-border bg-brand-50/50 px-3 py-1 text-[11px] text-text-secondary">
      <span>
        Words: {words} &nbsp; Characters: {characters}
      </span>
    </div>
  );
}
