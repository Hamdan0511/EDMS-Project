import { afterEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const update = vi.fn();
const auditCreate = vi.fn().mockResolvedValue(undefined);
const saveUploadedFile = vi.fn();
const deleteStoredFile = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: { findFirst: (...a: unknown[]) => findFirst(...a), update: (...a: unknown[]) => update(...a) },
    auditLog: { create: (...a: unknown[]) => auditCreate(...a) },
  },
}));
vi.mock("@/lib/storage", () => ({
  saveUploadedFile: (...a: unknown[]) => saveUploadedFile(...a),
  deleteStoredFile: (...a: unknown[]) => deleteStoredFile(...a),
}));

const { addDocumentRevision, DocumentError } = await import("@/lib/documents/service");

afterEach(() => {
  findFirst.mockReset();
  update.mockReset();
  auditCreate.mockClear();
  saveUploadedFile.mockReset();
  deleteStoredFile.mockClear();
});

const BASE_PARAMS = { id: "doc-1", projectId: "project-1", userId: "user-1" };
const pdfFile = (name = "revision.pdf", size = 1024) => {
  const file = new File([new Uint8Array(size)], name, { type: "application/pdf" });
  return file;
};

describe("addDocumentRevision", () => {
  it("rejects an empty revision label", async () => {
    await expect(addDocumentRevision({ ...BASE_PARAMS, revision: "   ", file: pdfFile() })).rejects.toThrow(DocumentError);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("rejects an empty file", async () => {
    const empty = new File([], "empty.pdf", { type: "application/pdf" });
    await expect(addDocumentRevision({ ...BASE_PARAMS, revision: "B", file: empty })).rejects.toThrow(/empty/);
  });

  it("rejects a disallowed file extension", async () => {
    const exe = new File([new Uint8Array(10)], "payload.exe", { type: "application/octet-stream" });
    await expect(addDocumentRevision({ ...BASE_PARAMS, revision: "B", file: exe })).rejects.toThrow(/not supported/);
  });

  it("throws when the document does not exist in this project", async () => {
    findFirst.mockResolvedValue(null);
    await expect(addDocumentRevision({ ...BASE_PARAMS, revision: "B", file: pdfFile() })).rejects.toThrow("Document not found.");
  });

  it("increments versionNo from the latest existing version, not the count of versions", async () => {
    findFirst.mockResolvedValue({ id: "doc-1", documentNo: "DOC-1", versions: [{ versionNo: 7 }] });
    saveUploadedFile.mockResolvedValue({ storedPath: "documents/new-file.pdf", sizeBytes: 1024 });
    update.mockResolvedValue({ id: "doc-1", currentRevision: "C" });

    await addDocumentRevision({ ...BASE_PARAMS, revision: "C", file: pdfFile() });

    const createData = update.mock.calls[0][0].data;
    expect(createData.versions.create.versionNo).toBe(8);
    expect(createData.isPlaceholder).toBe(false);
    expect(createData.currentRevision).toBe("C");
  });

  it("starts at versionNo 1 for a placeholder document with no existing versions", async () => {
    findFirst.mockResolvedValue({ id: "doc-1", documentNo: "DOC-1", versions: [] });
    saveUploadedFile.mockResolvedValue({ storedPath: "documents/first-file.pdf", sizeBytes: 2048 });
    update.mockResolvedValue({ id: "doc-1" });

    await addDocumentRevision({ ...BASE_PARAMS, revision: "A", file: pdfFile() });

    expect(update.mock.calls[0][0].data.versions.create.versionNo).toBe(1);
  });

  it("logs an audit entry recording the new revision and version number", async () => {
    findFirst.mockResolvedValue({ id: "doc-1", documentNo: "DOC-1", versions: [{ versionNo: 2 }] });
    saveUploadedFile.mockResolvedValue({ storedPath: "documents/x.pdf", sizeBytes: 10 });
    update.mockResolvedValue({ id: "doc-1" });

    await addDocumentRevision({ ...BASE_PARAMS, revision: "D", file: pdfFile() });

    expect(auditCreate).toHaveBeenCalledTimes(1);
    expect(auditCreate.mock.calls[0][0].data.metadata).toEqual({ documentNo: "DOC-1", revision: "D", versionNo: 3 });
  });

  it("deletes the just-uploaded file if the database update fails (no orphaned stored bytes left behind)", async () => {
    findFirst.mockResolvedValue({ id: "doc-1", documentNo: "DOC-1", versions: [] });
    saveUploadedFile.mockResolvedValue({ storedPath: "documents/orphan-candidate.pdf", sizeBytes: 10 });
    update.mockRejectedValue(new Error("database connection lost"));

    await expect(addDocumentRevision({ ...BASE_PARAMS, revision: "A", file: pdfFile() })).rejects.toThrow("database connection lost");
    expect(deleteStoredFile).toHaveBeenCalledWith("documents/orphan-candidate.pdf");
  });
});
