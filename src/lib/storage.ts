import "server-only";

import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const STORAGE_ROOT = path.join(process.cwd(), "storage");

/**
 * Local-disk implementation of the storage abstraction. Callers never see
 * filesystem paths — they get back an opaque storedPath to persist on the
 * record and pass to readStoredFile/deleteStoredFile later. Swapping to an
 * object-storage backend (S3/R2) only requires reimplementing this module.
 */
export async function saveUploadedFile(
  namespace: "mail" | "documents" | "temporary-files" | "mail-inline-images" | "hse" | "contact" | "field" | "management-system",
  file: File,
): Promise<{ storedPath: string; sizeBytes: number }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name).slice(0, 20);
  const key = `${namespace}/${randomUUID()}${ext}`;
  const fullPath = path.join(STORAGE_ROOT, key);

  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);

  return { storedPath: key, sizeBytes: buffer.byteLength };
}

export async function readStoredFile(storedPath: string): Promise<Buffer> {
  assertSafeKey(storedPath);
  return readFile(path.join(STORAGE_ROOT, storedPath));
}

export async function deleteStoredFile(storedPath: string): Promise<void> {
  assertSafeKey(storedPath);
  await unlink(path.join(STORAGE_ROOT, storedPath)).catch(() => {});
}

function assertSafeKey(storedPath: string): void {
  const resolved = path.resolve(STORAGE_ROOT, storedPath);
  if (!resolved.startsWith(STORAGE_ROOT)) {
    throw new Error("Invalid storage path");
  }
}
