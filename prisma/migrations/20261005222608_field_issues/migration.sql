-- CreateEnum
CREATE TYPE "FieldIssueStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WORK_DONE', 'READY_FOR_VERIFICATION', 'REJECTED', 'VERIFIED', 'CLOSED', 'DISPUTED');

-- CreateTable
CREATE TABLE "FieldIssue" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "issueNumber" TEXT NOT NULL,
    "areaId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "typeId" TEXT,
    "priority" "FieldPriority" NOT NULL DEFAULT 'MEDIUM',
    "responsibleOrgId" TEXT,
    "responsibleUserId" TEXT,
    "dueDate" TIMESTAMP(3),
    "sourceType" TEXT NOT NULL DEFAULT 'manual',
    "sourceId" TEXT,
    "status" "FieldIssueStatus" NOT NULL DEFAULT 'OPEN',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedById" TEXT,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "FieldIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FieldIssue_projectId_status_idx" ON "FieldIssue"("projectId", "status");

-- CreateIndex
CREATE INDEX "FieldIssue_sourceType_sourceId_idx" ON "FieldIssue"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "FieldIssue_areaId_idx" ON "FieldIssue"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldIssue_projectId_issueNumber_key" ON "FieldIssue"("projectId", "issueNumber");

-- AddForeignKey
ALTER TABLE "FieldIssue" ADD CONSTRAINT "FieldIssue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldIssue" ADD CONSTRAINT "FieldIssue_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "FieldArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldIssue" ADD CONSTRAINT "FieldIssue_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "FieldLookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldIssue" ADD CONSTRAINT "FieldIssue_responsibleOrgId_fkey" FOREIGN KEY ("responsibleOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldIssue" ADD CONSTRAINT "FieldIssue_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldIssue" ADD CONSTRAINT "FieldIssue_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldIssue" ADD CONSTRAINT "FieldIssue_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldIssue" ADD CONSTRAINT "FieldIssue_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
