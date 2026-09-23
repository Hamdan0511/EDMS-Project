"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen, X } from "@/components/ui/icons";

type SavedSearchItem = { id: string; name: string; filters: Record<string, string> };

/** A real left-nav panel scoped to the Documents pages, matching the
 * reference structure — Document Register / Drawings / Temporary Files plus
 * Standard Searches (built-in quick filters + the user's own real Saved
 * Searches). Every link is a genuine query against the register; nothing
 * here is a decorative/dead link. */
export function DocumentsSidebar({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);

  async function loadSavedSearches() {
    const res = await fetch(`/api/saved-searches?projectId=${projectId}&module=DOCUMENTS`).catch(() => null);
    if (res?.ok) setSavedSearches(await res.json());
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadSavedSearches();
    const handler = () => loadSavedSearches();
    window.addEventListener("saved-search-created", handler);
    return () => window.removeEventListener("saved-search-created", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function removeSavedSearch(id: string) {
    await fetch(`/api/saved-searches/${id}`, { method: "DELETE" });
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
  }

  const navItemClass = (active: boolean) =>
    `flex items-center gap-2 rounded-[3px] px-2.5 py-1.5 text-[13px] ${
      active ? "bg-brand-100 font-medium text-brand-800" : "text-text-primary hover:bg-brand-50"
    }`;

  if (collapsed) {
    return (
      <div className="w-9 shrink-0 border-r border-border bg-white py-2">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          className="flex h-7 w-7 items-center justify-center rounded-[3px] text-text-muted hover:bg-brand-50"
        >
          <PanelLeftOpen size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-56 shrink-0 border-r border-border bg-white py-3">
      <div className="mb-2 flex items-center justify-end px-2">
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse sidebar"
          className="flex h-6 w-6 items-center justify-center rounded-[3px] text-text-muted hover:bg-brand-50"
        >
          <PanelLeftClose size={14} />
        </button>
      </div>

      <nav className="flex flex-col gap-0.5 px-2">
        <Link href="/documents" className={navItemClass(pathname === "/documents")}>
          Document Register
        </Link>
        <Link href="/documents/drawings" className={navItemClass(pathname === "/documents/drawings")}>
          Drawings
        </Link>
        <Link href="/documents/temporary-files" className={navItemClass(pathname.startsWith("/documents/temporary-files"))}>
          Temporary Files
        </Link>
      </nav>

      <div className="mx-2 mt-4 border-t border-border pt-3">
        <p className="mb-1 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Standard Searches</p>
        <nav className="flex flex-col gap-0.5">
          <Link href="/documents?status=APPROVED" className={navItemClass(false)}>
            Approved
          </Link>
          <Link href="/documents?status=FOR_REVIEW" className={navItemClass(false)}>
            Issued for Approval
          </Link>
          <Link href="/documents/drawings?sort=dateModified&dir=desc" className={navItemClass(false)}>
            Drawings Modified To...
          </Link>
          <Link href="/documents/temporary-files" className={navItemClass(false)}>
            Temporary Files Uploaded...
          </Link>
        </nav>
      </div>

      {savedSearches.length > 0 && (
        <div className="mx-2 mt-4 border-t border-border pt-3">
          <p className="mb-1 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Saved Searches</p>
          <nav className="flex flex-col gap-0.5">
            {savedSearches.map((s) => {
              const { __path, ...queryFilters } = s.filters;
              const basePath = typeof __path === "string" ? __path : "/documents";
              return (
                <div key={s.id} className="group flex items-center justify-between">
                  <Link href={`${basePath}?${new URLSearchParams(queryFilters).toString()}`} className={`${navItemClass(false)} flex-1`}>
                    {s.name}
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeSavedSearch(s.id)}
                    aria-label={`Remove saved search ${s.name}`}
                    className="hidden pr-1 text-text-muted hover:text-danger group-hover:block"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
