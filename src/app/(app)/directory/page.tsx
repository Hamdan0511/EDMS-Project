import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Users } from "@/components/ui/icons";

export default async function DirectoryPage() {
  const { membership } = await requirePageContext();

  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  const members = await prisma.projectMember.findMany({
    where: { projectId: membership.projectId },
    include: { user: true, organization: true },
    orderBy: [{ organization: { name: "asc" } }, { user: { name: "asc" } }],
  });

  return (
    <div>
      <PageHeader title="Directory" subtitle={`${members.length} project member${members.length === 1 ? "" : "s"}`} />
      <div className="p-6">
        {members.length === 0 ? (
          <EmptyState
            icon={<Users size={26} strokeWidth={1.25} />}
            title="No members on this project"
            description="Project members will appear here once they are added."
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Organization</Th>
                <Th>Job Title</Th>
                <Th>Email</Th>
                <Th>Role</Th>
              </Tr>
            </Thead>
            <Tbody>
              {members.map((m) => (
                <Tr key={m.id}>
                  <Td className="font-medium">{m.user.name}</Td>
                  <Td className="text-text-secondary">{m.organization.name}</Td>
                  <Td className="text-text-secondary">{m.user.jobTitle ?? "—"}</Td>
                  <Td className="text-text-secondary">{m.user.email}</Td>
                  <Td className="text-text-secondary">{m.role}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
