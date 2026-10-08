import { describe, expect, it } from "vitest";
import path from "path";
import { localDriver } from "./local-driver";
import { resolveStoragePath } from "@/lib/storage";

const STORAGE_ROOT = path.join(process.cwd(), "storage");

describe("localDriver — real save/read/delete round-trip (no mocks)", () => {
  it("saves real bytes, reads back the identical content, and leaves nothing behind after delete", async () => {
    const original = new Uint8Array([10, 20, 30, 40, 50]);
    const file = new File([original], "round-trip-test.bin", { type: "application/octet-stream" });

    const { storedPath, sizeBytes } = await localDriver.save("temporary-files", file);
    expect(sizeBytes).toBe(5);
    expect(storedPath).toMatch(/^temporary-files\/[0-9a-f-]{36}\.bin$/);

    try {
      const readBack = await localDriver.read(storedPath);
      expect([...readBack]).toEqual([...original]);
    } finally {
      await localDriver.delete(storedPath);
    }

    await expect(localDriver.read(storedPath)).rejects.toThrow();
  });

  it("implements the same StorageDriver contract the S3 driver implements (interchangeable at the call site)", () => {
    expect(typeof localDriver.save).toBe("function");
    expect(typeof localDriver.read).toBe("function");
    expect(typeof localDriver.delete).toBe("function");
  });
});

describe("resolveStoragePath", () => {
  it("accepts a plain file directly under the storage root", () => {
    expect(resolveStoragePath("file.pdf")).toBe(path.join(STORAGE_ROOT, "file.pdf"));
  });

  it("accepts a namespaced file one level deep", () => {
    expect(resolveStoragePath("documents/file.pdf")).toBe(path.join(STORAGE_ROOT, "documents", "file.pdf"));
  });

  it("accepts a nested path several levels deep", () => {
    expect(resolveStoragePath("a/b/file.pdf")).toBe(path.join(STORAGE_ROOT, "a", "b", "file.pdf"));
  });

  it("rejects a single-segment parent traversal", () => {
    expect(() => resolveStoragePath("../file.pdf")).toThrow("Invalid storage path");
  });

  it("rejects a multi-segment parent traversal", () => {
    expect(() => resolveStoragePath("../../etc/passwd")).toThrow("Invalid storage path");
  });

  it("rejects traversal buried inside an otherwise-plausible key", () => {
    expect(() => resolveStoragePath("documents/../../secret.txt")).toThrow("Invalid storage path");
  });

  it("rejects an absolute path escaping the root entirely", () => {
    const outside = path.resolve(STORAGE_ROOT, "..", "outside.txt");
    expect(() => resolveStoragePath(outside)).toThrow("Invalid storage path");
  });

  it("rejects the storage root itself (not a file key)", () => {
    expect(() => resolveStoragePath(".")).toThrow("Invalid storage path");
    expect(() => resolveStoragePath("")).toThrow("Invalid storage path");
  });

  it("rejects a sibling directory whose name merely starts with the same prefix", () => {
    // The old `resolved.startsWith(STORAGE_ROOT)` check would incorrectly
    // accept this: ".../storage-evil/file" starts with ".../storage".
    const siblingPrefixAttack = `../${path.basename(STORAGE_ROOT)}-evil/file.pdf`;
    expect(() => resolveStoragePath(siblingPrefixAttack)).toThrow("Invalid storage path");
  });

  it("does not treat a literal percent-encoded string as real traversal", () => {
    // storedPath values in this app are always server-generated (randomUUID)
    // and never raw user input, so a literal "%2e%2e" is just an odd
    // filename segment, not a decoded ".." — the filesystem never decodes it.
    expect(resolveStoragePath("field/%2e%2e/file.pdf")).toBe(path.join(STORAGE_ROOT, "field", "%2e%2e", "file.pdf"));
  });
});
