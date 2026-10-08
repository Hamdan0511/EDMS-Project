import { afterEach, describe, expect, it, vi } from "vitest";

const countMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userRoleAssignment: {
      count: (...args: unknown[]) => countMock(...args),
    },
  },
}));

const { hasPermission, requirePermission, hasAnyPermission, requireAnyPermission, ForbiddenPermissionError } = await import(
  "@/lib/auth/permissions"
);

afterEach(() => {
  countMock.mockReset();
});

describe("hasPermission", () => {
  it("returns true when the DB reports at least one matching role assignment", async () => {
    countMock.mockResolvedValueOnce(1);
    await expect(hasPermission("user-1", "FIELD_VIEW", { projectId: "project-1" })).resolves.toBe(true);
  });

  it("returns false when no matching role assignment exists", async () => {
    countMock.mockResolvedValueOnce(0);
    await expect(hasPermission("user-1", "FIELD_VIEW", { projectId: "project-1" })).resolves.toBe(false);
  });

  it("scopes the query by projectId when given a project scope", async () => {
    countMock.mockResolvedValueOnce(1);
    await hasPermission("user-1", "FIELD_VIEW", { projectId: "project-1" });
    const where = countMock.mock.calls[0][0].where;
    expect(where.userId).toBe("user-1");
    expect(where.OR).toContainEqual({ projectId: "project-1" });
    expect(where.role.permissions.some.permission.code).toBe("FIELD_VIEW");
  });

  it("scopes the query by organizationId when given an organization scope", async () => {
    countMock.mockResolvedValueOnce(1);
    await hasPermission("user-1", "DIRECTORY_MANAGE", { organizationId: "org-1" });
    const where = countMock.mock.calls[0][0].where;
    expect(where.OR).toContainEqual({ organizationId: "org-1" });
  });

  it("never matches on an empty scope (no projectId or organizationId supplied)", async () => {
    countMock.mockResolvedValueOnce(1);
    await hasPermission("user-1", "FIELD_VIEW", {});
    const where = countMock.mock.calls[0][0].where;
    expect(where.OR).toEqual([]);
  });
});

describe("requirePermission", () => {
  it("resolves silently when the permission is held", async () => {
    countMock.mockResolvedValueOnce(1);
    await expect(requirePermission("user-1", "FIELD_VIEW", { projectId: "project-1" })).resolves.toBeUndefined();
  });

  it("throws ForbiddenPermissionError when the permission is missing", async () => {
    countMock.mockResolvedValueOnce(0);
    await expect(requirePermission("user-1", "FIELD_VIEW", { projectId: "project-1" })).rejects.toThrow(ForbiddenPermissionError);
  });
});

describe("hasAnyPermission / requireAnyPermission", () => {
  it("short-circuits on the first permission that is held", async () => {
    countMock.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    const result = await hasAnyPermission("user-1", ["FIELD_MANAGE_ISSUES", "FIELD_VIEW"], { projectId: "project-1" });
    expect(result).toBe(true);
    expect(countMock).toHaveBeenCalledTimes(2);
  });

  it("returns false only after checking every candidate permission", async () => {
    countMock.mockResolvedValue(0);
    const result = await hasAnyPermission("user-1", ["FIELD_MANAGE_ISSUES", "FIELD_VIEW"], { projectId: "project-1" });
    expect(result).toBe(false);
    expect(countMock).toHaveBeenCalledTimes(2);
  });

  it("requireAnyPermission throws only when none of the candidates are held", async () => {
    countMock.mockResolvedValue(0);
    await expect(requireAnyPermission("user-1", ["FIELD_MANAGE_ISSUES"], { projectId: "project-1" })).rejects.toThrow(
      ForbiddenPermissionError,
    );
  });
});
