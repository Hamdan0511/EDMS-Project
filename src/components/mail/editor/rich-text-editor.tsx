"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useState } from "react";
import { buildEditorExtensions } from "./extensions";
import { RichTextToolbar } from "./rich-text-toolbar";
import { EditorStatusBar } from "./editor-status-bar";
import { uploadAndInsertImage } from "./image-dialog";
import type { SignatureItem } from "./signature-menu";

export function RichTextEditor({
  projectId,
  value,
  onChange,
  placeholder = "Write your message…",
}: {
  projectId: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [signatures, setSignatures] = useState<SignatureItem[]>([]);

  async function refreshSignatures() {
    const res = await fetch("/api/mail/signatures");
    if (res.ok) setSignatures(await res.json());
  }

  // Standard fetch-on-mount: loads the current user's signatures once so
  // the Signature menu has data without the composer's parent needing to
  // know about signatures at all.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    refreshSignatures();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && fullscreen) setFullscreen(false);
    }
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [fullscreen]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: buildEditorExtensions(placeholder),
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "mail-rich-content min-h-[220px] px-3 py-3 text-[13px] outline-none",
      },
      handleDrop: (view, event) => {
        const file = event.dataTransfer?.files?.[0];
        if (!file || !file.type.startsWith("image/")) return false;
        event.preventDefault();
        uploadAndInsertImage(editorRefCurrent(), projectId, file);
        return true;
      },
      handlePaste: (view, event) => {
        const item = Array.from(event.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
        if (!item) return false;
        const file = item.getAsFile();
        if (!file) return false;
        event.preventDefault();
        uploadAndInsertImage(editorRefCurrent(), projectId, file);
        return true;
      },
    },
  });

  // handleDrop/handlePaste are configured before `editor` exists, so they
  // close over a stable getter instead of the (not-yet-created) instance.
  function editorRefCurrent() {
    return editor!;
  }

  if (!editor) {
    return <div className="min-h-[260px] rounded-[3px] border border-border bg-white" />;
  }

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 flex flex-col bg-white p-4" : ""}>
      <RichTextToolbar
        editor={editor}
        projectId={projectId}
        signatures={signatures}
        onSignaturesChanged={refreshSignatures}
        fullscreen={fullscreen}
        onToggleFullscreen={() => setFullscreen((v) => !v)}
      />
      <div className={`overflow-hidden rounded-b-[3px] border border-border bg-white ${fullscreen ? "flex flex-1 flex-col" : ""}`}>
        <div className={fullscreen ? "flex-1 overflow-y-auto" : ""}>
          <EditorContent editor={editor} />
        </div>
        <EditorStatusBar editor={editor} />
      </div>
    </div>
  );
}
