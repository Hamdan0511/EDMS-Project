import { afterEach, describe, expect, it, vi } from "vitest";
import { logger, redact } from "@/lib/logger";

describe("redact", () => {
  it("redacts top-level sensitive keys", () => {
    expect(redact({ password: "hunter2" })).toEqual({ password: "[REDACTED]" });
    expect(redact({ token: "abc" })).toEqual({ token: "[REDACTED]" });
    expect(redact({ sessionToken: "abc" })).toEqual({ sessionToken: "[REDACTED]" });
    expect(redact({ cookie: "x=y" })).toEqual({ cookie: "[REDACTED]" });
    expect(redact({ secret: "x" })).toEqual({ secret: "[REDACTED]" });
    expect(redact({ Authorization: "Bearer x" })).toEqual({ Authorization: "[REDACTED]" });
    expect(redact({ credentials: "x" })).toEqual({ credentials: "[REDACTED]" });
  });

  it("redacts sensitive keys nested arbitrarily deep", () => {
    const input = { user: { auth: { passwordHash: "abc123" } } };
    expect(redact(input)).toEqual({ user: { auth: { passwordHash: "[REDACTED]" } } });
  });

  it("redacts sensitive keys inside arrays of objects", () => {
    const input = { sessions: [{ tokenHash: "a" }, { tokenHash: "b" }] };
    expect(redact(input)).toEqual({ sessions: [{ tokenHash: "[REDACTED]" }, { tokenHash: "[REDACTED]" }] });
  });

  it("leaves non-sensitive fields untouched", () => {
    const input = { email: "user@example.com", projectId: "p1", count: 3, active: true };
    expect(redact(input)).toEqual(input);
  });

  it("does not choke on deeply nested structures — caps recursion instead of stack-overflowing", () => {
    let deep: unknown = { password: "leaf" };
    for (let i = 0; i < 20; i++) deep = { nested: deep };
    expect(() => redact(deep)).not.toThrow();
  });

  it("passes through primitives and null unchanged", () => {
    expect(redact("plain string")).toBe("plain string");
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBe(null);
    expect(redact(undefined)).toBe(undefined);
  });
});

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logger.error writes redacted context to console.error as structured JSON", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("LOGIN_FAILED", { email: "user@example.com", password: "hunter2" });

    expect(spy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged.level).toBe("error");
    expect(logged.event).toBe("LOGIN_FAILED");
    expect(logged.context.email).toBe("user@example.com");
    expect(logged.context.password).toBe("[REDACTED]");
    expect(typeof logged.timestamp).toBe("string");
  });

  it("logger.info writes to console.log, not console.error", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("LOGIN_SUCCEEDED", { email: "user@example.com" });
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
