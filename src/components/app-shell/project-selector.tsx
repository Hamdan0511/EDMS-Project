"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Project } from "@prisma/client";
import { Dropdown } from "@/components/ui/dropdown";
import { ChevronDown, Check } from "@/components/ui/icons";

export function ProjectSelector({
  projects,
  currentProjectId,
}: {
  projects: Project[];
  currentProjectId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const current = projects.find((p) => p.id === currentProjectId) ?? null;

  async function select(projectId: string, close: () => void) {
    setError(null);
    close();
    const res = await fetch("/api/projects/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    if (!res.ok) {
      setError("Could not switch project");
      return;
    }
    startTransition(() => {
      router.refresh();
    });
  }

  if (projects.length === 0) {
    return <span className="text-sm text-text-muted">No projects</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <Dropdown
        align="left"
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={toggle}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-[3px] border border-border bg-brand-50 px-2.5 py-1.5 text-[13px] font-medium text-text-primary hover:bg-brand-100"
          >
            {current?.shortName ?? "Select project"}
            <ChevronDown
              size={14}
              className={`text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        )}
      >
        {(close) => (
          <div className="max-h-72 w-64 overflow-y-auto py-1">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => select(p.id, close)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-brand-50"
              >
                <Check
                  size={14}
                  className={p.id === currentProjectId ? "text-brand-700" : "text-transparent"}
                />
                <span className="flex flex-col">
                  <span className="font-medium text-text-primary">{p.shortName}</span>
                  <span className="text-[11px] text-text-muted">{p.name}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </Dropdown>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
