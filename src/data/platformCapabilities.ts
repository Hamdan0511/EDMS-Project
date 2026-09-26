import { APP_PREVIEWS } from "./shanfariAssets";

/**
 * Every capability listed here corresponds to a real, working module in
 * the actual application (see `src/components/app-shell/nav-items.ts`).
 * Nothing here is aspirational or planned — if a module doesn't exist in
 * the codebase yet, it doesn't appear on this list.
 */
export type PlatformCapability = {
  number: string;
  title: string;
  tagline: string;
  description: string;
  features: string[];
  preview: (typeof APP_PREVIEWS)[keyof typeof APP_PREVIEWS];
};

export const PLATFORM_CAPABILITIES: PlatformCapability[] = [
  {
    number: "01",
    title: "Projects",
    tagline: "One workspace per project",
    description:
      "Every project gets its own connected workspace — real-time summaries of documents, correspondence and activity, with role-based access scoped to the people actually working on it.",
    features: ["Project-scoped workspaces", "Live document & mail summaries", "Organization directory per project"],
    preview: APP_PREVIEWS.home,
  },
  {
    number: "02",
    title: "Information & Documents",
    tagline: "Every document, one register",
    description:
      "A structured document and drawing register with full revision history, review status, metadata search and transmittal tracking — replacing scattered folders and email attachments with a single source of truth.",
    features: ["Revision-controlled registers", "Advanced search & saved filters", "Transmittals & print requests"],
    preview: APP_PREVIEWS.documents,
  },
  {
    number: "03",
    title: "Communication",
    tagline: "Structured correspondence",
    description:
      "A formal mail register for project correspondence — letters, RFIs and transmittals sent and received with full traceability, standard searches and organization-level reporting.",
    features: ["Formal letter & RFI tracking", "Sent, inbox and draft views", "Standard reports & searches"],
    preview: APP_PREVIEWS.mail,
  },
  {
    number: "04",
    title: "Health & Safety",
    tagline: "Report, assess, control, close",
    description:
      "A complete HSE workflow — safety observations, incidents, near misses, hazards and risk assessments, inspections, corrective actions and permits to work, each with a real audit trail from report to closure.",
    features: ["Incidents, hazards & near misses", "Risk assessments & control tracking", "Corrective actions & permits to work"],
    preview: APP_PREVIEWS.hse,
  },
  {
    number: "05",
    title: "Workflows",
    tagline: "Reviews & approvals, controlled",
    description:
      "Configurable review workflows route documents and decisions through the right people in the right order, with full visibility into what's pending, overdue, or awaiting your review.",
    features: ["Sequential review workflows", "Workflow templates", "Overdue & pending-review tracking"],
    preview: APP_PREVIEWS.workflows,
  },
  {
    number: "06",
    title: "Secure Access",
    tagline: "Role-based, project-scoped",
    description:
      "A central directory of every person and organization on a project, backed by a role-based permission system — so access to information is always scoped to who someone actually is on a project.",
    features: ["Company & user directory", "Role-based permissions", "Project-scoped authorization"],
    preview: APP_PREVIEWS.directory,
  },
];
