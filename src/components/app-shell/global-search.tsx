"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Search } from "@/components/ui/icons";

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <form onSubmit={onSubmit} className="relative hidden md:block">
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cross Project Search"
        className="h-8 w-64 rounded-[3px] border border-border bg-background pl-8 pr-3 text-[13px] text-text-primary placeholder:text-text-muted outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      />
    </form>
  );
}
