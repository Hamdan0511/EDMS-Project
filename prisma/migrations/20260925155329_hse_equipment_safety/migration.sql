-- CreateEnum
CREATE TYPE "HseEquipmentStatus" AS ENUM ('AVAILABLE', 'INSPECTION_DUE', 'UNDER_INSPECTION', 'PASSED', 'FAILED', 'OUT_OF_SERVICE', 'UNDER_REPAIR', 'RELEASED');

-- CreateEnum
CREATE TYPE "HseEquipmentInspectionResult" AS ENUM ('PASS', 'FAIL');

-- CreateEnum
CREATE TYPE "HseChecklistResult" AS ENUM ('PASS', 'FAIL', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "HseEquipment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "equipmentNumber" TEXT NOT NULL,
    "equipmentType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "makeModel" TEXT,
    "serialNumber" TEXT,
    "location" TEXT,
    "organizationId" TEXT,
    "responsiblePersonId" TEXT,
    "status" "HseEquipmentStatus" NOT NULL DEFAULT 'AVAILABLE',
    "riskLevel" "HseRiskLevel",
    "lastInspectionAt" TIMESTAMP(3),
    "nextInspectionDue" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HseEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HseEquipmentInspection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "inspectionNumber" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" "HseEquipmentInspectionResult" NOT NULL,
    "previousInspectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HseEquipmentInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HseEquipmentInspectionItem" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "result" "HseChecklistResult" NOT NULL,
    "comment" TEXT,
    "severity" "HseSeverity",
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HseEquipmentInspectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HseEquipment_projectId_status_idx" ON "HseEquipment"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HseEquipment_projectId_equipmentNumber_key" ON "HseEquipment"("projectId", "equipmentNumber");

-- CreateIndex
CREATE INDEX "HseEquipmentInspection_equipmentId_idx" ON "HseEquipmentInspection"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "HseEquipmentInspection_projectId_inspectionNumber_key" ON "HseEquipmentInspection"("projectId", "inspectionNumber");

-- CreateIndex
CREATE INDEX "HseEquipmentInspectionItem_inspectionId_idx" ON "HseEquipmentInspectionItem"("inspectionId");

-- AddForeignKey
ALTER TABLE "HseEquipment" ADD CONSTRAINT "HseEquipment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseEquipment" ADD CONSTRAINT "HseEquipment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseEquipment" ADD CONSTRAINT "HseEquipment_responsiblePersonId_fkey" FOREIGN KEY ("responsiblePersonId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseEquipment" ADD CONSTRAINT "HseEquipment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseEquipmentInspection" ADD CONSTRAINT "HseEquipmentInspection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseEquipmentInspection" ADD CONSTRAINT "HseEquipmentInspection_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "HseEquipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseEquipmentInspection" ADD CONSTRAINT "HseEquipmentInspection_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseEquipmentInspection" ADD CONSTRAINT "HseEquipmentInspection_previousInspectionId_fkey" FOREIGN KEY ("previousInspectionId") REFERENCES "HseEquipmentInspection"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "HseEquipmentInspectionItem" ADD CONSTRAINT "HseEquipmentInspectionItem_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "HseEquipmentInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
