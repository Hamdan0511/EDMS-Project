import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getCurrentProjectMembership, listUserProjects } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { TopHeader } from "@/components/app-shell/top-header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [projects, membership, organization] = await Promise.all([
    listUserProjects(user),
    getCurrentProjectMembership(user),
    prisma.organization.findUnique({ where: { id: user.organizationId } }),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <TopHeader
        user={user}
        orgName={organization?.name ?? ""}
        role={membership?.role}
        projects={projects}
        currentProjectId={membership?.projectId ?? null}
      />
      <main className="flex-1 bg-background">{children}</main>
    </div>
  );
}
