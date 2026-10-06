-- CreateEnum
CREATE TYPE "FieldObservationStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFICATION_REQUIRED', 'VERIFIED', 'CLOSED');

-- CreateTable
CREATE TABLE "FieldObservation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "observationNumber" TEXT NOT NULL,
    "areaId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "typeId" TEXT,
    "priority" "FieldPriority" NOT NULL DEFAULT 'MEDIUM',
    "isPositive" BOOLEAN NOT NULL DEFAULT false,
    "responsibleOrgId" TEXT,
    "responsibleUserId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "FieldObservationStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedById" TEXT,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "FieldObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FieldObservation_projectId_status_idx" ON "FieldObservation"("projectId", "status");

-- CreateIndex
CREATE INDEX "FieldObservation_areaId_idx" ON "FieldObservation"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldObservation_projectId_observationNumber_key" ON "FieldObservation"("projectId", "observationNumber");

-- AddForeignKey
ALTER TABLE "FieldObservation" ADD CONSTRAINT "FieldObservation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldObservation" ADD CONSTRAINT "FieldObservation_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "FieldArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldObservation" ADD CONSTRAINT "FieldObservation_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "FieldLookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldObservation" ADD CONSTRAINT "FieldObservation_responsibleOrgId_fkey" FOREIGN KEY ("responsibleOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldObservation" ADD CONSTRAINT "FieldObservation_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldObservation" ADD CONSTRAINT "FieldObservation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldObservation" ADD CONSTRAINT "FieldObservation_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
