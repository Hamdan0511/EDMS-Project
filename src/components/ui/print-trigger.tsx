"use client";

import { useEffect } from "react";

/** Fires the browser's real print dialog once the print view has painted. */
export function PrintTrigger() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 150);
    return () => clearTimeout(t);
  }, []);
  return null;
}
