-- CreateEnum
CREATE TYPE "FieldPunchlistStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "FieldPunchItemStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WORK_DONE', 'READY_FOR_VERIFICATION', 'REWORK_REQUIRED', 'VERIFIED', 'CLOSED');

-- CreateTable
CREATE TABLE "FieldPunchlist" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "punchlistNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "areaId" TEXT,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "ownerId" TEXT,
    "status" "FieldPunchlistStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "FieldPunchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldPunchlistIssue" (
    "id" TEXT NOT NULL,
    "punchlistId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,

    CONSTRAINT "FieldPunchlistIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldPunchItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "punchlistId" TEXT,
    "punchItemNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "areaId" TEXT,
    "tradeId" TEXT,
    "priority" "FieldPriority" NOT NULL DEFAULT 'MEDIUM',
    "responsibleOrgId" TEXT,
    "responsibleUserId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "FieldPunchItemStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedById" TEXT,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "FieldPunchItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FieldPunchlist_projectId_status_idx" ON "FieldPunchlist"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FieldPunchlist_projectId_punchlistNumber_key" ON "FieldPunchlist"("projectId", "punchlistNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FieldPunchlistIssue_punchlistId_issueId_key" ON "FieldPunchlistIssue"("punchlistId", "issueId");

-- CreateIndex
CREATE INDEX "FieldPunchItem_projectId_status_idx" ON "FieldPunchItem"("projectId", "status");

-- CreateIndex
CREATE INDEX "FieldPunchItem_punchlistId_idx" ON "FieldPunchItem"("punchlistId");

-- CreateIndex
CREATE INDEX "FieldPunchItem_areaId_idx" ON "FieldPunchItem"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldPunchItem_projectId_punchItemNumber_key" ON "FieldPunchItem"("projectId", "punchItemNumber");

-- AddForeignKey
ALTER TABLE "FieldPunchlist" ADD CONSTRAINT "FieldPunchlist_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldPunchlist" ADD CONSTRAINT "FieldPunchlist_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "FieldArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldPunchlist" ADD CONSTRAINT "FieldPunchlist_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldPunchlist" ADD CONSTRAINT "FieldPunchlist_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldPunchlistIssue" ADD CONSTRAINT "FieldPunchlistIssue_punchlistId_fkey" FOREIGN KEY ("punchlistId") REFERENCES "FieldPunchlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldPunchlistIssue" ADD CONSTRAINT "FieldPunchlistIssue_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "FieldIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldPunchItem" ADD CONSTRAINT "FieldPunchItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldPunchItem" ADD CONSTRAINT "FieldPunchItem_punchlistId_fkey" FOREIGN KEY ("punchlistId") REFERENCES "FieldPunchlist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldPunchItem" ADD CONSTRAINT "FieldPunchItem_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "FieldArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldPunchItem" ADD CONSTRAINT "FieldPunchItem_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "FieldLookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldPunchItem" ADD CONSTRAINT "FieldPunchItem_responsibleOrgId_fkey" FOREIGN KEY ("responsibleOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldPunchItem" ADD CONSTRAINT "FieldPunchItem_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldPunchItem" ADD CONSTRAINT "FieldPunchItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldPunchItem" ADD CONSTRAINT "FieldPunchItem_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
