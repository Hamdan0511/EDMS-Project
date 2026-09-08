"use client";

import { ReactNode } from "react";

export function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`flex h-7 min-w-7 items-center justify-center rounded-[3px] px-1.5 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-brand-700 text-white" : "text-text-secondary hover:bg-brand-50 hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

export function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />;
}
