import Link from "next/link";

export type WorkflowFilter =
  | "ALL"
  | "MY_WORKFLOWS"
  | "ASSIGNED_TO_ME"
  | "AWAITING_REVIEW"
  | "OVERDUE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "TERMINATED";

const TABS: { key: WorkflowFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "AWAITING_REVIEW", label: "Awaiting My Review" },
  { key: "MY_WORKFLOWS", label: "My Workflows" },
  { key: "OVERDUE", label: "Overdue" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "COMPLETED", label: "Completed" },
  { key: "REJECTED", label: "Rejected" },
  { key: "TERMINATED", label: "Terminated" },
];

export function WorkflowTabs({ active }: { active: WorkflowFilter }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border px-6">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.key === "ALL" ? "/workflows" : `/workflows?filter=${t.key}`}
          className={[
            "whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium",
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

export function normalizeWorkflowFilter(value: string | undefined): WorkflowFilter {
  const valid: WorkflowFilter[] = [
    "ALL",
    "MY_WORKFLOWS",
    "ASSIGNED_TO_ME",
    "AWAITING_REVIEW",
    "OVERDUE",
    "IN_PROGRESS",
    "COMPLETED",
    "REJECTED",
    "TERMINATED",
  ];
  return valid.includes(value as WorkflowFilter) ? (value as WorkflowFilter) : "ALL";
}
