"use client";

import { Dropdown } from "@/components/ui/dropdown";
import { HelpCircle } from "@/components/ui/icons";

export function HelpMenu() {
  return (
    <Dropdown
      align="right"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label="Help"
          className="flex h-8 w-8 items-center justify-center rounded-[3px] text-text-secondary hover:bg-brand-50 hover:text-text-primary"
        >
          <HelpCircle size={16} />
        </button>
      )}
    >
      {() => (
        <div className="w-56 px-3 py-3 text-xs text-text-secondary">
          For access or support requests, contact your project&rsquo;s document controller.
        </div>
      )}
    </Dropdown>
  );
}
