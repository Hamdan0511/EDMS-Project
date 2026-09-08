"use client";

import { Dropdown } from "@/components/ui/dropdown";
import { Filter } from "@/components/ui/icons";
import type { ColumnKey } from "./mail-table-columns";
import { ALL_COLUMNS } from "./mail-table-columns";

export function ColumnManager({
  visible,
  onChange,
}: {
  visible: Record<ColumnKey, boolean>;
  onChange: (next: Record<ColumnKey, boolean>) => void;
}) {
  return <GenericColumnManager columns={ALL_COLUMNS} visible={visible} onChange={onChange} />;
}

/** Column-agnostic version reusable by any register (Documents, etc.) — pass
 * the column definitions in rather than relying on Mail's hardcoded list. */
export function GenericColumnManager<K extends string>({
  columns,
  visible,
  onChange,
}: {
  columns: { key: K; label: string; required?: boolean }[];
  visible: Record<K, boolean>;
  onChange: (next: Record<K, boolean>) => void;
}) {
  function toggle(key: K) {
    onChange({ ...visible, [key]: !visible[key] });
  }

  return (
    <Dropdown
      align="right"
      trigger={({ toggle: open }) => (
        <button
          type="button"
          onClick={open}
          className="flex items-center gap-1.5 rounded-[3px] border border-border bg-white px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-brand-50"
        >
          <Filter size={13} />
          Add/Remove Columns
        </button>
      )}
    >
      {() => (
        <div className="w-56 py-1">
          {columns.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-text-primary hover:bg-brand-50"
            >
              <input
                type="checkbox"
                checked={visible[col.key]}
                onChange={() => toggle(col.key)}
                disabled={col.required}
                className="h-3.5 w-3.5 accent-brand-700"
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </Dropdown>
  );
}
