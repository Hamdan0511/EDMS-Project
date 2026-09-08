/** Shared (client + server) parser for page-selection syntax like
 * "3,7,10-15,20,22,25-28". Pure logic, no I/O — safe to import from a
 * client component AND re-validate independently on the server, since the
 * server must never trust a client-computed page list. */
export function parsePageSelection(
  input: string,
  totalPages: number,
): { pages: number[]; error: string | null } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { pages: [], error: "Enter at least one page number or range." };
  }

  const seen = new Set<number>();
  const pages: number[] = [];
  const segments = trimmed.split(",").map((s) => s.trim()).filter(Boolean);

  if (segments.length === 0) {
    return { pages: [], error: "Enter at least one page number or range." };
  }

  for (const segment of segments) {
    const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(segment);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start < 1 || end < 1) {
        return { pages: [], error: `Invalid range "${segment}": pages must be 1 or greater.` };
      }
      if (start > end) {
        return { pages: [], error: `Invalid range "${segment}": start page must not be greater than end page.` };
      }
      if (end > totalPages) {
        return { pages: [], error: `Invalid range "${segment}": this PDF only has ${totalPages} pages.` };
      }
      for (let p = start; p <= end; p++) {
        if (!seen.has(p)) {
          seen.add(p);
          pages.push(p);
        }
      }
      continue;
    }

    if (!/^\d+$/.test(segment)) {
      return { pages: [], error: `Invalid page entry "${segment}". Use page numbers or ranges like 3 or 10-15.` };
    }
    const page = Number(segment);
    if (page < 1) {
      return { pages: [], error: `Invalid page "${segment}": pages must be 1 or greater.` };
    }
    if (page > totalPages) {
      return { pages: [], error: `Invalid page "${segment}": this PDF only has ${totalPages} pages.` };
    }
    if (!seen.has(page)) {
      seen.add(page);
      pages.push(page);
    }
  }

  if (pages.length === 0) {
    return { pages: [], error: "Enter at least one page number or range." };
  }

  return { pages, error: null };
}

export function formatPageSelection(pages: number[]): string {
  return pages.join(", ");
}
