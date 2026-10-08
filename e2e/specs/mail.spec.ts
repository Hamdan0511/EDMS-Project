import { test, expect } from "@playwright/test";
import { apiContextFor, getUserId, sendMail } from "../helpers/api";
import { mailTypeId, prisma } from "../helpers/db";
import { USERS } from "../constants";

test.use({ storageState: USERS.admin.storageState });

test.describe("Mail", () => {
  test("send, appear in search, open, and thread a reply", async ({ page }) => {
    const api = await apiContextFor("admin");
    const typeId = await mailTypeId("General Correspondence");
    const memberUserId = await getUserId(api, USERS.member.email);

    const subject = `E2E Mail ${Date.now()}`;
    const mail = await sendMail(api, {
      typeId,
      subject,
      messageHtml: "<p>Original message body for E2E verification.</p>",
      toUserIds: [memberUserId],
    });

    await page.goto(`/mail?q=${encodeURIComponent(subject)}`);
    await expect(page.getByText(subject)).toBeVisible();

    await page.getByRole("link", { name: subject }).first().click();
    await expect(page).toHaveURL(new RegExp(`/mail/${mail.id}`));
    await expect(page.getByText("Original message body for E2E verification.")).toBeVisible();

    const replySubject = `RE: ${subject}`;
    const reply = await sendMail(api, {
      typeId,
      subject: replySubject,
      messageHtml: "<p>This is the reply.</p>",
      toUserIds: [memberUserId],
      parentMailId: mail.id,
    });

    // Real, server-computed threadRootId linkage (verified directly — the
    // business fact this test exists to guard): the reply's threadRootId
    // must point at the original, not be null or self-referential.
    const replyRow = await prisma.mail.findUniqueOrThrow({ where: { id: reply.id }, select: { threadRootId: true, parentMailId: true } });
    expect(replyRow.threadRootId).toBe(mail.id);
    expect(replyRow.parentMailId).toBe(mail.id);

    // And it's reachable through the real UI's search-result navigator
    // (same search query the original was found with, now matching both).
    await page.goto(`/mail?q=${encodeURIComponent(subject)}`);
    await page.getByRole("link", { name: replySubject }).first().click();
    await expect(page).toHaveURL(new RegExp(`/mail/${reply.id}`));
    await expect(page.getByText("This is the reply.")).toBeVisible();

    await api.dispose();
  });

  test("a draft is saved without being sent", async ({ page }) => {
    const api = await apiContextFor("admin");
    const typeId = await mailTypeId("Letter");
    const subject = `E2E Draft ${Date.now()}`;

    await sendMail(api, { typeId, subject, messageHtml: "<p>Draft body.</p>", toUserIds: [], action: "draft" });

    await page.goto(`/mail?tab=drafts&q=${encodeURIComponent(subject)}`);
    await expect(page.getByText(subject)).toBeVisible();

    await api.dispose();
  });
});
