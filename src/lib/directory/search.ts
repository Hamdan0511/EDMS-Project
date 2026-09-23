import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, UserAccountType } from "@prisma/client";

export const DIRECTORY_PAGE_SIZE = 25;

export type DirectorySearchParams = {
  tab?: string; // "project" | "global"
  organizationName?: string;
  name?: string; // Given / Group Name
  familyName?: string;
  jobTitle?: string;
  division?: string;
  userOrGroup?: string; // "all" | "users" | "groups"
  accountType?: string; // "all" | "full" | "guest"
  page?: string;
};

export type DirectoryRow =
  | {
      kind: "user";
      id: string;
      displayName: string;
      organizationName: string;
      jobTitle: string | null;
      division: string | null;
      accountType: UserAccountType;
      email: string;
      phone: string | null;
      address: string | null;
    }
  | {
      kind: "group";
      id: string;
      displayName: string;
      organizationName: string | null;
      memberCount: number;
      locked: boolean;
    };

export function parsePage(pageParam: string | undefined): number {
  const n = Number(pageParam);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function normalizeTab(tab: string | undefined): "project" | "global" {
  return tab === "global" ? "global" : "project";
}

function userWhere(params: DirectorySearchParams, projectId: string, tab: "project" | "global"): Prisma.UserWhereInput {
  const filters: Prisma.UserWhereInput[] = [];

  if (tab === "project") {
    filters.push({ projectMembers: { some: { projectId } } });
  } else {
    // Global: not limited to this project's membership, but still never
    // exposes users hidden from Directory search.
    filters.push({ visibility: "VISIBLE" });
  }

  if (params.organizationName?.trim()) {
    filters.push({ organization: { name: { contains: params.organizationName.trim(), mode: "insensitive" } } });
  }
  if (params.name?.trim()) {
    filters.push({
      OR: [
        { name: { contains: params.name.trim(), mode: "insensitive" } },
        { givenName: { contains: params.name.trim(), mode: "insensitive" } },
      ],
    });
  }
  if (params.familyName?.trim()) {
    filters.push({ familyName: { contains: params.familyName.trim(), mode: "insensitive" } });
  }
  if (params.jobTitle?.trim()) {
    filters.push({ jobTitle: { contains: params.jobTitle.trim(), mode: "insensitive" } });
  }
  if (params.division?.trim()) {
    filters.push({ division: { contains: params.division.trim(), mode: "insensitive" } });
  }
  if (params.accountType === "full") {
    filters.push({ accountType: "FULL" });
  } else if (params.accountType === "guest") {
    filters.push({ accountType: "GUEST" });
  }

  return { AND: filters };
}

function groupWhere(params: DirectorySearchParams, projectId: string, tab: "project" | "global"): Prisma.MailingGroupWhereInput {
  const filters: Prisma.MailingGroupWhereInput[] = [];

  if (tab === "project") {
    filters.push({ projectId });
  } else {
    // Mailing groups are project-scoped entities in this system — there is
    // no cross-project "global group" concept, so Global search never
    // returns groups (an honest empty set, not a fabricated one).
    filters.push({ id: "__no_global_groups__" });
  }

  if (params.organizationName?.trim()) {
    filters.push({ organization: { name: { contains: params.organizationName.trim(), mode: "insensitive" } } });
  }
  if (params.name?.trim()) {
    filters.push({ name: { contains: params.name.trim(), mode: "insensitive" } });
  }
  // Groups have no job title/division/family name — a query combining those
  // filters with userOrGroup=groups correctly yields zero group rows below.
  if (params.jobTitle?.trim() || params.division?.trim() || params.familyName?.trim()) {
    filters.push({ id: "__no_match__" });
  }

  return { AND: filters };
}

export async function searchDirectory(params: {
  projectId: string;
  search: DirectorySearchParams;
}): Promise<{ rows: DirectoryRow[]; total: number; page: number; pageSize: number }> {
  const { projectId, search } = params;
  const tab = normalizeTab(search.tab);
  const page = parsePage(search.page);
  const pageSize = DIRECTORY_PAGE_SIZE;
  const includeUsers = search.userOrGroup !== "groups";
  const includeGroups = search.userOrGroup === "groups" || search.userOrGroup === "all" || !search.userOrGroup;

  const uWhere = userWhere(search, projectId, tab);
  const gWhere = groupWhere(search, projectId, tab);

  const [userTotal, groupTotal] = await Promise.all([
    includeUsers ? prisma.user.count({ where: uWhere }) : Promise.resolve(0),
    includeGroups ? prisma.mailingGroup.count({ where: gWhere }) : Promise.resolve(0),
  ]);

  const total = userTotal + groupTotal;
  const skip = (page - 1) * pageSize;
  const rows: DirectoryRow[] = [];

  // Users are listed first, then groups — offsets are computed against that
  // fixed ordering so pagination is correct across the boundary between
  // the two real, separately-counted result sets.
  if (includeUsers && skip < userTotal) {
    const users = await prisma.user.findMany({
      where: uWhere,
      include: { organization: true },
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
    });
    for (const u of users) {
      rows.push({
        kind: "user",
        id: u.id,
        displayName: u.name,
        organizationName: u.organization.name,
        jobTitle: u.jobTitle,
        division: u.division,
        accountType: u.accountType,
        email: u.email,
        phone: u.phone,
        address: u.address,
      });
    }
  }

  const remaining = pageSize - rows.length;
  if (includeGroups && remaining > 0) {
    const groupSkip = Math.max(0, skip - userTotal);
    const groups = await prisma.mailingGroup.findMany({
      where: gWhere,
      include: { organization: true, _count: { select: { members: true } } },
      orderBy: { name: "asc" },
      skip: groupSkip,
      take: remaining,
    });
    for (const g of groups) {
      rows.push({
        kind: "group",
        id: g.id,
        displayName: g.name,
        organizationName: g.organization?.name ?? null,
        memberCount: g._count.members,
        locked: g.locked,
      });
    }
  }

  return { rows, total, page, pageSize };
}
