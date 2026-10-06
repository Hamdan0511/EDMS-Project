import "server-only";

/** Shared scan-max-suffix core — same real, collision-safe pattern as HSE's
 * computeNextNumber and Mail's nextMailNumber. Each Field record type calls
 * this with its own already-fetched list of existing numbers sharing the
 * prefix; the DB's per-project unique constraint on the number column is
 * the final backstop against a concurrent duplicate. */
export function computeNextNumber(existingNumbers: string[], prefix: string): string {
  let maxSuffix = 0;
  for (const num of existingNumbers) {
    const suffix = num.slice(prefix.length);
    const parsed = Number.parseInt(suffix, 10);
    if (Number.isFinite(parsed) && parsed > maxSuffix) {
      maxSuffix = parsed;
    }
  }
  return `${prefix}${String(maxSuffix + 1).padStart(4, "0")}`;
}

const currentYear = () => new Date().getFullYear();

/** FIELD-<KIND>-<YEAR>-#### — a distinct namespace from HSE's HSE-* numbers
 * so the two modules' records are never visually or structurally confused. */
export function fieldNumberPrefix(
  kind: "OBS" | "INS" | "ISS" | "SNAG" | "PL" | "ITP" | "TST" | "RTST" | "WALK",
): string {
  return `FIELD-${kind}-${currentYear()}-`;
}
