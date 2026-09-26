"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HardHat,
  ShieldAlert,
  EyeIcon,
  TriangleAlert,
  AlertCircle,
  ClipboardList,
  ClipboardCheck,
  CheckCircle2,
  FileText,
  ReportsIcon,
  Wrench,
  BarChart3,
  Siren,
} from "@/components/ui/icons";

type NavItem = { href: string; label: string; icon: typeof HardHat; exact?: boolean };
type NavGroup = { label?: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  { items: [{ href: "/hse", label: "Dashboard", icon: HardHat, exact: true }] },
  {
    label: "Reporting",
    items: [
      { href: "/hse/report", label: "Report an Issue", icon: ShieldAlert },
      { href: "/hse/observations", label: "Observations", icon: EyeIcon },
      { href: "/hse/incidents", label: "Incidents", icon: AlertCircle },
      { href: "/hse/near-misses", label: "Near Misses", icon: TriangleAlert },
    ],
  },
  {
    label: "Risk & Control",
    items: [
      { href: "/hse/hazards", label: "Hazards", icon: TriangleAlert },
      { href: "/hse/risk-assessments", label: "Risk Assessments", icon: ClipboardList },
      { href: "/hse/inspections", label: "Inspections", icon: ClipboardCheck },
      { href: "/hse/equipment", label: "Equipment Safety", icon: Wrench },
    ],
  },
  {
    label: "Actions",
    items: [
      { href: "/hse/corrective-actions", label: "Corrective Actions", icon: CheckCircle2 },
      { href: "/hse/permits", label: "Permits to Work", icon: FileText },
    ],
  },
  {
    label: "Emergency",
    items: [{ href: "/hse/emergency", label: "Emergency Management", icon: Siren }],
  },
  {
    label: "Performance",
    items: [
      { href: "/hse/statistics", label: "Safety Statistics", icon: BarChart3 },
      { href: "/hse/reports", label: "Reports", icon: ReportsIcon },
    ],
  },
];

export function HseSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex w-60 shrink-0 flex-col border-r border-border bg-white">
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-brand-700 text-white">
          <HardHat size={16} />
        </span>
        <span className="text-[14px] font-semibold text-text-primary">Health &amp; Safety</span>
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

      <div className="border-t border-border px-4 py-3">
        <p className="text-[11px] font-medium text-text-secondary">A Safer Tomorrow Together</p>
      </div>
    </div>
  );
}
