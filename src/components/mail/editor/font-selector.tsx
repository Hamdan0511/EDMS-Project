"use client";

import type { Editor } from "@tiptap/react";

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Roboto", value: "Roboto, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32];

const selectClass =
  "h-7 rounded-[3px] border border-border bg-white px-1.5 text-[12px] text-text-primary outline-none focus:border-accent";

export function FontSelector({ editor }: { editor: Editor }) {
  const currentFamily = editor.getAttributes("textStyle").fontFamily ?? "";
  const currentSize = editor.getAttributes("textStyle").fontSize ?? "";

  return (
    <>
      <select
        aria-label="Font family"
        value={currentFamily}
        onChange={(e) => {
          const value = e.target.value;
          if (value) editor.chain().focus().setFontFamily(value).run();
          else editor.chain().focus().unsetFontFamily().run();
        }}
        className={`${selectClass} w-36`}
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Font size"
        value={currentSize.replace("pt", "") || ""}
        onChange={(e) => {
          const value = e.target.value;
          if (value) editor.chain().focus().setFontSize(`${value}pt`).run();
          else editor.chain().focus().unsetFontSize().run();
        }}
        className={`${selectClass} w-16`}
      >
        <option value="">Size</option>
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </>
  );
}
