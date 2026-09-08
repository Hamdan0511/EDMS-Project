"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { NavMegaMenu } from "./nav-mega-menu";

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-0.5 border-t border-border bg-white px-2">
      {NAV_ITEMS.map((item) => {
        if (item.kind === "menu") {
          const active = pathname.startsWith(item.activePrefix);
          return <NavMegaMenu key={item.label} item={item} active={active} />;
        }

        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 py-2 text-xs font-medium transition-colors",
              active
                ? "border-brand-700 text-text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            <Icon size={14} strokeWidth={2} className={active ? "text-brand-700" : "text-text-muted"} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
