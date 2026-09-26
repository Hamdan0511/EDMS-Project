import "server-only";

/** Shared scan-max-suffix core — same real, collision-safe pattern as Mail's
 * nextMailNumber and Workflow's nextWorkflowNumber. Each HSE record type
 * calls this with its own already-fetched list of existing numbers sharing
 * the prefix; the DB's per-project unique constraint on the number column is
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

export function hseNumberPrefix(
  kind: "OBS" | "INC" | "NM" | "HAZ" | "RA" | "INS" | "ACT" | "PTW" | "EQP" | "EQI" | "EMR" | "DRL",
): string {
  return `HSE-${kind}-${currentYear()}-`;
}
