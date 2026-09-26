/** Curated equipment categories for the register's type selector. This is a
 * UI convenience list, not a DB constraint — `HseEquipment.equipmentType` is
 * free text, so a category outside this list can still be entered and used;
 * new categories never require a migration. */
export const EQUIPMENT_TYPES = [
  "Crane",
  "Forklift",
  "Excavator",
  "MEWP",
  "Generator",
  "Ladder",
  "Scaffold",
  "Lifting Equipment",
  "Electrical Equipment",
  "Fire Equipment",
  "Vehicle",
  "Other",
] as const;

const DEFAULT_CHECKLIST = ["General Condition", "Safety Guards / Devices", "Controls", "Emergency Stop"];

/** Pre-use inspection checklist items per equipment type. Any type not
 * listed here (including free-text types outside EQUIPMENT_TYPES) falls
 * back to DEFAULT_CHECKLIST rather than failing. */
const CHECKLISTS: Record<string, string[]> = {
  Forklift: ["Brakes", "Steering", "Tyres", "Lights", "Horn", "Seat Belt", "Hydraulic System", "Forks", "Safety Guards", "Emergency Stop"],
  Crane: ["Wire Ropes", "Hooks & Safety Latches", "Brakes", "Limit Switches", "Outriggers", "Load Chart Displayed", "Emergency Stop"],
  Excavator: ["Brakes", "Tracks / Tyres", "Bucket & Attachments", "Hydraulic System", "Lights", "Horn", "Seat Belt", "Emergency Stop"],
  MEWP: ["Guardrails", "Controls (Platform & Base)", "Emergency Lowering", "Outriggers / Stabilisers", "Tyres", "Emergency Stop"],
  Generator: ["Fuel System", "Electrical Connections", "Earthing", "Emergency Stop", "Guards"],
  Ladder: ["Rungs / Steps", "Feet / Base", "Locking Mechanism", "Overall Condition"],
  Scaffold: ["Base Plates / Sole Boards", "Standards & Ledgers", "Guardrails", "Toe Boards", "Ties / Bracing", "Access Ladder", "Tag Displayed"],
  "Lifting Equipment": ["Slings / Chains", "Hooks & Safety Latches", "Shackles", "Load Rating Tag", "Wear & Corrosion"],
  "Electrical Equipment": ["Cables & Plugs", "Earthing", "Insulation", "RCD / Circuit Breaker", "Casing Condition"],
  "Fire Equipment": ["Pressure Gauge", "Seal / Pin", "Hose / Nozzle", "Signage & Access", "Service Tag Date"],
  Vehicle: ["Brakes", "Tyres", "Lights", "Horn", "Seat Belts", "Mirrors", "Fluid Levels"],
  Other: DEFAULT_CHECKLIST,
};

export function checklistForEquipmentType(equipmentType: string): string[] {
  return CHECKLISTS[equipmentType] ?? DEFAULT_CHECKLIST;
}
