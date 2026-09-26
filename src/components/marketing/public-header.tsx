"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { MarketingLogo } from "./marketing-logo";
import { MARKETING_NAV, SIGN_IN_HREF } from "@/lib/site-config";

export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-6 sm:px-8 lg:px-12">
        <Link href="/" aria-label="Shanfari Furnishing home" onClick={() => setOpen(false)}>
          <MarketingLogo height={30} />
        </Link>

        <nav className="hidden items-center gap-9 lg:flex" aria-label="Primary">
          {MARKETING_NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative py-1 text-[13px] font-medium tracking-wide transition-colors ${
                  active ? "text-brand-900" : "text-text-secondary hover:text-brand-900"
                }`}
              >
                {item.label}
                {active && <span className="absolute -bottom-1 left-0 h-px w-full bg-brand-600" />}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:block">
          <Link
            href={SIGN_IN_HREF}
            className="inline-flex items-center gap-2 bg-brand-900 px-5 py-2.5 text-[13px] font-medium tracking-wide text-white transition-colors hover:bg-brand-800"
          >
            Sign In →
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="text-text-primary lg:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="flex flex-col px-6 py-4" aria-label="Mobile">
            {MARKETING_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-border/70 py-3.5 text-[15px] font-medium text-text-primary last:border-0"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={SIGN_IN_HREF}
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex items-center justify-center gap-2 bg-brand-900 px-5 py-3 text-[13px] font-medium tracking-wide text-white"
            >
              Sign In →
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
