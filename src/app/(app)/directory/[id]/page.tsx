import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { buttonClass } from "@/components/ui/button";
import { ChevronLeft } from "@/components/ui/icons";
import { EditUserForm } from "@/components/directory/edit-user-form";

export default async function DirectoryUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { membership } = await requirePageContext();

  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  const { id } = await params;
  const projectId = membership.projectId;

  const target = await prisma.user.findUnique({
    where: { id },
    include: {
      organization: true,
      projectMembers: { include: { project: true } },
      roleAssignments: { include: { role: true, project: true } },
      mailingGroupMemberships: { include: { group: true } },
    },
  });
  if (!target) notFound();

  const canEdit = await hasPermission(membership.userId, "DIRECTORY_EDIT_USER", { projectId });
  if (target.visibility === "HIDDEN" && !canEdit) notFound();

  return (
    <div>
      <PageHeader
        title={target.name}
        subtitle={target.accountType === "GUEST" ? "Guest user" : "Full user"}
        actions={
          <Link href="/directory" className={buttonClass("secondary", "md")}>
            <ChevronLeft size={14} />
            Back
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-3xl p-6">
        <div className="rounded-[3px] border border-border bg-white">
          <SectionHeader>General</SectionHeader>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
            <Row label="Given Name" value={target.givenName ?? "—"} />
            <Row label="Family Name" value={target.familyName ?? "—"} />
            <Row label="Job Title" value={target.jobTitle ?? "—"} />
            <Row label="Division" value={target.division ?? "—"} />
            <Row label="Organization" value={target.organization.name} />
            <Row label="Account Type" value={target.accountType === "GUEST" ? "Guest user" : "Full user"} />
            <Row
              label="Account Status"
              value={
                <span
                  className={`rounded-[3px] px-2 py-0.5 text-[11px] font-medium ${
                    target.isActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {target.isActive ? "Active" : "Disabled"}
                </span>
              }
            />
            <Row
              label="Directory Visibility"
              value={
                <span
                  className={`rounded-[3px] px-2 py-0.5 text-[11px] font-medium ${
                    target.visibility === "VISIBLE" ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {target.visibility === "VISIBLE" ? "Visible" : "Hidden"}
                </span>
              }
            />
          </div>

          <SectionHeader>Contact Information</SectionHeader>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
            <Row label="Email" value={target.email} />
            <Row label="Phone" value={target.phone ?? "—"} />
            <Row label="Address" value={target.address ?? "—"} full />
          </div>

          <SectionHeader>Project Membership</SectionHeader>
          <div className="px-4 py-3 text-[13px]">
            {target.projectMembers.length === 0 ? (
              <p className="text-text-muted">Not a member of any project.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {target.projectMembers.map((pm) => (
                  <li key={pm.id} className="flex items-center justify-between">
                    <span>{pm.project.name}</span>
                    <span className="text-text-muted">{pm.role}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <SectionHeader>Roles</SectionHeader>
          <div className="px-4 py-3 text-[13px]">
            {target.roleAssignments.length === 0 ? (
              <p className="text-text-muted">No roles assigned.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {target.roleAssignments.map((ra) => (
                  <li key={ra.id} className="flex items-center justify-between">
                    <span>{ra.role.name}</span>
                    <span className="text-text-muted">{ra.project?.name ?? "Organization-wide"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <SectionHeader>Mailing Groups</SectionHeader>
          <div className="px-4 py-3 text-[13px]">
            {target.mailingGroupMemberships.length === 0 ? (
              <p className="text-text-muted">Not a member of any mailing group.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {target.mailingGroupMemberships.map((mgm) => (
                  <li key={mgm.id}>{mgm.group.name}</li>
                ))}
              </ul>
            )}
          </div>

          {canEdit && (
            <>
              <SectionHeader>Edit</SectionHeader>
              <div className="px-4 py-3">
                <EditUserForm
                  userId={target.id}
                  projectId={projectId}
                  initial={{
                    jobTitle: target.jobTitle ?? "",
                    division: target.division ?? "",
                    phone: target.phone ?? "",
                    address: target.address ?? "",
                    visibility: target.visibility,
                    isActive: target.isActive,
                    accountType: target.accountType,
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, full }: { label: string; value: React.ReactNode; full?: boolean }) {
  return (
    <div className={`flex gap-2 ${full ? "col-span-2" : ""}`}>
      <span className="w-36 shrink-0 text-text-muted">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
