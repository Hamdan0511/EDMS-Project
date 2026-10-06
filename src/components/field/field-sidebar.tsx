"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MapPin,
  EyeIcon,
  ClipboardCheck,
  AlertCircle,
  ListTodo,
  ClipboardList,
  FlaskConical,
  Camera,
  ReportsIcon,
  ClipboardPen,
  ListChecks,
} from "@/components/ui/icons";

type NavItem = { href: string; label: string; icon: typeof MapPin; exact?: boolean };
type NavGroup = { label?: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  { items: [{ href: "/field", label: "Overview", icon: MapPin, exact: true }] },
  {
    label: "Field",
    items: [
      { href: "/field/observations", label: "Site Observations", icon: EyeIcon },
      { href: "/field/inspections", label: "Quality Inspections", icon: ClipboardCheck },
      { href: "/field/inspections/templates", label: "Inspection Templates", icon: ClipboardPen },
      { href: "/field/issues", label: "Site Issues", icon: AlertCircle },
      { href: "/field/punch", label: "Punch / Snagging", icon: ListTodo },
      { href: "/field/itp", label: "ITP & Hold Points", icon: ClipboardList },
      { href: "/field/tests", label: "Test & Inspection Results", icon: FlaskConical },
      { href: "/field/photos", label: "Site Photos & Evidence", icon: Camera },
    ],
  },
  {
    label: "Locations",
    items: [
      { href: "/field/areas", label: "Site Areas", icon: MapPin },
      { href: "/field/site-walks", label: "Site Walks", icon: ListChecks },
    ],
  },
  {
    label: "Performance",
    items: [{ href: "/field/reports", label: "Field Reports", icon: ReportsIcon }],
  },
];

export function FieldSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex w-60 shrink-0 flex-col border-r border-border bg-white">
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-brand-700 text-white">
          <MapPin size={16} />
        </span>
        <span className="text-[14px] font-semibold text-text-primary">Field</span>
      </div>

      <nav className="flex flex-1 flex-col gap-3 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group, i) => (
          <div key={group.label ?? `group-${i}`} className="flex flex-col gap-0.5">
            {group.label && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center gap-2.5 rounded-[3px] border-l-2 px-2.5 py-1.5 text-[13px] transition-colors",
                    active
                      ? "border-brand-700 bg-brand-50 font-medium text-brand-800"
                      : "border-transparent text-text-secondary hover:bg-brand-50/60 hover:text-text-primary",
                  ].join(" ")}
                >
                  <Icon size={15} className={active ? "text-brand-700" : "text-text-muted"} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
}
