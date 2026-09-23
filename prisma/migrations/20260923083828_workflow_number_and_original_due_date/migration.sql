-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN     "workflowNumber" TEXT NOT NULL,
ADD COLUMN     "originalDueDate" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Workflow_projectId_workflowNumber_key" ON "Workflow"("projectId", "workflowNumber");
