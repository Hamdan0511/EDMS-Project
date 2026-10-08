import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("hashes a password into a non-reversible bcrypt string", async () => {
    const hash = await hashPassword("Correct Horse Battery Staple");
    expect(hash).not.toBe("Correct Horse Battery Staple");
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it("produces a different hash for the same password each time (real salting)", async () => {
    const hash1 = await hashPassword("SamePassword123!");
    const hash2 = await hashPassword("SamePassword123!");
    expect(hash1).not.toBe(hash2);
  });

  it("verifies the correct password against its own hash", async () => {
    const hash = await hashPassword("ChangeMe123!");
    await expect(verifyPassword("ChangeMe123!", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password against an unrelated hash", async () => {
    const hash = await hashPassword("ChangeMe123!");
    await expect(verifyPassword("WrongPassword!", hash)).resolves.toBe(false);
  });

  it("rejects an empty-string password against a real hash", async () => {
    const hash = await hashPassword("ChangeMe123!");
    await expect(verifyPassword("", hash)).resolves.toBe(false);
  });

  it("is case-sensitive", async () => {
    const hash = await hashPassword("CaseSensitive1");
    await expect(verifyPassword("casesensitive1", hash)).resolves.toBe(false);
  });
});
