/**
 * The one contract every storage backend implements. PostgreSQL always
 * stores the metadata, permissions, references, and (where applicable)
 * checksums for a file; this interface is only ever responsible for the
 * file's actual bytes. Callers never see a real filesystem path or S3 key
 * shape — they get back an opaque `storedPath` to persist on the owning
 * record and pass back into `read`/`delete` later.
 */
export type StorageNamespace =
  | "mail"
  | "documents"
  | "temporary-files"
  | "mail-inline-images"
  | "hse"
  | "contact"
  | "field"
  | "management-system";

export interface StorageDriver {
  save(namespace: StorageNamespace, file: File): Promise<{ storedPath: string; sizeBytes: number }>;
  read(storedPath: string): Promise<Buffer>;
  delete(storedPath: string): Promise<void>;
}
