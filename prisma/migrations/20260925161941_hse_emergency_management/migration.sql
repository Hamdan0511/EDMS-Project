-- CreateEnum
CREATE TYPE "HseEmergencyProcedureStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "HseEmergencyEventStatus" AS ENUM ('REPORTED', 'RESPONDING', 'UNDER_REVIEW', 'FOLLOW_UP', 'CLOSED');

-- CreateEnum
CREATE TYPE "HseEmergencyDrillResult" AS ENUM ('SATISFACTORY', 'NEEDS_IMPROVEMENT', 'UNSATISFACTORY');

-- CreateEnum
CREATE TYPE "HseEmergencyDrillStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "HseEmergencyContact" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "organizationId" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "emergencyType" TEXT,
    "location" TEXT,
    "availability" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HseEmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HseEmergencyProcedure" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "emergencyType" TEXT NOT NULL,
    "immediateActions" TEXT NOT NULL,
    "evacuationInstructions" TEXT,
    "assemblyPoint" TEXT,
    "requiredEquipment" TEXT,
    "steps" TEXT,
    "status" "HseEmergencyProcedureStatus" NOT NULL DEFAULT 'DRAFT',
    "lastReviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HseEmergencyProcedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HseEmergencyEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "eventNumber" TEXT NOT NULL,
    "emergencyType" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "severity" "HseSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "immediateActions" TEXT,
    "peopleAffected" TEXT,
    "emergencyServicesContacted" BOOLEAN NOT NULL DEFAULT false,
    "evacuationRequired" BOOLEAN NOT NULL DEFAULT false,
    "assemblyPoint" TEXT,
    "status" "HseEmergencyEventStatus" NOT NULL DEFAULT 'REPORTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HseEmergencyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HseEmergencyDrill" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "drillNumber" TEXT NOT NULL,
    "drillType" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "scenario" TEXT,
    "coordinatorId" TEXT NOT NULL,
    "expectedParticipants" INTEGER,
    "actualParticipants" INTEGER,
    "assemblyPoint" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "observations" TEXT,
    "result" "HseEmergencyDrillResult",
    "status" "HseEmergencyDrillStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HseEmergencyDrill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HseEmergencyDrillAttendee" (
    "id" TEXT NOT NULL,
    "drillId" TEXT NOT NULL,
    "userId" TEXT,
    "organizationName" TEXT,
    "present" BOOLEAN NOT NULL DEFAULT true,
    "role" TEXT,

    CONSTRAINT "HseEmergencyDrillAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HseEmergencyDrillFinding" (
    "id" TEXT NOT NULL,
    "drillId" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "severity" "HseSeverity" NOT NULL,
    "finding" TEXT NOT NULL,

    CONSTRAINT "HseEmergencyDrillFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HseEmergencyContact_projectId_idx" ON "HseEmergencyContact"("projectId");

-- CreateIndex
CREATE INDEX "HseEmergencyProcedure_projectId_status_idx" ON "HseEmergencyProcedure"("projectId", "status");

-- CreateIndex
CREATE INDEX "HseEmergencyEvent_projectId_status_idx" ON "HseEmergencyEvent"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HseEmergencyEvent_projectId_eventNumber_key" ON "HseEmergencyEvent"("projectId", "eventNumber");

-- CreateIndex
CREATE INDEX "HseEmergencyDrill_projectId_status_idx" ON "HseEmergencyDrill"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HseEmergencyDrill_projectId_drillNumber_key" ON "HseEmergencyDrill"("projectId", "drillNumber");

-- CreateIndex
CREATE INDEX "HseEmergencyDrillAttendee_drillId_idx" ON "HseEmergencyDrillAttendee"("drillId");

-- CreateIndex
CREATE INDEX "HseEmergencyDrillFinding_drillId_idx" ON "HseEmergencyDrillFinding"("drillId");

-- AddForeignKey
ALTER TABLE "HseEmergencyContact" ADD CONSTRAINT "HseEmergencyContact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseEmergencyContact" ADD CONSTRAINT "HseEmergencyContact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseEmergencyContact" ADD CONSTRAINT "HseEmergencyContact_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseEmergencyProcedure" ADD CONSTRAINT "HseEmergencyProcedure_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseEmergencyProcedure" ADD CONSTRAINT "HseEmergencyProcedure_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseEmergencyProcedure" ADD CONSTRAINT "HseEmergencyProcedure_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseEmergencyEvent" ADD CONSTRAINT "HseEmergencyEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseEmergencyEvent" ADD CONSTRAINT "HseEmergencyEvent_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseEmergencyDrill" ADD CONSTRAINT "HseEmergencyDrill_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseEmergencyDrill" ADD CONSTRAINT "HseEmergencyDrill_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseEmergencyDrill" ADD CONSTRAINT "HseEmergencyDrill_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseEmergencyDrillAttendee" ADD CONSTRAINT "HseEmergencyDrillAttendee_drillId_fkey" FOREIGN KEY ("drillId") REFERENCES "HseEmergencyDrill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseEmergencyDrillAttendee" ADD CONSTRAINT "HseEmergencyDrillAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseEmergencyDrillFinding" ADD CONSTRAINT "HseEmergencyDrillFinding_drillId_fkey" FOREIGN KEY ("drillId") REFERENCES "HseEmergencyDrill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
