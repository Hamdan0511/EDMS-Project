import { afterEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRaw(...args),
  },
}));

const { GET } = await import("./route");

afterEach(() => {
  queryRaw.mockReset();
});

describe("GET /api/health/ready", () => {
  it("returns 200 ok when the database responds", async () => {
    queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: "ok" });
  });

  it("returns 503 and never leaks the underlying error when the database is unreachable", async () => {
    queryRaw.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:5432 password=supersecret"));
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ status: "error" });
    expect(JSON.stringify(body)).not.toMatch(/ECONNREFUSED|supersecret|10\.0\.0\.5/);
  });
});
