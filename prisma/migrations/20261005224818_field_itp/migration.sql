-- CreateEnum
CREATE TYPE "FieldItpStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "FieldItpItemStatus" AS ENUM ('PENDING', 'HOLD_ACTIVE', 'INSPECTION_REQUESTED', 'APPROVED', 'REJECTED', 'RELEASED');

-- CreateTable
CREATE TABLE "FieldItp" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "itpNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "revision" TEXT NOT NULL DEFAULT 'A',
    "discipline" TEXT,
    "activity" TEXT,
    "description" TEXT,
    "areaId" TEXT,
    "responsibleOrgId" TEXT,
    "status" "FieldItpStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldItp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldItpItem" (
    "id" TEXT NOT NULL,
    "itpId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "activity" TEXT NOT NULL,
    "inspectionType" "FieldInspectionClassification" NOT NULL,
    "responsibleOrgId" TEXT,
    "acceptanceCriteria" TEXT,
    "status" "FieldItpItemStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,

    CONSTRAINT "FieldItpItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FieldItp_projectId_status_idx" ON "FieldItp"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FieldItp_projectId_itpNumber_key" ON "FieldItp"("projectId", "itpNumber");

-- CreateIndex
CREATE INDEX "FieldItpItem_itpId_status_idx" ON "FieldItpItem"("itpId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FieldItpItem_itpId_sequence_key" ON "FieldItpItem"("itpId", "sequence");

-- AddForeignKey
ALTER TABLE "FieldItp" ADD CONSTRAINT "FieldItp_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldItp" ADD CONSTRAINT "FieldItp_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "FieldArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldItp" ADD CONSTRAINT "FieldItp_responsibleOrgId_fkey" FOREIGN KEY ("responsibleOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldItp" ADD CONSTRAINT "FieldItp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldItpItem" ADD CONSTRAINT "FieldItpItem_itpId_fkey" FOREIGN KEY ("itpId") REFERENCES "FieldItp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldItpItem" ADD CONSTRAINT "FieldItpItem_responsibleOrgId_fkey" FOREIGN KEY ("responsibleOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldItpItem" ADD CONSTRAINT "FieldItpItem_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
