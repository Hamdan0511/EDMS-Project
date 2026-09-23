import Link from "next/link";

export function DirectoryTabs({ active }: { active: "project" | "global" }) {
  const tabs: { key: "project" | "global"; label: string }[] = [
    { key: "project", label: "Project" },
    { key: "global", label: "Global" },
  ];
  return (
    <div className="flex gap-1 border-b border-border px-6">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={`/directory?tab=${t.key}`}
          className={[
            "border-b-2 px-3 py-2.5 text-[13px] font-medium",
            active === t.key
              ? "border-brand-700 text-text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary",
          ].join(" ")}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
