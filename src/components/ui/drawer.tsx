"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "@/components/ui/icons";

/** Right-anchored slide-over panel for a master-detail list+detail split —
 * mirrors Modal's portal approach (keeps React context/event bubbling intact
 * while escaping any ancestor <form>) but docks to the right edge instead of
 * centering, and never blocks the list behind it from being readable. Slides
 * in via a plain CSS transform transition (no animation library installed). */
export function Drawer({
  open,
  onClose,
  children,
  width = "max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => setShown(true));
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onEscape);
    return () => {
      cancelAnimationFrame(t);
      document.removeEventListener("keydown", onEscape);
      setShown(false);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className={`absolute inset-0 bg-black/20 transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`}
        onMouseDown={onClose}
      />
      <div
        className={`relative flex h-full w-full ${width} flex-col border-l border-border bg-white shadow-xl transition-transform duration-200 ease-out ${
          shown ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function DrawerHeader({
  eyebrow,
  title,
  badges,
  actions,
  onClose,
}: {
  eyebrow: string;
  title: string;
  badges?: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{eyebrow}</p>
        <h2 className="mt-0.5 truncate text-[15px] font-semibold tracking-tight text-text-primary">{title}</h2>
        {badges && <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{badges}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {actions}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-7 w-7 items-center justify-center rounded-[3px] text-text-muted hover:bg-brand-50 hover:text-text-primary"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

export function DrawerTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-border px-3">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`relative px-2.5 py-2 text-[12px] font-medium transition-colors ${
            active === t.key ? "text-brand-800" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {t.label}
          {active === t.key && <span className="absolute inset-x-1.5 -bottom-px h-[2px] rounded-full bg-brand-700" />}
        </button>
      ))}
    </div>
  );
}
