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
  const [query, setQuery] = useState("");

  function toggle(value: string) {
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${selected.length} selected`;

  const filteredOptions = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  const allFilteredSelected = filteredOptions.length > 0 && filteredOptions.every((o) => selected.includes(o.value));

  function toggleAll() {
    const filteredValues = filteredOptions.map((o) => o.value);
    setSelected((prev) =>
      allFilteredSelected ? prev.filter((v) => !filteredValues.includes(v)) : [...new Set([...prev, ...filteredValues])],
    );
  }

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
          <div className="w-56">
            {options.length > 6 && (
              <div className="border-b border-border p-1.5">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full rounded-[3px] border border-border px-2 py-1 text-[12px] text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-700"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            <div className="max-h-56 overflow-y-auto py-1">
              {options.length === 0 && <p className="px-3 py-2 text-xs text-text-muted">No values configured.</p>}
              {filteredOptions.length === 0 && options.length > 0 && (
                <p className="px-3 py-2 text-xs text-text-muted">No matching values.</p>
              )}
              {filteredOptions.length > 0 && (
                <label className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-1.5 text-[13px] font-medium text-text-primary hover:bg-brand-50">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAll}
                    className="h-3.5 w-3.5 accent-brand-700"
                  />
                  Select All
                </label>
              )}
              {filteredOptions.map((o) => (
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
          </div>
        )}
      </Dropdown>
    </div>
  );
}
