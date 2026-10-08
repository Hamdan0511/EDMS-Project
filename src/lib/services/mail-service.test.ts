import { afterEach, describe, expect, it, vi } from "vitest";

const mailTypeFindFirst = vi.fn();
const projectMemberCount = vi.fn();
const mailFindFirst = vi.fn();
const mailAttachmentFindMany = vi.fn();
const auditCreate = vi.fn().mockResolvedValue(undefined);
const saveUploadedFile = vi.fn();
const deleteStoredFile = vi.fn().mockResolvedValue(undefined);
const transaction = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mailType: { findFirst: (...a: unknown[]) => mailTypeFindFirst(...a) },
    projectMember: { count: (...a: unknown[]) => projectMemberCount(...a) },
    mail: { findFirst: (...a: unknown[]) => mailFindFirst(...a) },
    mailAttachment: { findMany: (...a: unknown[]) => mailAttachmentFindMany(...a) },
    auditLog: { create: (...a: unknown[]) => auditCreate(...a) },
    $transaction: (...a: unknown[]) => transaction(...a),
  },
}));
vi.mock("@/lib/storage", () => ({
  saveUploadedFile: (...a: unknown[]) => saveUploadedFile(...a),
  deleteStoredFile: (...a: unknown[]) => deleteStoredFile(...a),
}));

const { saveMail, MailValidationError, nextMailNumber } = await import("@/lib/services/mail-service");

afterEach(() => {
  vi.clearAllMocks();
});

const BASE_INPUT = {
  mailId: undefined,
  action: "send" as const,
  typeId: "type-1",
  subject: "Test subject",
  messageHtml: "<p>body</p>",
  attribute1: undefined,
  attribute2: undefined,
  responseRequired: false,
  responseDueDate: undefined,
  toUserIds: ["user-2"],
  ccUserIds: [],
  removeAttachmentIds: [],
  parentMailId: undefined,
  forwardAttachmentIds: [],
};
const BASE_PARAMS = { projectId: "project-1", projectCode: "PRJ", senderId: "user-1", files: [] as File[] };

describe("saveMail — validation", () => {
  it("rejects sending with zero recipients", async () => {
    await expect(saveMail({ ...BASE_PARAMS, input: { ...BASE_INPUT, toUserIds: [] } })).rejects.toThrow(MailValidationError);
    expect(mailTypeFindFirst).not.toHaveBeenCalled();
  });

  it("allows saving a draft with zero recipients", async () => {
    mailTypeFindFirst.mockResolvedValue({ id: "type-1" });
    projectMemberCount.mockResolvedValue(0);
    transaction.mockResolvedValue({ id: "mail-1", mailNumber: "PRJ-MAIL-00001" });

    await expect(
      saveMail({ ...BASE_PARAMS, input: { ...BASE_INPUT, action: "draft", toUserIds: [], ccUserIds: [] } }),
    ).resolves.toBeDefined();
  });

  it("rejects when the mail type does not belong to this project", async () => {
    mailTypeFindFirst.mockResolvedValue(null);
    await expect(saveMail({ ...BASE_PARAMS, input: BASE_INPUT })).rejects.toThrow(/mail type could not be found/);
  });

  it("rejects a recipient who is not a real member of this project's directory", async () => {
    mailTypeFindFirst.mockResolvedValue({ id: "type-1" });
    projectMemberCount.mockResolvedValue(0); // 0 of 1 requested recipients are real members
    await expect(saveMail({ ...BASE_PARAMS, input: BASE_INPUT })).rejects.toThrow(/not part of this project's directory/);
  });

  it("rejects an oversized attachment before ever touching storage", async () => {
    mailTypeFindFirst.mockResolvedValue({ id: "type-1" });
    projectMemberCount.mockResolvedValue(1);
    // A plain duck-typed stand-in, not a real 300MB buffer: saveMail only
    // reads `.size`/`.name` during validation (saveUploadedFile is mocked
    // out entirely below), and `File.prototype.size` has no setter to
    // override on a real File instance.
    const hugeFile = { size: 300 * 1024 * 1024, name: "huge.pdf", type: "application/pdf" } as unknown as File;
    await expect(saveMail({ ...BASE_PARAMS, input: BASE_INPUT, files: [hugeFile] })).rejects.toThrow(/too large/);
    expect(saveUploadedFile).not.toHaveBeenCalled();
  });

  it("rejects a disallowed file extension before ever touching storage", async () => {
    mailTypeFindFirst.mockResolvedValue({ id: "type-1" });
    projectMemberCount.mockResolvedValue(1);
    const exe = new File([new Uint8Array(10)], "payload.exe", { type: "application/octet-stream" });
    await expect(saveMail({ ...BASE_PARAMS, input: BASE_INPUT, files: [exe] })).rejects.toThrow(/unsupported file type/);
    expect(saveUploadedFile).not.toHaveBeenCalled();
  });
});

describe("saveMail — attachment cleanup on failure", () => {
  it("deletes just-uploaded files if the save fails after upload (no orphaned bytes left behind)", async () => {
    mailTypeFindFirst.mockResolvedValue({ id: "type-1" });
    projectMemberCount.mockResolvedValue(1);
    saveUploadedFile.mockResolvedValue({ storedPath: "mail/orphan-candidate.pdf", sizeBytes: 10 });
    transaction.mockRejectedValue(new Error("database connection lost"));

    const file = new File([new Uint8Array(10)], "attachment.pdf", { type: "application/pdf" });
    await expect(saveMail({ ...BASE_PARAMS, input: BASE_INPUT, files: [file] })).rejects.toThrow(MailValidationError);
    expect(deleteStoredFile).toHaveBeenCalledWith("mail/orphan-candidate.pdf");
  });
});

describe("nextMailNumber", () => {
  const db = { mail: { findMany: vi.fn() } } as never;

  it("derives the next number from the highest existing suffix, not a row count", async () => {
    (db as { mail: { findMany: ReturnType<typeof vi.fn> } }).mail.findMany.mockResolvedValue([
      { mailNumber: "PRJ-MAIL-00001" },
      { mailNumber: "PRJ-MAIL-00005" },
    ]);
    await expect(nextMailNumber(db, "project-1", "PRJ")).resolves.toBe("PRJ-MAIL-00006");
  });

  it("falls back to the SF prefix when the project has no code", async () => {
    (db as { mail: { findMany: ReturnType<typeof vi.fn> } }).mail.findMany.mockResolvedValue([]);
    await expect(nextMailNumber(db, "project-1", null)).resolves.toBe("SF-MAIL-00001");
  });
});
