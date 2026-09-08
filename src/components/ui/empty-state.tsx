import { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "border-dashed border-border bg-white",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Override the container's border/background classes (default unchanged). */
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-[3px] border px-6 py-14 text-center ${className}`}
    >
      {icon && <div className="mb-1 text-text-muted">{icon}</div>}
      <p className="text-[13px] font-medium text-text-primary">{title}</p>
      {description && <p className="max-w-md text-xs text-text-secondary">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
