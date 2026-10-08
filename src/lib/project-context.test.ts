import { afterEach, describe, expect, it, vi } from "vitest";

function makeCookieStore(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    get: (name: string) => (store.has(name) ? { name, value: store.get(name)! } : undefined),
  };
}

async function loadProjectContextModule(opts: {
  cookieStore: ReturnType<typeof makeCookieStore>;
  findUniqueResult?: unknown;
  findFirstResult?: unknown;
  findManyResult?: unknown[];
}) {
  vi.resetModules();
  vi.doMock("next/headers", () => ({
    cookies: async () => opts.cookieStore,
  }));
  const findUnique = vi.fn().mockResolvedValue(opts.findUniqueResult ?? null);
  const findFirst = vi.fn().mockResolvedValue(opts.findFirstResult ?? null);
  const findMany = vi.fn().mockResolvedValue(opts.findManyResult ?? []);
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      projectMember: { findUnique, findFirst, findMany },
    },
  }));
  const mod = await import("@/lib/project-context");
  return { mod, findUnique, findFirst, findMany };
}

afterEach(() => {
  vi.doUnmock("next/headers");
  vi.doUnmock("@/lib/prisma");
});

const USER = { id: "user-1" } as never;

describe("getCurrentProjectMembership", () => {
  it("prefers the cookie's project when that membership is real", async () => {
    const membership = { projectId: "project-cookie", userId: "user-1", project: { id: "project-cookie" } };
    const { mod, findUnique, findFirst } = await loadProjectContextModule({
      cookieStore: makeCookieStore({ shanfari_project: "project-cookie" }),
      findUniqueResult: membership,
    });
    await expect(mod.getCurrentProjectMembership(USER)).resolves.toEqual(membership);
    expect(findUnique).toHaveBeenCalledWith({
      where: { projectId_userId: { projectId: "project-cookie", userId: "user-1" } },
      include: { project: true },
    });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("falls back to the user's first real membership when the cookie points at a project they are not a member of (stale cookie cannot leak another project)", async () => {
    const fallback = { projectId: "project-real", userId: "user-1", project: { id: "project-real" } };
    const { mod, findUnique, findFirst } = await loadProjectContextModule({
      cookieStore: makeCookieStore({ shanfari_project: "project-someone-elses" }),
      findUniqueResult: null,
      findFirstResult: fallback,
    });
    await expect(mod.getCurrentProjectMembership(USER)).resolves.toEqual(fallback);
    expect(findUnique).toHaveBeenCalledWith({
      where: { projectId_userId: { projectId: "project-someone-elses", userId: "user-1" } },
      include: { project: true },
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      include: { project: true },
      orderBy: { createdAt: "asc" },
    });
  });

  it("falls back to findFirst when there is no project cookie at all", async () => {
    const fallback = { projectId: "project-real", userId: "user-1", project: { id: "project-real" } };
    const { mod, findUnique } = await loadProjectContextModule({
      cookieStore: makeCookieStore(),
      findFirstResult: fallback,
    });
    await expect(mod.getCurrentProjectMembership(USER)).resolves.toEqual(fallback);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns null when the user has no project memberships at all", async () => {
    const { mod } = await loadProjectContextModule({ cookieStore: makeCookieStore() });
    await expect(mod.getCurrentProjectMembership(USER)).resolves.toBeNull();
  });
});

describe("assertProjectMember", () => {
  it("returns the membership when the user really belongs to the project", async () => {
    const membership = { projectId: "project-1", userId: "user-1", project: { id: "project-1" } };
    const { mod } = await loadProjectContextModule({ cookieStore: makeCookieStore(), findUniqueResult: membership });
    await expect(mod.assertProjectMember(USER, "project-1")).resolves.toEqual(membership);
  });

  it("throws FORBIDDEN when the user is not a member of the given project (IDOR guard)", async () => {
    const { mod } = await loadProjectContextModule({ cookieStore: makeCookieStore(), findUniqueResult: null });
    await expect(mod.assertProjectMember(USER, "project-not-mine")).rejects.toThrow("FORBIDDEN");
  });
});

describe("listUserProjects", () => {
  it("maps memberships down to their project records", async () => {
    const memberships = [
      { projectId: "p1", userId: "user-1", project: { id: "p1", name: "Project One" } },
      { projectId: "p2", userId: "user-1", project: { id: "p2", name: "Project Two" } },
    ];
    const { mod } = await loadProjectContextModule({ cookieStore: makeCookieStore(), findManyResult: memberships });
    await expect(mod.listUserProjects(USER)).resolves.toEqual([memberships[0].project, memberships[1].project]);
  });
});
