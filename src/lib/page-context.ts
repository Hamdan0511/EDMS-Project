import "server-only";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentProjectMembership, type ProjectMembership } from "@/lib/project-context";
import type { User } from "@prisma/client";

export type PageContext = {
  user: User;
  membership: ProjectMembership | null;
};

/**
 * Standard entry point for pages inside the (app) route group. Redirects
 * to /login if unauthenticated (defense in depth — the layout already does
 * this, but a page should never assume it). Returns membership: null when
 * the user has no project assigned yet, which pages should render as an
 * honest empty state rather than crashing.
 */
export async function requirePageContext(): Promise<PageContext> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const membership = await getCurrentProjectMembership(user);
  return { user, membership };
}
