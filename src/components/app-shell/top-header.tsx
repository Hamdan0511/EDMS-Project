import Link from "next/link";
import type { Project, User } from "@prisma/client";
import { ProjectSelector } from "./project-selector";
import { UserMenu } from "./user-menu";
import { GlobalSearch } from "./global-search";
import { MainNav } from "./main-nav";
import { HelpMenu } from "./help-menu";
import { NotificationMenu } from "./notification-menu";
import { ShanfariLogo } from "@/components/ui/shanfari-logo";

export function TopHeader({
  user,
  orgName,
  role,
  projects,
  currentProjectId,
}: {
  user: User;
  orgName: string;
  role?: string;
  projects: Project[];
  currentProjectId: string | null;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white">
      <div className="flex h-14 items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-4">
          <Link href="/home">
            <ShanfariLogo />
          </Link>
          <div className="h-6 w-px bg-border" />
          <ProjectSelector projects={projects} currentProjectId={currentProjectId} />
        </div>
        <div className="flex items-center gap-1.5">
          <GlobalSearch />
          <div className="h-5 w-px bg-border" />
          <HelpMenu />
          <NotificationMenu />
          <div className="h-5 w-px bg-border" />
          <UserMenu name={user.name} orgName={orgName} role={role} />
        </div>
      </div>
      <MainNav />
    </header>
  );
}
