"use client";

import type { Editor } from "@tiptap/react";
import { ToolbarButton, ToolbarDivider } from "./toolbar-button";
import { FontSelector } from "./font-selector";
import { TextColorPicker, HighlightColorPicker } from "./color-picker";
import { LinkDialog } from "./link-dialog";
import { ImageDialog } from "./image-dialog";
import { TableMenu } from "./table-menu";
import { AutoTextMenu } from "./auto-text-menu";
import { SignatureMenu, type SignatureItem } from "./signature-menu";
import { FindReplaceDialog } from "./find-replace-dialog";
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  SubscriptIcon,
  SuperscriptIcon,
  List,
  ListOrdered,
  IndentIncrease,
  IndentDecrease,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo2,
  Redo2,
  Eraser,
  Minus,
  Maximize2,
  Minimize2,
} from "@/components/ui/icons";
import { Select } from "@/components/ui/select";

export function RichTextToolbar({
  editor,
  projectId,
  signatures,
  onSignaturesChanged,
  fullscreen,
  onToggleFullscreen,
}: {
  editor: Editor;
  projectId: string;
  signatures: SignatureItem[];
  onSignaturesChanged: () => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const paragraphValue = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : editor.isActive("blockquote")
          ? "quote"
          : editor.isActive("codeBlock")
            ? "code"
            : "p";

  function applyParagraphStyle(value: string) {
    const chain = editor.chain().focus();
    if (value === "p") chain.setParagraph().run();
    else if (value === "h1") chain.setHeading({ level: 1 }).run();
    else if (value === "h2") chain.setHeading({ level: 2 }).run();
    else if (value === "h3") chain.setHeading({ level: 3 }).run();
    else if (value === "quote") chain.setBlockquote().run();
    else if (value === "code") chain.setCodeBlock().run();
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-t-[3px] border border-b-0 border-border bg-brand-50/40 px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-1">
        <AutoTextMenu editor={editor} projectId={projectId} />
        <SignatureMenu editor={editor} signatures={signatures} onRefresh={onSignaturesChanged} />
        <ToolbarDivider />
        <FindReplaceDialog editor={editor} />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <FontSelector editor={editor} />
        <ToolbarDivider />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} label="Bold (Ctrl+B)">
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} label="Italic (Ctrl+I)">
          <Italic size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} label="Underline (Ctrl+U)">
          <UnderlineIcon size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} label="Strikethrough">
          <Strikethrough size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive("subscript")} label="Subscript">
          <SubscriptIcon size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive("superscript")} label="Superscript">
          <SuperscriptIcon size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} label="Clear formatting">
          <Eraser size={14} />
        </ToolbarButton>
        <ToolbarDivider />
        <TextColorPicker editor={editor} />
        <HighlightColorPicker editor={editor} />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Select
          aria-label="Paragraph style"
          value={paragraphValue}
          onChange={(e) => applyParagraphStyle(e.target.value)}
          className="!h-7 w-32 !text-[12px]"
        >
          <option value="p">Normal</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="quote">Quote</option>
          <option value="code">Code</option>
        </Select>
        <ToolbarDivider />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} label="Bulleted list">
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} label="Numbered list">
          <ListOrdered size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().liftListItem("listItem").run()}
          disabled={!editor.can().liftListItem("listItem")}
          label="Decrease indent"
        >
          <IndentDecrease size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
          disabled={!editor.can().sinkListItem("listItem")}
          label="Increase indent"
        >
          <IndentIncrease size={14} />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} label="Align left">
          <AlignLeft size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} label="Align center">
          <AlignCenter size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} label="Align right">
          <AlignRight size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} label="Justify">
          <AlignJustify size={14} />
        </ToolbarButton>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-1">
        <div className="flex flex-wrap items-center gap-1">
          <TableMenu editor={editor} />
          <LinkDialog editor={editor} />
          <ImageDialog editor={editor} projectId={projectId} />
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} label="Insert horizontal rule">
            <Minus size={14} />
          </ToolbarButton>
          <ToolbarDivider />
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} label="Undo (Ctrl+Z)">
            <Undo2 size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} label="Redo (Ctrl+Y)">
            <Redo2 size={14} />
          </ToolbarButton>
        </div>
        <ToolbarButton onClick={onToggleFullscreen} label={fullscreen ? "Exit full screen" : "Full screen"}>
          {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </ToolbarButton>
      </div>
    </div>
  );
}
