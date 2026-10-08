import "server-only";

import type { StorageDriver, StorageNamespace } from "./types";
import { localDriver } from "./local-driver";
import { s3Driver } from "./s3-driver";

export type { StorageDriver, StorageNamespace } from "./types";
export { resolveStoragePath } from "./local-driver";

/**
 * STORAGE_DRIVER selects the backend — "local" (default, used throughout
 * development and by every QA pass in this repository) or "s3" (any
 * S3-compatible object store; see docs/PRODUCTION_DEPLOYMENT.md for the
 * required S3_* environment variables). Every caller across the app uses
 * the three functions below; nothing outside this file knows or cares
 * which backend is active — that's the whole point of the interface in
 * ./types.ts. Neither driver does anything at import time (no client is
 * constructed, no credentials are read, until a request actually calls
 * save/read/delete), so importing both here unconditionally costs nothing
 * at runtime for a local-only deployment.
 */
function getDriver(): StorageDriver {
  return process.env.STORAGE_DRIVER === "s3" ? s3Driver : localDriver;
}

export async function saveUploadedFile(
  namespace: StorageNamespace,
  file: File,
): Promise<{ storedPath: string; sizeBytes: number }> {
  return getDriver().save(namespace, file);
}

export async function readStoredFile(storedPath: string): Promise<Buffer> {
  return getDriver().read(storedPath);
}

export async function deleteStoredFile(storedPath: string): Promise<void> {
  return getDriver().delete(storedPath);
}
