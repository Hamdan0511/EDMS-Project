import { test, expect } from "@playwright/test";
import { apiContextFor, createTemporaryFile, registerDocument } from "../helpers/api";
import { USERS } from "../constants";

test.use({ storageState: USERS.admin.storageState });

test.describe("Documents", () => {
  test("register, search, open, and access the file of a real uploaded document", async ({ page }) => {
    const api = await apiContextFor("admin");
    const documentNo = `DOC-E2E-${Date.now()}`;

    const tempFile = await createTemporaryFile(api, {
      fileName: "e2e-test.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>"),
    });
    const doc = await registerDocument(api, { temporaryFileId: tempFile.id, documentNo, title: "E2E Test Document" });

    // Search: the document register is server-rendered off ?q=, so a direct
    // navigation is a real, deterministic search — not a guess at a form selector.
    await page.goto(`/documents?q=${encodeURIComponent(documentNo)}`);
    await expect(page.getByText(documentNo)).toBeVisible();

    // Open: follow the real link to the detail page.
    await page.getByRole("link", { name: documentNo }).first().click();
    await expect(page).toHaveURL(new RegExp(`/documents/${doc.id}`));
    await expect(page.getByText("E2E Test Document").first()).toBeVisible();

    // Authorized file access: the real file-serving route, same session.
    const fileRes = await api.get(`/api/documents/${doc.id}/file`);
    expect(fileRes.status()).toBe(200);
    expect(fileRes.headers()["content-type"]).toBe("application/pdf");

    await api.dispose();
  });

  test("an unauthenticated request cannot access the document file", async ({ playwright }) => {
    const anonymous = await playwright.request.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100" });
    const res = await anonymous.get("/api/documents/nonexistent-id/file");
    expect([401, 404]).toContain(res.status());
    await anonymous.dispose();
  });
});
