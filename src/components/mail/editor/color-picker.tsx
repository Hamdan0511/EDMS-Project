"use client";

import type { Editor } from "@tiptap/react";
import { Dropdown } from "@/components/ui/dropdown";
import { ToolbarButton } from "./toolbar-button";
import { ChevronDown } from "@/components/ui/icons";

const TEXT_COLORS = [
  { label: "Black", value: "#211F1C" },
  { label: "Dark Gray", value: "#71695F" },
  { label: "Red", value: "#B42318" },
  { label: "Blue", value: "#1D4ED8" },
  { label: "Green", value: "#15803D" },
  { label: "Orange", value: "#C2410C" },
  { label: "Bronze", value: "#8A7558" },
  { label: "Purple", value: "#6D28D9" },
];

const HIGHLIGHT_COLORS = [
  { label: "Yellow", value: "#FEF08A" },
  { label: "Light Gray", value: "#E5E5E5" },
  { label: "Light Blue", value: "#BFDBFE" },
  { label: "Light Green", value: "#BBF7D0" },
  { label: "Light Red", value: "#FECACA" },
  { label: "Light Orange", value: "#FED7AA" },
];

export function TextColorPicker({ editor }: { editor: Editor }) {
  return (
    <Dropdown
      align="left"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label="Text color"
          title="Text color"
          className="flex h-7 items-center gap-0.5 rounded-[3px] px-1.5 text-text-secondary hover:bg-brand-50"
        >
          <span
            className="flex h-4 w-4 items-center justify-center border-b-2 text-[12px] font-semibold"
            style={{ borderColor: editor.getAttributes("textStyle").color || "#211F1C" }}
          >
            A
          </span>
          <ChevronDown size={10} className={open ? "rotate-180" : ""} />
        </button>
      )}
    >
      {(close) => (
        <div className="w-44 p-2">
          <div className="grid grid-cols-4 gap-1.5">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => {
                  editor.chain().focus().setColor(c.value).run();
                  close();
                }}
                className="h-6 w-6 rounded-[3px] border border-border"
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              aria-label="Custom text color"
              className="h-6 w-8 cursor-pointer rounded-[3px] border border-border"
              onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            />
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().unsetColor().run();
                close();
              }}
              className="text-[11px] text-brand-700 hover:underline"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </Dropdown>
  );
}

export function HighlightColorPicker({ editor }: { editor: Editor }) {
  return (
    <Dropdown
      align="left"
      trigger={({ toggle, open }) => (
        <ToolbarButton onClick={toggle} label="Highlight color" active={editor.isActive("highlight")}>
          <span className="flex items-center gap-0.5">
            <span
              className="flex h-4 w-4 items-center justify-center rounded-[2px] text-[12px] font-semibold"
              style={{ backgroundColor: editor.getAttributes("highlight").color || "#FEF08A" }}
            >
              H
            </span>
            <ChevronDown size={10} className={open ? "rotate-180" : ""} />
          </span>
        </ToolbarButton>
      )}
    >
      {(close) => (
        <div className="w-44 p-2">
          <div className="grid grid-cols-3 gap-1.5">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => {
                  editor.chain().focus().setHighlight({ color: c.value }).run();
                  close();
                }}
                className="h-6 w-10 rounded-[3px] border border-border"
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().unsetHighlight().run();
              close();
            }}
            className="mt-2 text-[11px] text-brand-700 hover:underline"
          >
            Remove highlight
          </button>
        </div>
      )}
    </Dropdown>
  );
}
