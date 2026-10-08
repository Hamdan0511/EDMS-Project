import { afterEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
const putObjectCalls: unknown[] = [];
const getObjectCalls: unknown[] = [];
const deleteObjectCalls: unknown[] = [];

vi.mock("@aws-sdk/client-s3", () => {
  class PutObjectCommand {
    constructor(public input: unknown) {
      putObjectCalls.push(input);
    }
  }
  class GetObjectCommand {
    constructor(public input: unknown) {
      getObjectCalls.push(input);
    }
  }
  class DeleteObjectCommand {
    constructor(public input: unknown) {
      deleteObjectCalls.push(input);
    }
  }
  class S3Client {
    send = send;
  }
  return { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand };
});

const { s3Driver } = await import("./s3-driver");

afterEach(() => {
  send.mockReset();
  putObjectCalls.length = 0;
  getObjectCalls.length = 0;
  deleteObjectCalls.length = 0;
  delete process.env.S3_BUCKET;
});

describe("s3Driver.save", () => {
  it("rejects when S3_BUCKET is not configured", async () => {
    const file = new File([new Uint8Array(10)], "test.pdf", { type: "application/pdf" });
    await expect(s3Driver.save("documents", file)).rejects.toThrow(/S3_BUCKET is required/);
  });

  it("uploads with the same namespace/uuid.ext key shape the local driver uses", async () => {
    process.env.S3_BUCKET = "test-bucket";
    send.mockResolvedValue({});
    const file = new File([new Uint8Array(42)], "report.pdf", { type: "application/pdf" });

    const result = await s3Driver.save("documents", file);

    expect(result.sizeBytes).toBe(42);
    expect(result.storedPath).toMatch(/^documents\/[0-9a-f-]{36}\.pdf$/);
    expect(putObjectCalls[0]).toMatchObject({ Bucket: "test-bucket", Key: result.storedPath, ContentType: "application/pdf" });
  });

  it("never makes the object public — no ACL is ever set on the upload", async () => {
    process.env.S3_BUCKET = "test-bucket";
    send.mockResolvedValue({});
    const file = new File([new Uint8Array(1)], "x.pdf", { type: "application/pdf" });

    await s3Driver.save("documents", file);

    expect(putObjectCalls[0]).not.toHaveProperty("ACL");
  });
});

describe("s3Driver.read", () => {
  it("rejects when S3_BUCKET is not configured", async () => {
    await expect(s3Driver.read("documents/x.pdf")).rejects.toThrow(/S3_BUCKET is required/);
  });

  it("reads the object by its stored key and returns a real Buffer of the same bytes", async () => {
    process.env.S3_BUCKET = "test-bucket";
    const originalBytes = new Uint8Array([1, 2, 3, 4, 5]);
    send.mockResolvedValue({ Body: { transformToByteArray: async () => originalBytes } });

    const buffer = await s3Driver.read("documents/some-key.pdf");

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect([...buffer]).toEqual([1, 2, 3, 4, 5]);
    expect(getObjectCalls[0]).toMatchObject({ Bucket: "test-bucket", Key: "documents/some-key.pdf" });
  });

  it("throws Invalid storage path when the object has no body", async () => {
    process.env.S3_BUCKET = "test-bucket";
    send.mockResolvedValue({ Body: undefined });
    await expect(s3Driver.read("documents/missing.pdf")).rejects.toThrow("Invalid storage path");
  });
});

describe("s3Driver.delete", () => {
  it("rejects when S3_BUCKET is not configured", async () => {
    await expect(s3Driver.delete("documents/x.pdf")).rejects.toThrow(/S3_BUCKET is required/);
  });

  it("deletes the object by its stored key", async () => {
    process.env.S3_BUCKET = "test-bucket";
    send.mockResolvedValue({});
    await s3Driver.delete("documents/some-key.pdf");
    expect(deleteObjectCalls[0]).toMatchObject({ Bucket: "test-bucket", Key: "documents/some-key.pdf" });
  });

  it("never throws even if the underlying delete fails (matches the local driver's best-effort delete)", async () => {
    process.env.S3_BUCKET = "test-bucket";
    send.mockRejectedValue(new Error("network error"));
    await expect(s3Driver.delete("documents/some-key.pdf")).resolves.toBeUndefined();
  });
});
