import "server-only";

import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { StorageDriver, StorageNamespace } from "./types";

const STORAGE_ROOT = path.join(process.cwd(), "storage");

/**
 * Resolves a stored key to an absolute path, rejecting anything that would
 * land outside STORAGE_ROOT. A plain `resolved.startsWith(STORAGE_ROOT)`
 * check (the previous implementation) is a sibling-prefix bug: a key that
 * resolves to a directory like `storage-evil` next to `storage` also starts
 * with the string "storage" and would incorrectly pass. Comparing via
 * `path.relative` instead means the only way to stay "inside" is for the
 * relative path to contain no leading `..` segment.
 */
export function resolveStoragePath(storedPath: string): string {
  const resolved = path.resolve(STORAGE_ROOT, storedPath);
  const relative = path.relative(STORAGE_ROOT, resolved);
  const isInsideRoot = relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
  if (!isInsideRoot) {
    throw new Error("Invalid storage path");
  }
  return resolved;
}

/** Development/default backend — real local-disk files under ./storage. */
export const localDriver: StorageDriver = {
  async save(namespace: StorageNamespace, file: File) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name).slice(0, 20);
    const key = `${namespace}/${randomUUID()}${ext}`;
    const fullPath = path.join(STORAGE_ROOT, key);

    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);

    return { storedPath: key, sizeBytes: buffer.byteLength };
  },

  async read(storedPath: string) {
    return readFile(resolveStoragePath(storedPath));
  },

  async delete(storedPath: string) {
    await unlink(resolveStoragePath(storedPath)).catch(() => {});
  },
};
