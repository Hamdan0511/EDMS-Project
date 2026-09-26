import type { HseLikelihood, HseSeverity, HseRiskLevel } from "@prisma/client";

/**
 * A configurable default 5x4 risk matrix (Likelihood x Severity -> Risk
 * Level). This is a reasonable working default for the system to function,
 * not Shanfari's official HSE risk methodology — if the company provides
 * one, this table is the single place to change it.
 */
const LIKELIHOOD_SCORE: Record<HseLikelihood, number> = {
  RARE: 1,
  UNLIKELY: 2,
  POSSIBLE: 3,
  LIKELY: 4,
  ALMOST_CERTAIN: 5,
};

const SEVERITY_SCORE: Record<HseSeverity, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export const LIKELIHOOD_OPTIONS: { value: HseLikelihood; label: string }[] = [
  { value: "RARE", label: "Rare" },
  { value: "UNLIKELY", label: "Unlikely" },
  { value: "POSSIBLE", label: "Possible" },
  { value: "LIKELY", label: "Likely" },
  { value: "ALMOST_CERTAIN", label: "Almost Certain" },
];

export const SEVERITY_OPTIONS: { value: HseSeverity; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

export const RISK_LEVEL_LABELS: Record<HseRiskLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const RISK_LEVEL_BADGE_CLASSES: Record<HseRiskLevel, string> = {
  LOW: "bg-emerald-100 text-emerald-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

/** Real calculation, not free text — likelihood x severity score maps onto
 * a risk band. Adjust the thresholds here if Shanfari supplies an official
 * matrix. */
export function calculateRiskLevel(likelihood: HseLikelihood, severity: HseSeverity): HseRiskLevel {
  const score = LIKELIHOOD_SCORE[likelihood] * SEVERITY_SCORE[severity];
  if (score >= 15) return "CRITICAL";
  if (score >= 8) return "HIGH";
  if (score >= 3) return "MEDIUM";
  return "LOW";
}
