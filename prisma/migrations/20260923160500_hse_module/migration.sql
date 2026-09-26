-- CreateEnum
CREATE TYPE "HseSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "HseLikelihood" AS ENUM ('RARE', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'ALMOST_CERTAIN');

-- CreateEnum
CREATE TYPE "HseRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "HseControlHierarchy" AS ENUM ('ELIMINATION', 'SUBSTITUTION', 'ENGINEERING', 'ADMINISTRATIVE', 'PPE');

-- CreateEnum
CREATE TYPE "HseControlStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'IMPLEMENTED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "HseObservationType" AS ENUM ('UNSAFE_ACT', 'UNSAFE_CONDITION', 'POSITIVE_OBSERVATION', 'SAFETY_IMPROVEMENT');

-- CreateEnum
CREATE TYPE "HseObservationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "HseIncidentType" AS ENUM ('INJURY', 'ILLNESS', 'PROPERTY_DAMAGE', 'ENVIRONMENTAL', 'SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "HseIncidentStatus" AS ENUM ('REPORTED', 'TRIAGED', 'UNDER_INVESTIGATION', 'CORRECTIVE_ACTION', 'VERIFICATION', 'CLOSED');

-- CreateEnum
CREATE TYPE "HseNearMissStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "HseHazardStatus" AS ENUM ('OPEN', 'CONTROLLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "HseRiskAssessmentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'UNDER_REVIEW', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "HseInspectionQuestionType" AS ENUM ('YES_NO', 'PASS_FAIL', 'TEXT', 'NUMERIC', 'PHOTO');

-- CreateEnum
CREATE TYPE "HseInspectionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "HseActionPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "HseCorrectiveActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'VERIFIED', 'CLOSED');

-- CreateEnum
CREATE TYPE "HsePermitType" AS ENUM ('HOT_WORK', 'WORK_AT_HEIGHT', 'ELECTRICAL', 'CONFINED_SPACE', 'OTHER');

-- CreateEnum
CREATE TYPE "HsePermitStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'EXPIRED', 'CLOSED');

-- CreateTable
CREATE TABLE "HseAttachment" (
    "id" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HseAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HseObservation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "observationNumber" TEXT NOT NULL,
    "type" "HseObservationType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "building" TEXT,
    "floor" TEXT,
    "area" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "severity" "HseSeverity" NOT NULL DEFAULT 'LOW',
    "status" "HseObservationStatus" NOT NULL DEFAULT 'OPEN',
    "reportedById" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HseObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HseIncident" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "incidentNumber" TEXT NOT NULL,
    "type" "HseIncidentType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "building" TEXT,
    "floor" TEXT,
    "area" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "severity" "HseSeverity" NOT NULL DEFAULT 'LOW',
    "status" "HseIncidentStatus" NOT NULL DEFAULT 'REPORTED',
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "incidentTime" TEXT,
    "immediateCause" TEXT,
    "contributingFactors" TEXT,
    "rootCause" TEXT,
    "reportedById" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HseIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HseIncidentPerson" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "organization" TEXT,

    CONSTRAINT "HseIncidentPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HseNearMiss" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "nearMissNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "whatHappened" TEXT,
    "potentialConsequence" TEXT,
    "potentialSeverity" "HseSeverity" NOT NULL DEFAULT 'LOW',
    "immediateAction" TEXT,
    "location" TEXT NOT NULL,
    "building" TEXT,
    "floor" TEXT,
    "area" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" "HseNearMissStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "dueDate" TIMESTAMP(3),
    "reportedById" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HseNearMiss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HseHazard" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "hazardNumber" TEXT NOT NULL,
    "hazard" TEXT NOT NULL,
    "activity" TEXT,
    "location" TEXT NOT NULL,
    "initialLikelihood" "HseLikelihood" NOT NULL,
    "initialSeverity" "HseSeverity" NOT NULL,
    "initialRisk" "HseRiskLevel" NOT NULL,
    "residualLikelihood" "HseLikelihood",
    "residualSeverity" "HseSeverity",
    "residualRisk" "HseRiskLevel",
    "responsibleId" TEXT,
    "reviewDate" TIMESTAMP(3),
    "status" "HseHazardStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HseHazard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HseRiskAssessment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assessmentNumber" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "task" TEXT,
    "hazard" TEXT NOT NULL,
    "potentialConsequence" TEXT,
    "initialLikelihood" "HseLikelihood" NOT NULL,
    "initialSeverity" "HseSeverity" NOT NULL,
    "initialRisk" "HseRiskLevel" NOT NULL,
    "residualLikelihood" "HseLikelihood",
    "residualSeverity" "HseSeverity",
    "residualRisk" "HseRiskLevel",
    "responsibleId" TEXT,
    "reviewDate" TIMESTAMP(3),
    "status" "HseRiskAssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HseRiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HseControl" (
    "id" TEXT NOT NULL,
    "hazardId" TEXT,
    "riskAssessmentId" TEXT,
    "hierarchy" "HseControlHierarchy" NOT NULL,
    "description" TEXT NOT NULL,
    "ownerId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "HseControlStatus" NOT NULL DEFAULT 'PLANNED',
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "HseControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HseInspectionTemplate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HseInspectionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HseInspectionQuestion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "section" TEXT,
    "text" TEXT NOT NULL,
    "type" "HseInspectionQuestionType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "HseInspectionQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HseInspection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "inspectionNumber" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" "HseInspectionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HseInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HseInspectionResponse" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT,
    "comment" TEXT,

    CONSTRAINT "HseInspectionResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HseCorrectiveAction" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "actionNumber" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "description" TEXT NOT NULL,
    "assignedToId" TEXT,
    "priority" "HseActionPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "status" "HseCorrectiveActionStatus" NOT NULL DEFAULT 'OPEN',
    "completedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HseCorrectiveAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HsePermit" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "permitNumber" TEXT NOT NULL,
    "type" "HsePermitType" NOT NULL,
    "location" TEXT NOT NULL,
    "workDescription" TEXT NOT NULL,
    "contractorOrg" TEXT,
    "requestedById" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "hazards" TEXT,
    "controls" TEXT,
    "requiredPpe" TEXT,
    "precautions" TEXT,
    "status" "HsePermitStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HsePermit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HsePermitApproval" (
    "id" TEXT NOT NULL,
    "permitId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "decision" TEXT,
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HsePermitApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HseAttachment_recordType_recordId_idx" ON "HseAttachment"("recordType", "recordId");

-- CreateIndex
CREATE INDEX "HseObservation_projectId_status_idx" ON "HseObservation"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HseObservation_projectId_observationNumber_key" ON "HseObservation"("projectId", "observationNumber");

-- CreateIndex
CREATE INDEX "HseIncident_projectId_status_idx" ON "HseIncident"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HseIncident_projectId_incidentNumber_key" ON "HseIncident"("projectId", "incidentNumber");

-- CreateIndex
CREATE INDEX "HseIncidentPerson_incidentId_idx" ON "HseIncidentPerson"("incidentId");

-- CreateIndex
CREATE INDEX "HseNearMiss_projectId_status_idx" ON "HseNearMiss"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HseNearMiss_projectId_nearMissNumber_key" ON "HseNearMiss"("projectId", "nearMissNumber");

-- CreateIndex
CREATE INDEX "HseHazard_projectId_status_idx" ON "HseHazard"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HseHazard_projectId_hazardNumber_key" ON "HseHazard"("projectId", "hazardNumber");

-- CreateIndex
CREATE INDEX "HseRiskAssessment_projectId_status_idx" ON "HseRiskAssessment"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HseRiskAssessment_projectId_assessmentNumber_key" ON "HseRiskAssessment"("projectId", "assessmentNumber");

-- CreateIndex
CREATE INDEX "HseControl_hazardId_idx" ON "HseControl"("hazardId");

-- CreateIndex
CREATE INDEX "HseControl_riskAssessmentId_idx" ON "HseControl"("riskAssessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "HseInspectionTemplate_projectId_name_key" ON "HseInspectionTemplate"("projectId", "name");

-- CreateIndex
CREATE INDEX "HseInspectionQuestion_templateId_sortOrder_idx" ON "HseInspectionQuestion"("templateId", "sortOrder");

-- CreateIndex
CREATE INDEX "HseInspection_projectId_status_idx" ON "HseInspection"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HseInspection_projectId_inspectionNumber_key" ON "HseInspection"("projectId", "inspectionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "HseInspectionResponse_inspectionId_questionId_key" ON "HseInspectionResponse"("inspectionId", "questionId");

-- CreateIndex
CREATE INDEX "HseCorrectiveAction_projectId_status_idx" ON "HseCorrectiveAction"("projectId", "status");

-- CreateIndex
CREATE INDEX "HseCorrectiveAction_assignedToId_idx" ON "HseCorrectiveAction"("assignedToId");

-- CreateIndex
CREATE INDEX "HseCorrectiveAction_sourceType_sourceId_idx" ON "HseCorrectiveAction"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "HseCorrectiveAction_projectId_actionNumber_key" ON "HseCorrectiveAction"("projectId", "actionNumber");

-- CreateIndex
CREATE INDEX "HsePermit_projectId_status_idx" ON "HsePermit"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HsePermit_projectId_permitNumber_key" ON "HsePermit"("projectId", "permitNumber");

-- CreateIndex
CREATE INDEX "HsePermitApproval_permitId_idx" ON "HsePermitApproval"("permitId");

-- AddForeignKey
ALTER TABLE "HseAttachment" ADD CONSTRAINT "HseAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseObservation" ADD CONSTRAINT "HseObservation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseObservation" ADD CONSTRAINT "HseObservation_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseIncident" ADD CONSTRAINT "HseIncident_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseIncident" ADD CONSTRAINT "HseIncident_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseIncidentPerson" ADD CONSTRAINT "HseIncidentPerson_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "HseIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseIncidentPerson" ADD CONSTRAINT "HseIncidentPerson_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseNearMiss" ADD CONSTRAINT "HseNearMiss_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseNearMiss" ADD CONSTRAINT "HseNearMiss_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseNearMiss" ADD CONSTRAINT "HseNearMiss_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseHazard" ADD CONSTRAINT "HseHazard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseHazard" ADD CONSTRAINT "HseHazard_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseHazard" ADD CONSTRAINT "HseHazard_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseRiskAssessment" ADD CONSTRAINT "HseRiskAssessment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseRiskAssessment" ADD CONSTRAINT "HseRiskAssessment_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseRiskAssessment" ADD CONSTRAINT "HseRiskAssessment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseControl" ADD CONSTRAINT "HseControl_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "HseHazard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseControl" ADD CONSTRAINT "HseControl_riskAssessmentId_fkey" FOREIGN KEY ("riskAssessmentId") REFERENCES "HseRiskAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseControl" ADD CONSTRAINT "HseControl_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseInspectionTemplate" ADD CONSTRAINT "HseInspectionTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseInspectionTemplate" ADD CONSTRAINT "HseInspectionTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseInspectionQuestion" ADD CONSTRAINT "HseInspectionQuestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "HseInspectionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseInspection" ADD CONSTRAINT "HseInspection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseInspection" ADD CONSTRAINT "HseInspection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "HseInspectionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseInspection" ADD CONSTRAINT "HseInspection_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseInspectionResponse" ADD CONSTRAINT "HseInspectionResponse_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "HseInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseInspectionResponse" ADD CONSTRAINT "HseInspectionResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "HseInspectionQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseCorrectiveAction" ADD CONSTRAINT "HseCorrectiveAction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseCorrectiveAction" ADD CONSTRAINT "HseCorrectiveAction_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseCorrectiveAction" ADD CONSTRAINT "HseCorrectiveAction_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HseCorrectiveAction" ADD CONSTRAINT "HseCorrectiveAction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HsePermit" ADD CONSTRAINT "HsePermit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HsePermit" ADD CONSTRAINT "HsePermit_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HsePermitApproval" ADD CONSTRAINT "HsePermitApproval_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "HsePermit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HsePermitApproval" ADD CONSTRAINT "HsePermitApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
