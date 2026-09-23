/*
  Warnings:

  - You are about to drop the `DocumentWorkflow` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DocumentWorkflowDocument` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DocumentWorkflowStep` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "WorkflowTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "WorkflowOutcomeRule" AS ENUM ('FINAL_STEP_OUTCOME', 'LOWEST_OF_ALL_STEP_OUTCOMES');

-- CreateEnum
CREATE TYPE "WorkflowStepCompletionRule" AS ENUM ('ALL_REVIEWERS', 'ANY_REVIEWER', 'REJECT_ON_ANY_REJECTION');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'REJECTED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "WorkflowStepInstanceStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'SKIPPED', 'TERMINATED');

-- DropForeignKey
ALTER TABLE "DocumentWorkflow" DROP CONSTRAINT "DocumentWorkflow_initiatedById_fkey";

-- DropForeignKey
ALTER TABLE "DocumentWorkflow" DROP CONSTRAINT "DocumentWorkflow_projectId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentWorkflowDocument" DROP CONSTRAINT "DocumentWorkflowDocument_documentId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentWorkflowDocument" DROP CONSTRAINT "DocumentWorkflowDocument_workflowId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentWorkflowStep" DROP CONSTRAINT "DocumentWorkflowStep_assigneeId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentWorkflowStep" DROP CONSTRAINT "DocumentWorkflowStep_workflowId_fkey";

-- DropTable
DROP TABLE "DocumentWorkflow";

-- DropTable
DROP TABLE "DocumentWorkflowDocument";

-- DropTable
DROP TABLE "DocumentWorkflowStep";

-- DropEnum
DROP TYPE "DocumentWorkflowStatus";

-- DropEnum
DROP TYPE "WorkflowStepStatus";

-- CreateTable
CREATE TABLE "WorkflowOutcomeOption" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "severityRank" INTEGER NOT NULL,
    "isRejection" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowOutcomeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTemplate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "outcomeRule" "WorkflowOutcomeRule" NOT NULL DEFAULT 'FINAL_STEP_OUTCOME',
    "status" "WorkflowTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTemplateStep" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupNo" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL DEFAULT 5,
    "completionRule" "WorkflowStepCompletionRule" NOT NULL DEFAULT 'ALL_REVIEWERS',
    "commentsRequired" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WorkflowTemplateStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTemplateStepReviewer" (
    "id" TEXT NOT NULL,
    "templateStepId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "WorkflowTemplateStepReviewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "templateId" TEXT,
    "title" TEXT NOT NULL,
    "outcomeRule" "WorkflowOutcomeRule" NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "initiatedById" TEXT NOT NULL,
    "parentWorkflowId" TEXT,
    "finalOutcomeCode" TEXT,
    "terminatedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowDocument" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentVersionId" TEXT,

    CONSTRAINT "WorkflowDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStepInstance" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "templateStepId" TEXT,
    "name" TEXT NOT NULL,
    "groupNo" INTEGER NOT NULL,
    "completionRule" "WorkflowStepCompletionRule" NOT NULL,
    "commentsRequired" BOOLEAN NOT NULL DEFAULT false,
    "status" "WorkflowStepInstanceStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "outcomeCode" TEXT,

    CONSTRAINT "WorkflowStepInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStepReviewer" (
    "id" TEXT NOT NULL,
    "stepInstanceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outcomeCode" TEXT,
    "comments" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "WorkflowStepReviewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowEvent" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkflowOutcomeOption_projectId_idx" ON "WorkflowOutcomeOption"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowOutcomeOption_projectId_code_key" ON "WorkflowOutcomeOption"("projectId", "code");

-- CreateIndex
CREATE INDEX "WorkflowTemplate_projectId_status_idx" ON "WorkflowTemplate"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowTemplate_projectId_name_key" ON "WorkflowTemplate"("projectId", "name");

-- CreateIndex
CREATE INDEX "WorkflowTemplateStep_templateId_groupNo_idx" ON "WorkflowTemplateStep"("templateId", "groupNo");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowTemplateStep_templateId_name_key" ON "WorkflowTemplateStep"("templateId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowTemplateStepReviewer_templateStepId_userId_key" ON "WorkflowTemplateStepReviewer"("templateStepId", "userId");

-- CreateIndex
CREATE INDEX "Workflow_projectId_status_idx" ON "Workflow"("projectId", "status");

-- CreateIndex
CREATE INDEX "Workflow_parentWorkflowId_idx" ON "Workflow"("parentWorkflowId");

-- CreateIndex
CREATE INDEX "WorkflowDocument_documentId_idx" ON "WorkflowDocument"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowDocument_workflowId_documentId_key" ON "WorkflowDocument"("workflowId", "documentId");

-- CreateIndex
CREATE INDEX "WorkflowStepInstance_workflowId_groupNo_idx" ON "WorkflowStepInstance"("workflowId", "groupNo");

-- CreateIndex
CREATE INDEX "WorkflowStepReviewer_userId_idx" ON "WorkflowStepReviewer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStepReviewer_stepInstanceId_userId_key" ON "WorkflowStepReviewer"("stepInstanceId", "userId");

-- CreateIndex
CREATE INDEX "WorkflowEvent_workflowId_createdAt_idx" ON "WorkflowEvent"("workflowId", "createdAt");

-- AddForeignKey
ALTER TABLE "WorkflowOutcomeOption" ADD CONSTRAINT "WorkflowOutcomeOption_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowOutcomeOption" ADD CONSTRAINT "WorkflowOutcomeOption_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTemplate" ADD CONSTRAINT "WorkflowTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTemplate" ADD CONSTRAINT "WorkflowTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTemplateStep" ADD CONSTRAINT "WorkflowTemplateStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkflowTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTemplateStepReviewer" ADD CONSTRAINT "WorkflowTemplateStepReviewer_templateStepId_fkey" FOREIGN KEY ("templateStepId") REFERENCES "WorkflowTemplateStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTemplateStepReviewer" ADD CONSTRAINT "WorkflowTemplateStepReviewer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkflowTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_parentWorkflowId_fkey" FOREIGN KEY ("parentWorkflowId") REFERENCES "Workflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowDocument" ADD CONSTRAINT "WorkflowDocument_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowDocument" ADD CONSTRAINT "WorkflowDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowDocument" ADD CONSTRAINT "WorkflowDocument_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStepInstance" ADD CONSTRAINT "WorkflowStepInstance_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStepReviewer" ADD CONSTRAINT "WorkflowStepReviewer_stepInstanceId_fkey" FOREIGN KEY ("stepInstanceId") REFERENCES "WorkflowStepInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStepReviewer" ADD CONSTRAINT "WorkflowStepReviewer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowEvent" ADD CONSTRAINT "WorkflowEvent_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
