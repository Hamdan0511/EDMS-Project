import { test, expect } from "@playwright/test";
import {
  activateWorkflowTemplate,
  apiContextFor,
  createTemporaryFile,
  createWorkflowTemplate,
  getUserId,
  getWorkflow,
  registerDocument,
  startWorkflow,
  submitStepReview,
} from "../helpers/api";
import { USERS } from "../constants";

test.use({ storageState: USERS.admin.storageState });

test.describe("Workflows", () => {
  test("template -> activate -> start -> reviewer outcome -> completion", async ({ page }) => {
    const api = await apiContextFor("admin");
    const reviewerUserId = await getUserId(api, USERS.verifier.email);

    const template = await createWorkflowTemplate(api, { name: `E2E Template ${Date.now()}`, reviewerUserId });
    await activateWorkflowTemplate(api, template.id);

    const tempFile = await createTemporaryFile(api, {
      fileName: "e2e-workflow-doc.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%E2E workflow test"),
    });
    const doc = await registerDocument(api, {
      temporaryFileId: tempFile.id,
      documentNo: `DOC-WF-${Date.now()}`,
      title: "E2E Workflow Document",
    });

    const workflowTitle = `E2E Workflow ${Date.now()}`;
    const workflow = await startWorkflow(api, { templateId: template.id, documentId: doc.id, title: workflowTitle });

    let state = await getWorkflow(api, workflow.id);
    expect(state.status).toBe("IN_PROGRESS");

    // The reviewer (a distinct real user, not the initiator) submits "A - No
    // Objection" — the single-step, FINAL_STEP_OUTCOME template means this
    // both completes the step and completes the whole workflow.
    const reviewerApi = await apiContextFor("verifier");
    const stepId = state.steps[0].id;
    const result = await submitStepReview(reviewerApi, { workflowId: workflow.id, stepId, outcomeCode: "A" });
    expect(result.stepCompleted).toBe(true);
    expect(result.workflowCompleted).toBe(true);
    expect(result.workflowStatus).toBe("COMPLETED");

    state = await getWorkflow(api, workflow.id);
    expect(state.status).toBe("COMPLETED");
    expect(state.finalOutcomeCode).toBe("A");

    await page.goto(`/workflows/${workflow.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(workflowTitle) })).toBeVisible();
    await expect(page.getByText("Completed").first()).toBeVisible();

    await api.dispose();
    await reviewerApi.dispose();
  });

  test("rejects starting a second concurrent workflow on a document that already has one in progress", async ({}) => {
    const api = await apiContextFor("admin");
    const reviewerUserId = await getUserId(api, USERS.verifier.email);

    const template = await createWorkflowTemplate(api, { name: `E2E Concurrent Template ${Date.now()}`, reviewerUserId });
    await activateWorkflowTemplate(api, template.id);

    const tempFile = await createTemporaryFile(api, {
      fileName: "e2e-concurrent-doc.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%E2E concurrent workflow test"),
    });
    const doc = await registerDocument(api, {
      temporaryFileId: tempFile.id,
      documentNo: `DOC-CONC-${Date.now()}`,
      title: "E2E Concurrent Workflow Document",
    });

    await startWorkflow(api, { templateId: template.id, documentId: doc.id, title: "First workflow" });

    await expect(startWorkflow(api, { templateId: template.id, documentId: doc.id, title: "Second workflow" })).rejects.toThrow(
      /already has an active workflow/,
    );

    await api.dispose();
  });
});
