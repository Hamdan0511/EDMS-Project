-- CreateEnum
CREATE TYPE "MailReasonForIssue" AS ENUM ('FOR_APPROVAL', 'FOR_INFORMATION', 'FOR_CONSTRUCTION', 'FOR_REVIEW_COMMENT', 'FOR_TENDER', 'FOR_RECORD', 'AS_BUILT', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "DocumentWorkflowStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkflowStepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- AlterEnum
ALTER TYPE "DocumentStatus" ADD VALUE 'NO_LONGER_IN_USE';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "isPlaceholder" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Mail" ADD COLUMN     "reasonForIssue" "MailReasonForIssue";

-- AlterTable
ALTER TABLE "MailDocumentReference" ADD COLUMN     "documentVersionId" TEXT,
ADD COLUMN     "revisionAtIssue" TEXT;

-- CreateTable
CREATE TABLE "PrintRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrintRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintRequestDocument" (
    "id" TEXT NOT NULL,
    "printRequestId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,

    CONSTRAINT "PrintRequestDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentWorkflow" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "initiatedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "DocumentWorkflowStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentWorkflowDocument" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,

    CONSTRAINT "DocumentWorkflowDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentWorkflowStep" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "stepNo" INTEGER NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "status" "WorkflowStepStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "outcome" TEXT,
    "comments" TEXT,
    "actionedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentWorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrintRequest_projectId_idx" ON "PrintRequest"("projectId");

-- CreateIndex
CREATE INDEX "PrintRequestDocument_documentId_idx" ON "PrintRequestDocument"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "PrintRequestDocument_printRequestId_documentId_key" ON "PrintRequestDocument"("printRequestId", "documentId");

-- CreateIndex
CREATE INDEX "DocumentWorkflow_projectId_status_idx" ON "DocumentWorkflow"("projectId", "status");

-- CreateIndex
CREATE INDEX "DocumentWorkflowDocument_documentId_idx" ON "DocumentWorkflowDocument"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentWorkflowDocument_workflowId_documentId_key" ON "DocumentWorkflowDocument"("workflowId", "documentId");

-- CreateIndex
CREATE INDEX "DocumentWorkflowStep_assigneeId_idx" ON "DocumentWorkflowStep"("assigneeId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentWorkflowStep_workflowId_stepNo_key" ON "DocumentWorkflowStep"("workflowId", "stepNo");

-- CreateIndex
CREATE INDEX "MailDocumentReference_documentVersionId_idx" ON "MailDocumentReference"("documentVersionId");

-- AddForeignKey
ALTER TABLE "MailDocumentReference" ADD CONSTRAINT "MailDocumentReference_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintRequest" ADD CONSTRAINT "PrintRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintRequest" ADD CONSTRAINT "PrintRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintRequestDocument" ADD CONSTRAINT "PrintRequestDocument_printRequestId_fkey" FOREIGN KEY ("printRequestId") REFERENCES "PrintRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintRequestDocument" ADD CONSTRAINT "PrintRequestDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentWorkflow" ADD CONSTRAINT "DocumentWorkflow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentWorkflow" ADD CONSTRAINT "DocumentWorkflow_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentWorkflowDocument" ADD CONSTRAINT "DocumentWorkflowDocument_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "DocumentWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentWorkflowDocument" ADD CONSTRAINT "DocumentWorkflowDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentWorkflowStep" ADD CONSTRAINT "DocumentWorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "DocumentWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentWorkflowStep" ADD CONSTRAINT "DocumentWorkflowStep_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
