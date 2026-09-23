"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";

export function PermissionMatrix({
  projectId,
  roles,
  permissions,
  grants,
}: {
  projectId: string;
  roles: { id: string; name: string; isSystem: boolean }[];
  permissions: { id: string; code: string; description: string; category: string }[];
  /** Set of "roleId:permissionId" pairs that are currently granted. */
  grants: string[];
}) {
  const router = useRouter();
  const [grantSet, setGrantSet] = useState(new Set(grants));
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(roleId: string, permissionId: string) {
    const key = `${roleId}:${permissionId}`;
    const nextGranted = !grantSet.has(key);
    setPending(key);
    setError(null);
    const res = await fetch("/api/roles/permissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, roleId, permissionId, granted: nextGranted }),
    });
    const body = await res.json().catch(() => ({}));
    setPending(null);
    if (!res.ok) {
      setError(body.error ?? "Failed to update the permission.");
      return;
    }
    setGrantSet((prev) => {
      const next = new Set(prev);
      if (nextGranted) next.add(key);
      else next.delete(key);
      return next;
    });
    router.refresh();
  }

  const categories = Array.from(new Set(permissions.map((p) => p.category)));

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>
      )}
      <div className="overflow-x-auto rounded-[3px] border border-border bg-white">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="px-3 py-2 text-left font-semibold text-text-secondary">Permission</th>
              {roles.map((r) => (
                <th key={r.id} className="px-3 py-2 text-center font-semibold text-text-secondary">
                  {r.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <Fragment key={category}>
                <tr className="bg-background">
                  <td colSpan={roles.length + 1} className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    {category}
                  </td>
                </tr>
                {permissions
                  .filter((p) => p.category === category)
                  .map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <span className="font-medium text-text-primary">{p.code}</span>
                        <span className="ml-2 text-text-muted">{p.description}</span>
                      </td>
                      {roles.map((r) => {
                        const key = `${r.id}:${p.id}`;
                        return (
                          <td key={key} className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={grantSet.has(key)}
                              disabled={pending === key}
                              onChange={() => toggle(r.id, p.id)}
                              className="h-3.5 w-3.5 accent-brand-700"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
