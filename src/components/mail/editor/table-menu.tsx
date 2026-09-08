"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { Dropdown } from "@/components/ui/dropdown";
import { ToolbarButton } from "./toolbar-button";
import { Table2, Rows3, Columns3, Trash } from "@/components/ui/icons";

const GRID_MAX = 8;

export function TableMenu({ editor }: { editor: Editor }) {
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const insideTable = editor.isActive("table");

  return (
    <Dropdown
      align="left"
      trigger={({ toggle }) => (
        <ToolbarButton onClick={toggle} label="Insert or edit table" active={insideTable}>
          <Table2 size={14} />
        </ToolbarButton>
      )}
    >
      {(close) => (
        <div className="w-64 p-3">
          {!insideTable ? (
            <>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Insert Table
              </p>
              <div
                className="grid w-fit grid-cols-8 gap-1"
                onMouseLeave={() => setHoverCell(null)}
              >
                {Array.from({ length: GRID_MAX * GRID_MAX }).map((_, i) => {
                  const row = Math.floor(i / GRID_MAX);
                  const col = i % GRID_MAX;
                  const active = hoverCell && row <= hoverCell.row && col <= hoverCell.col;
                  return (
                    <button
                      key={i}
                      type="button"
                      onMouseEnter={() => setHoverCell({ row, col })}
                      onClick={() => {
                        editor
                          .chain()
                          .focus()
                          .insertTable({ rows: row + 1, cols: col + 1, withHeaderRow: true })
                          .run();
                        close();
                      }}
                      className={`h-4 w-4 rounded-[1px] border ${active ? "border-brand-700 bg-brand-200" : "border-border bg-white"}`}
                    />
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-text-secondary">
                {hoverCell ? `${hoverCell.row + 1} × ${hoverCell.col + 1}` : "Hover to choose a size"}
              </p>
            </>
          ) : (
            <>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Table
              </p>
              <div className="flex flex-col gap-0.5">
                <MenuItem icon={<Rows3 size={13} />} label="Add row after" onClick={() => { editor.chain().focus().addRowAfter().run(); close(); }} />
                <MenuItem icon={<Rows3 size={13} />} label="Delete row" onClick={() => { editor.chain().focus().deleteRow().run(); close(); }} />
                <MenuItem icon={<Columns3 size={13} />} label="Add column after" onClick={() => { editor.chain().focus().addColumnAfter().run(); close(); }} />
                <MenuItem icon={<Columns3 size={13} />} label="Delete column" onClick={() => { editor.chain().focus().deleteColumn().run(); close(); }} />
                <MenuItem icon={<Trash size={13} />} label="Delete table" onClick={() => { editor.chain().focus().deleteTable().run(); close(); }} danger />
              </div>
            </>
          )}
        </div>
      )}
    </Dropdown>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-[3px] px-2 py-1.5 text-left text-[13px] hover:bg-brand-50 ${danger ? "text-red-700" : "text-text-primary"}`}
    >
      {icon}
      {label}
    </button>
  );
}
