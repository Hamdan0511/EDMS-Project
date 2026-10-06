-- CreateEnum
CREATE TYPE "FieldTestResult" AS ENUM ('PASS', 'FAIL', 'PENDING', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "FieldTest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "testNumber" TEXT NOT NULL,
    "typeId" TEXT,
    "areaId" TEXT,
    "testDate" TIMESTAMP(3) NOT NULL,
    "testedByName" TEXT NOT NULL,
    "testedById" TEXT,
    "witnessedByName" TEXT,
    "responsibleOrgId" TEXT,
    "requirement" TEXT,
    "actualResult" TEXT,
    "unit" TEXT,
    "resultStatus" "FieldTestResult" NOT NULL DEFAULT 'PENDING',
    "certificateReference" TEXT,
    "notes" TEXT,
    "previousTestId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldTest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FieldTest_previousTestId_key" ON "FieldTest"("previousTestId");

-- CreateIndex
CREATE INDEX "FieldTest_projectId_resultStatus_idx" ON "FieldTest"("projectId", "resultStatus");

-- CreateIndex
CREATE INDEX "FieldTest_areaId_idx" ON "FieldTest"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldTest_projectId_testNumber_key" ON "FieldTest"("projectId", "testNumber");

-- AddForeignKey
ALTER TABLE "FieldTest" ADD CONSTRAINT "FieldTest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldTest" ADD CONSTRAINT "FieldTest_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "FieldLookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldTest" ADD CONSTRAINT "FieldTest_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "FieldArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldTest" ADD CONSTRAINT "FieldTest_testedById_fkey" FOREIGN KEY ("testedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldTest" ADD CONSTRAINT "FieldTest_responsibleOrgId_fkey" FOREIGN KEY ("responsibleOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldTest" ADD CONSTRAINT "FieldTest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldTest" ADD CONSTRAINT "FieldTest_previousTestId_fkey" FOREIGN KEY ("previousTestId") REFERENCES "FieldTest"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
