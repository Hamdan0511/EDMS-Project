"use client";

import { useRouter } from "next/navigation";
import { Dropdown } from "@/components/ui/dropdown";
import { ChevronDown, User, Building2, LogOut } from "@/components/ui/icons";

export function UserMenu({
  name,
  orgName,
  role,
}: {
  name: string;
  orgName: string;
  role?: string;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Dropdown
      align="right"
      trigger={({ toggle, open }) => (
        <button type="button" onClick={toggle} className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">
            {initials}
          </span>
          <span className="hidden flex-col items-start text-left text-text-primary sm:flex">
            <span className="text-[13px] leading-tight">{name}</span>
            <span className="text-[11px] leading-tight text-text-secondary">{orgName}</span>
          </span>
          <ChevronDown
            size={14}
            className={`text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      )}
    >
      {(close) => (
        <div className="w-52">
          <div className="border-b border-border px-3 py-2.5">
            <div className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
              <User size={14} className="text-text-muted" />
              {name}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
              <Building2 size={13} className="text-text-muted" />
              {orgName}
            </div>
            {role && <div className="mt-1 text-[11px] text-text-muted">Role: {role}</div>}
          </div>
          <button
            onClick={() => {
              close();
              logout();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-text-primary hover:bg-brand-50"
          >
            <LogOut size={14} className="text-text-muted" />
            Log out
          </button>
        </div>
      )}
    </Dropdown>
  );
}
