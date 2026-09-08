"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export function PageSizeSelect({ pageSize }: { pageSize: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("pageSize", e.target.value);
    sp.set("page", "1");
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <label className="flex items-center gap-1.5 text-xs text-text-secondary">
      Rows per page
      <select
        value={pageSize}
        onChange={onChange}
        className="h-7 rounded-[3px] border border-border bg-white px-1.5 text-xs outline-none focus:border-accent"
      >
        {PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </label>
  );
}
