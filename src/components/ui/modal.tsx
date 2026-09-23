"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "@/components/ui/icons";

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [open, onClose]);

  if (!open) return null;

  // Rendered via a portal into document.body rather than in place: a modal
  // is frequently opened from inside a page-level <form> (e.g. Document
  // Register's filter form), and this component's own content often
  // includes a <form> of its own (e.g. Advanced Search) — nesting <form>
  // inside <form> is invalid HTML and triggers a hydration error. A portal
  // keeps React's component tree (context, event bubbling) intact while
  // moving the actual DOM node outside any ancestor form.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${width} rounded-[4px] border border-border bg-white shadow-lg`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center rounded-[3px] text-text-muted hover:bg-brand-50 hover:text-text-primary"
          >
            <X size={14} />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
