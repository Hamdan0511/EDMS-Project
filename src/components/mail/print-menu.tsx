"use client";

import { Dropdown } from "@/components/ui/dropdown";
import { Printer, ChevronDown } from "@/components/ui/icons";

export function PrintMenu({ mailId }: { mailId: string }) {
  const options = [
    { style: "screen", label: "Screen Style" },
    { style: "no-thread", label: "Screen Style (No Thread)" },
    { style: "letter", label: "Letter Style" },
  ];

  return (
    <Dropdown
      align="left"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-1.5 rounded-[3px] border border-border bg-white px-3 py-1.5 text-[13px] font-medium text-text-primary hover:bg-brand-50"
        >
          <Printer size={14} />
          Print
          <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      )}
    >
      {(close) => (
        <div className="w-52 py-1">
          {options.map((opt) => (
            <a
              key={opt.style}
              href={`/mail-print/${mailId}?style=${opt.style}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="block px-3 py-2 text-[13px] text-text-primary hover:bg-brand-50"
            >
              {opt.label}
            </a>
          ))}
        </div>
      )}
    </Dropdown>
  );
}
