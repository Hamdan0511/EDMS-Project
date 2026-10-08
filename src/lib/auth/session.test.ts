import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * getCurrentUser is wrapped in React's cache(), which memoizes per call
 * site/module instance. Each test below resets modules and re-imports fresh
 * so one test's mocked DB state can never leak into the next via that cache.
 */
function makeCookieStore(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    get: (name: string) => (store.has(name) ? { name, value: store.get(name)! } : undefined),
    set: (name: string, value: string) => {
      store.set(name, value);
    },
    delete: (name: string) => {
      store.delete(name);
    },
  };
}

async function loadSessionModule(opts: {
  cookieStore: ReturnType<typeof makeCookieStore>;
  session?: unknown;
  prismaOverrides?: Record<string, unknown>;
}) {
  vi.resetModules();
  vi.doMock("next/headers", () => ({
    cookies: async () => opts.cookieStore,
  }));
  const findUnique = vi.fn().mockResolvedValue(opts.session ?? null);
  const del = vi.fn().mockResolvedValue(undefined);
  const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
  const create = vi.fn().mockResolvedValue(undefined);
  vi.doMock("@/lib/prisma", () => ({
    prisma: {
      session: {
        findUnique,
        delete: del,
        deleteMany,
        create,
        ...opts.prismaOverrides,
      },
    },
  }));
  const mod = await import("@/lib/auth/session");
  return { mod, findUnique, delete: del, deleteMany, create };
}

afterEach(() => {
  vi.doUnmock("next/headers");
  vi.doUnmock("@/lib/prisma");
});

describe("getCurrentUser", () => {
  it("returns null when there is no session cookie", async () => {
    const { mod } = await loadSessionModule({ cookieStore: makeCookieStore() });
    await expect(mod.getCurrentUser()).resolves.toBeNull();
  });

  it("returns null and deletes the session when it has expired", async () => {
    const cookieStore = makeCookieStore({ shanfari_session: "token-abc" });
    const expiredSession = {
      id: "session-1",
      expiresAt: new Date(Date.now() - 1000),
      user: { id: "user-1", isActive: true },
    };
    const { mod, delete: del } = await loadSessionModule({ cookieStore, session: expiredSession });
    await expect(mod.getCurrentUser()).resolves.toBeNull();
    expect(del).toHaveBeenCalledWith({ where: { id: "session-1" } });
  });

  it("returns null and deletes the session when the user has been deactivated", async () => {
    const cookieStore = makeCookieStore({ shanfari_session: "token-abc" });
    const deactivatedUserSession = {
      id: "session-2",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      user: { id: "user-1", isActive: false },
    };
    const { mod, delete: del } = await loadSessionModule({ cookieStore, session: deactivatedUserSession });
    await expect(mod.getCurrentUser()).resolves.toBeNull();
    expect(del).toHaveBeenCalledWith({ where: { id: "session-2" } });
  });

  it("returns the user for a valid, unexpired session with an active account", async () => {
    const cookieStore = makeCookieStore({ shanfari_session: "token-abc" });
    const activeSession = {
      id: "session-3",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      user: { id: "user-1", isActive: true, name: "Test User" },
    };
    const { mod, delete: del } = await loadSessionModule({ cookieStore, session: activeSession });
    const user = await mod.getCurrentUser();
    expect(user).toEqual(activeSession.user);
    expect(del).not.toHaveBeenCalled();
  });
});

describe("requireCurrentUser", () => {
  it("throws when there is no authenticated user", async () => {
    const { mod } = await loadSessionModule({ cookieStore: makeCookieStore() });
    await expect(mod.requireCurrentUser()).rejects.toThrow("UNAUTHENTICATED");
  });

  it("returns the user when authenticated", async () => {
    const cookieStore = makeCookieStore({ shanfari_session: "token-abc" });
    const activeSession = {
      id: "session-4",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      user: { id: "user-1", isActive: true },
    };
    const { mod } = await loadSessionModule({ cookieStore, session: activeSession });
    await expect(mod.requireCurrentUser()).resolves.toEqual(activeSession.user);
  });
});

describe("createSession", () => {
  it("persists a hashed session token and sets a real cookie, never the raw token as a hash", async () => {
    const cookieStore = makeCookieStore();
    const setSpy = vi.spyOn(cookieStore, "set");
    const { mod, create } = await loadSessionModule({ cookieStore });
    await mod.createSession("user-1");

    expect(create).toHaveBeenCalledTimes(1);
    const createArgs = create.mock.calls[0][0];
    expect(createArgs.data.userId).toBe("user-1");
    expect(typeof createArgs.data.tokenHash).toBe("string");
    expect(createArgs.data.tokenHash).toHaveLength(64); // sha256 hex digest

    expect(setSpy).toHaveBeenCalledTimes(1);
    const [cookieName, cookieValue] = setSpy.mock.calls[0];
    expect(cookieName).toBe("shanfari_session");
    // The raw cookie token must never equal the stored hash.
    expect(cookieValue).not.toBe(createArgs.data.tokenHash);
  });
});

describe("destroySession", () => {
  it("deletes the session row matching the cookie's token hash and clears the cookie", async () => {
    const cookieStore = makeCookieStore({ shanfari_session: "token-abc" });
    const deleteSpy = vi.spyOn(cookieStore, "delete");
    const { mod, deleteMany } = await loadSessionModule({ cookieStore });
    await mod.destroySession();

    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledWith("shanfari_session");
  });

  it("does nothing destructive when there is no session cookie to begin with", async () => {
    const cookieStore = makeCookieStore();
    const { mod, deleteMany } = await loadSessionModule({ cookieStore });
    await mod.destroySession();
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
