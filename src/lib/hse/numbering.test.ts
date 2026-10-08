import { describe, expect, it } from "vitest";
import { computeNextNumber, hseNumberPrefix } from "@/lib/hse/numbering";

describe("computeNextNumber", () => {
  const prefix = "HSE-ACT-2026-";

  it("starts at 0001 when there are no existing numbers", () => {
    expect(computeNextNumber([], prefix)).toBe(`${prefix}0001`);
  });

  it("increments from the highest existing suffix, not the count of records", () => {
    const existing = [`${prefix}0001`, `${prefix}0002`, `${prefix}0003`];
    expect(computeNextNumber(existing, prefix)).toBe(`${prefix}0004`);
  });

  it("is resilient to out-of-order input", () => {
    const existing = [`${prefix}0007`, `${prefix}0002`, `${prefix}0005`];
    expect(computeNextNumber(existing, prefix)).toBe(`${prefix}0008`);
  });

  it("correctly resumes after a gap left by a deleted record", () => {
    const existing = [`${prefix}0001`, `${prefix}0003`]; // 0002 was deleted
    expect(computeNextNumber(existing, prefix)).toBe(`${prefix}0004`);
  });

  it("pads past 4 digits without truncating (no silent collision beyond 9999)", () => {
    const existing = [`${prefix}9999`];
    expect(computeNextNumber(existing, prefix)).toBe(`${prefix}10000`);
  });

  it("trusts the caller to pre-filter by prefix — it only slices by prefix length, it does not verify the text matches", () => {
    // Real callers always pre-filter via Prisma's `startsWith: prefix` before
    // calling this, so same-length foreign prefixes never reach it in
    // practice. This test documents that precondition explicitly: swap in a
    // same-length-but-different prefix and the suffix parse still "works"
    // positionally, which is exactly why callers must filter first.
    const foreignSameLengthPrefix = "HSE-OBS-2026-0005";
    expect(computeNextNumber([foreignSameLengthPrefix], prefix)).toBe(`${prefix}0006`);
  });
});

describe("hseNumberPrefix", () => {
  it("builds a prefix of the form HSE-<KIND>-<year>-", () => {
    const prefix = hseNumberPrefix("ACT");
    expect(prefix).toMatch(/^HSE-ACT-\d{4}-$/);
  });

  it("uses a distinct prefix per kind so numbering sequences never collide across record types", () => {
    expect(hseNumberPrefix("ACT")).not.toBe(hseNumberPrefix("INC"));
  });
});
