/** Curated emergency/drill type suggestions — free text at the DB level
 * (`emergencyType`/`drillType` are plain strings), so this list is a UI
 * convenience, not a constraint, and can be extended without a migration. */
export const EMERGENCY_TYPES = [
  "Fire",
  "Medical Emergency",
  "Chemical Spill",
  "Structural Emergency",
  "Electrical Emergency",
  "Evacuation",
  "Severe Weather",
  "Other",
] as const;

export const DRILL_TYPES = [
  "Fire Drill",
  "Evacuation Drill",
  "Medical Emergency Drill",
  "Spill Response Drill",
  "Other",
] as const;
