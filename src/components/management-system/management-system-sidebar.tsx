"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ShieldCheck, FileText } from "@/components/ui/icons";

const ITEMS = [
  { href: "/management-system", label: "Overview", managementSystem: undefined },
  { href: "/management-system?managementSystem=QUALITY", label: "Quality", managementSystem: "QUALITY" },
  { href: "/management-system?managementSystem=ENVIRONMENT", label: "Environment", managementSystem: "ENVIRONMENT" },
  { href: "/management-system?managementSystem=HSE", label: "Health & Safety", managementSystem: "HSE" },
];

export function ManagementSystemSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeMs = searchParams.get("managementSystem");

  return (
    <div className="flex w-60 shrink-0 flex-col border-r border-border bg-white">
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-brand-700 text-white">
          <ShieldCheck size={16} />
        </span>
        <span className="text-[14px] font-semibold text-text-primary">Management System</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2 py-3">
        {ITEMS.map((item) => {
          const active = pathname === "/management-system" && (item.managementSystem ?? null) === activeMs;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={[
                "flex items-center gap-2.5 rounded-[3px] border-l-2 px-2.5 py-1.5 text-[13px] transition-colors",
                active
                  ? "border-brand-700 bg-brand-50 font-medium text-brand-800"
                  : "border-transparent text-text-secondary hover:bg-brand-50/60 hover:text-text-primary",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
        <div className="mt-3 border-t border-border pt-3">
          <Link
            href="/management-system/certificates"
            className={[
              "flex items-center gap-2.5 rounded-[3px] border-l-2 px-2.5 py-1.5 text-[13px] transition-colors",
              pathname === "/management-system/certificates"
                ? "border-brand-700 bg-brand-50 font-medium text-brand-800"
                : "border-transparent text-text-secondary hover:bg-brand-50/60 hover:text-text-primary",
            ].join(" ")}
          >
            <FileText size={15} className={pathname === "/management-system/certificates" ? "text-brand-700" : "text-text-muted"} />
            ISO Certificates
          </Link>
        </div>
      </nav>
    </div>
  );
}
