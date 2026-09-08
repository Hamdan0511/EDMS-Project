"use client";

import { useState } from "react";

export function RecipientDisclosure({ names }: { names: string[] }) {
  const [expanded, setExpanded] = useState(false);

  if (names.length === 0) return <span className="text-text-muted">—</span>;

  if (names.length === 1 || expanded) {
    return <span>{names.join(", ")}</span>;
  }

  return (
    <span>
      {names[0]}{" "}
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-brand-700 hover:underline"
      >
        (+{names.length - 1} more...)
      </button>
    </span>
  );
}
