-- CreateEnum
CREATE TYPE "MailWorkflowStatus" AS ENUM ('NA', 'OUTSTANDING', 'OVERDUE', 'RESPONDED', 'NO_ACTION_REQUIRED', 'CLOSED_OUT');

-- AlterTable
ALTER TABLE "Mail" ADD COLUMN     "workflowStatus" "MailWorkflowStatus" NOT NULL DEFAULT 'NA';

-- CreateIndex
CREATE INDEX "Mail_projectId_workflowStatus_idx" ON "Mail"("projectId", "workflowStatus");
