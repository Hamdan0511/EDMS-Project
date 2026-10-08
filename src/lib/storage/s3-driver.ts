import "server-only";

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import path from "path";
import type { StorageDriver, StorageNamespace } from "./types";

/**
 * Production-shaped backend for any S3-compatible object store (AWS S3,
 * Cloudflare R2, MinIO, …) — selected via STORAGE_DRIVER=s3, see
 * docs/PRODUCTION_DEPLOYMENT.md. Not exercised against a real bucket in
 * this codebase (no cloud account is provisioned here, and this pass does
 * not upload any real document to an external service) — correctness here
 * is proven via src/lib/storage/s3-driver.test.ts against a mocked S3
 * client, asserting the same key-construction and buffer-handling contract
 * the local driver already has live-verified coverage of.
 *
 * Objects are never made public — there is no bucket ACL/policy change
 * here that would allow unauthenticated reads. Every read still goes
 * through this driver from inside an authenticated Next.js route handler
 * (src/app/api/**\/file/route.ts), exactly like the local driver; object
 * storage never becomes a second, unauthenticated path to the same files.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required when STORAGE_DRIVER=s3.`);
  return value;
}

let cachedClient: S3Client | null = null;
function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials:
      process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
        ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
        : undefined,
  });
  return cachedClient;
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  // AWS SDK v3's GetObjectCommandOutput.Body is a Node Readable in the
  // Node runtime (it also exposes a web-stream-compatible transformToByteArray
  // helper, used here so this works the same whether the SDK hands back a
  // Node stream or a web ReadableStream).
  const stream = body as { transformToByteArray: () => Promise<Uint8Array> };
  const bytes = await stream.transformToByteArray();
  return Buffer.from(bytes);
}

export const s3Driver: StorageDriver = {
  async save(namespace: StorageNamespace, file: File) {
    const bucket = requireEnv("S3_BUCKET");
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name).slice(0, 20);
    const key = `${namespace}/${randomUUID()}${ext}`;

    await getClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      }),
    );

    return { storedPath: key, sizeBytes: buffer.byteLength };
  },

  async read(storedPath: string) {
    const bucket = requireEnv("S3_BUCKET");
    const result = await getClient().send(new GetObjectCommand({ Bucket: bucket, Key: storedPath }));
    if (!result.Body) throw new Error("Invalid storage path");
    return streamToBuffer(result.Body);
  },

  async delete(storedPath: string) {
    const bucket = requireEnv("S3_BUCKET");
    await getClient()
      .send(new DeleteObjectCommand({ Bucket: bucket, Key: storedPath }))
      .catch(() => {});
  },
};
