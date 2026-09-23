"use client";

import Link from "next/link";
import { Dropdown } from "@/components/ui/dropdown";
import { ChevronDown } from "@/components/ui/icons";
import type { MenuNavItem } from "./nav-items";

export function NavMegaMenu({ item, active }: { item: MenuNavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Dropdown
      align="left"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          className={[
            "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 py-2 text-xs font-medium transition-colors",
            active || open
              ? "border-brand-700 text-text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary",
          ].join(" ")}
        >
          <Icon size={14} strokeWidth={2} className={active || open ? "text-brand-700" : "text-text-muted"} />
          {item.label}
          <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      )}
    >
      {(close) => (
        <div className="flex w-fit divide-x divide-border">
          {item.sections.map((section) => (
            <div key={section.heading} className="min-w-[150px] px-4 py-3">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                {section.heading}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={close}
                      className="text-[13px] text-brand-700 hover:text-brand-800 hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Dropdown>
  );
}
