import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { HsePageHeader } from "@/components/hse/hse-page-header";
import { EmergencyContactsTable } from "@/components/hse/emergency-contacts-table";

export default async function EmergencyContactsPage() {
  const { user, membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }
  const projectId = membership.projectId;
  const canManage = await hasPermission(user.id, "HSE_MANAGE_EMERGENCY", { projectId });

  const [contacts, members] = await Promise.all([
    prisma.hseEmergencyContact.findMany({
      where: { projectId },
      include: { organization: true },
      orderBy: { name: "asc" },
    }),
    prisma.projectMember.findMany({ where: { projectId }, include: { organization: true } }),
  ]);

  const organizations = Array.from(
    new Map(members.map((m) => [m.organization.id, { id: m.organization.id, name: m.organization.name }])).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="p-6">
      <HsePageHeader
        title="Emergency Contacts"
        description="HSE managers, site managers, first aiders, fire wardens, and other emergency points of contact for this project."
      />
      <div className="mt-4">
        <EmergencyContactsTable
          projectId={projectId}
          organizations={organizations}
          canManage={canManage}
          rows={contacts.map((c) => ({
            id: c.id,
            name: c.name,
            role: c.role,
            organizationId: c.organizationId,
            organizationName: c.organization?.name ?? null,
            phone: c.phone,
            email: c.email,
            emergencyType: c.emergencyType,
            location: c.location,
            availability: c.availability,
            notes: c.notes,
          }))}
        />
      </div>
    </div>
  );
}
