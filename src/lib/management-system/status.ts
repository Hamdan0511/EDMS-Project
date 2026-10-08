import type { ManagementSystemCategory } from "@prisma/client";

/** Never display the raw enum to users — always go through this map. */
export const MANAGEMENT_SYSTEM_LABELS: Record<ManagementSystemCategory, string> = {
  QUALITY: "Quality",
  ENVIRONMENT: "Environment",
  HSE: "Health & Safety",
};

export const MANAGEMENT_SYSTEM_ORDER: ManagementSystemCategory[] = ["QUALITY", "ENVIRONMENT", "HSE"];

/** Centralized ISO standard mapping — the one place this is defined, per the
 * brief's explicit "do not hardcode this across dozens of components." */
export const ISO_STANDARD_LABELS: Record<ManagementSystemCategory, string> = {
  QUALITY: "ISO 9001:2015",
  ENVIRONMENT: "ISO 14001:2015",
  HSE: "ISO 45001:2018",
};

export const MANAGEMENT_SYSTEM_DESCRIPTIONS: Record<ManagementSystemCategory, string> = {
  QUALITY: "Quality Management System",
  ENVIRONMENT: "Environmental Management System",
  HSE: "Occupational Health and Safety Management System",
};

export const MANAGEMENT_SYSTEM_BADGE_CLASSES: Record<ManagementSystemCategory, string> = {
  QUALITY: "bg-brand-100 text-brand-800",
  ENVIRONMENT: "bg-emerald-100 text-emerald-800",
  HSE: "bg-amber-100 text-amber-800",
};

export function isManagementSystemCategory(value: string): value is ManagementSystemCategory {
  return (MANAGEMENT_SYSTEM_ORDER as string[]).includes(value);
}

/** Sentinel filter value representing a real, honest "Not specified" state
 * for nullable columns (e.g. Author) — never a fabricated value, just a
 * selectable stand-in for null so the filter can still isolate those rows. */
export const NO_VALUE = "__none__";

/**
 * The legitimate Doc Owner vocabulary for this controlled-document register
 * (the real organizational departments that can own a document), kept
 * separate from which values the current 46 imported documents actually
 * use. A department with zero current documents is still a real, selectable
 * filter option — filter-option existence is not the same thing as
 * document existence. These are internal/DB values; `DOC_OWNER_LABELS`
 * supplies the user-facing label for the ones that need one (currently just
 * "HSE" → "Health & Safety", matching the Management System category's own
 * label). Nothing here changes any stored document's actual owner value.
 */
export const DOC_OWNER_VOCABULARY = [
  "Area",
  "Contractual&Commercial",
  "Estimating (Building)",
  "Finance&Administration",
  "HSE",
  "ICT",
  "Office Management&PR",
  "Operations",
  "Personnel&General Affairs",
  "Plant&Logistics",
  "QA/QC",
] as const;

export const DOC_OWNER_LABELS: Record<string, string> = {
  HSE: "Health & Safety",
};

export function docOwnerLabel(value: string): string {
  return DOC_OWNER_LABELS[value] ?? value;
}
