-- CreateEnum
CREATE TYPE "FieldResponseType" AS ENUM ('PASS_FAIL', 'YES_NO', 'TEXT', 'NUMBER', 'DATE');

-- CreateEnum
CREATE TYPE "FieldInspectionStatus" AS ENUM ('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'PASSED', 'FAILED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FieldChecklistResult" AS ENUM ('PASS', 'FAIL', 'NA', 'YES', 'NO');

-- CreateTable
CREATE TABLE "FieldInspectionTemplate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldInspectionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldInspectionTemplateGroup" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FieldInspectionTemplateGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldInspectionTemplateItem" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "responseType" "FieldResponseType" NOT NULL DEFAULT 'PASS_FAIL',
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FieldInspectionTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldInspection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "inspectionNumber" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "areaId" TEXT,
    "assigneeId" TEXT,
    "inspectorId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "FieldInspectionStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldInspectionResponse" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "templateItemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "result" "FieldChecklistResult",
    "textValue" TEXT,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FieldInspectionResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FieldInspectionTemplate_projectId_isActive_idx" ON "FieldInspectionTemplate"("projectId", "isActive");

-- CreateIndex
CREATE INDEX "FieldInspectionTemplateGroup_templateId_idx" ON "FieldInspectionTemplateGroup"("templateId");

-- CreateIndex
CREATE INDEX "FieldInspectionTemplateItem_groupId_idx" ON "FieldInspectionTemplateItem"("groupId");

-- CreateIndex
CREATE INDEX "FieldInspection_projectId_status_idx" ON "FieldInspection"("projectId", "status");

-- CreateIndex
CREATE INDEX "FieldInspection_areaId_idx" ON "FieldInspection"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldInspection_projectId_inspectionNumber_key" ON "FieldInspection"("projectId", "inspectionNumber");

-- CreateIndex
CREATE INDEX "FieldInspectionResponse_inspectionId_idx" ON "FieldInspectionResponse"("inspectionId");

-- AddForeignKey
ALTER TABLE "FieldInspectionTemplate" ADD CONSTRAINT "FieldInspectionTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldInspectionTemplate" ADD CONSTRAINT "FieldInspectionTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldInspectionTemplateGroup" ADD CONSTRAINT "FieldInspectionTemplateGroup_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FieldInspectionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldInspectionTemplateItem" ADD CONSTRAINT "FieldInspectionTemplateItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FieldInspectionTemplateGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldInspection" ADD CONSTRAINT "FieldInspection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldInspection" ADD CONSTRAINT "FieldInspection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FieldInspectionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldInspection" ADD CONSTRAINT "FieldInspection_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "FieldArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldInspection" ADD CONSTRAINT "FieldInspection_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldInspection" ADD CONSTRAINT "FieldInspection_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldInspection" ADD CONSTRAINT "FieldInspection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldInspectionResponse" ADD CONSTRAINT "FieldInspectionResponse_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "FieldInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldInspectionResponse" ADD CONSTRAINT "FieldInspectionResponse_templateItemId_fkey" FOREIGN KEY ("templateItemId") REFERENCES "FieldInspectionTemplateItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
