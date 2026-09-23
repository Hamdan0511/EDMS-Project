"use client";

import { useState } from "react";
import { Dropdown } from "./dropdown";
import { ChevronDown } from "./icons";
import { inputClass } from "./input";

export type MultiSelectOption = { value: string; label: string };

/** A real multi-value filter control: checkbox list in a popover, backed by
 * a single hidden input whose value is a comma-joined list of selections —
 * submitted like any other field when the surrounding <form> is submitted
 * (GET), so it needs no client-side fetch/JS to actually filter. */
export function MultiSelect({
  name,
  options,
  defaultValue,
  placeholder = "Select values...",
}: {
  name: string;
  options: MultiSelectOption[];
  defaultValue?: string[];
  placeholder?: string;
}) {
  const [selected, setSelected] = useState<string[]>(defaultValue ?? []);

  function toggle(value: string) {
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${selected.length} selected`;

  return (
    <div>
      <input type="hidden" name={name} value={selected.join(",")} readOnly />
      <Dropdown
        align="left"
        trigger={({ toggle: toggleOpen, open }) => (
          <button
            type="button"
            onClick={toggleOpen}
            className={`${inputClass} flex items-center justify-between gap-1 text-left ${selected.length === 0 ? "text-text-muted" : ""}`}
          >
            <span className="truncate">{label}</span>
            <ChevronDown size={12} className={`shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      >
        {() => (
          <div className="max-h-64 w-56 overflow-y-auto py-1">
            {options.length === 0 && <p className="px-3 py-2 text-xs text-text-muted">No values configured.</p>}
            {options.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[13px] text-text-primary hover:bg-brand-50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(o.value)}
                  onChange={() => toggle(o.value)}
                  className="h-3.5 w-3.5 accent-brand-700"
                />
                {o.label}
              </label>
            ))}
          </div>
        )}
      </Dropdown>
    </div>
  );
}
