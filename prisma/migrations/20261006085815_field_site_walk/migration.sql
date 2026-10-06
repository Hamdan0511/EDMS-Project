-- AlterTable
ALTER TABLE "FieldIssue" ADD COLUMN     "siteWalkId" TEXT;

-- AlterTable
ALTER TABLE "FieldObservation" ADD COLUMN     "siteWalkId" TEXT;

-- AlterTable
ALTER TABLE "FieldPhoto" ADD COLUMN     "siteWalkId" TEXT;

-- AlterTable
ALTER TABLE "FieldPunchItem" ADD COLUMN     "siteWalkId" TEXT;

-- CreateTable
CREATE TABLE "FieldSiteWalk" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "areaId" TEXT,
    "purpose" TEXT NOT NULL,
    "startedById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldSiteWalk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FieldSiteWalk_projectId_idx" ON "FieldSiteWalk"("projectId");

-- AddForeignKey
ALTER TABLE "FieldPhoto" ADD CONSTRAINT "FieldPhoto_siteWalkId_fkey" FOREIGN KEY ("siteWalkId") REFERENCES "FieldSiteWalk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldSiteWalk" ADD CONSTRAINT "FieldSiteWalk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldSiteWalk" ADD CONSTRAINT "FieldSiteWalk_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "FieldArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldSiteWalk" ADD CONSTRAINT "FieldSiteWalk_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldObservation" ADD CONSTRAINT "FieldObservation_siteWalkId_fkey" FOREIGN KEY ("siteWalkId") REFERENCES "FieldSiteWalk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldIssue" ADD CONSTRAINT "FieldIssue_siteWalkId_fkey" FOREIGN KEY ("siteWalkId") REFERENCES "FieldSiteWalk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldPunchItem" ADD CONSTRAINT "FieldPunchItem_siteWalkId_fkey" FOREIGN KEY ("siteWalkId") REFERENCES "FieldSiteWalk"("id") ON DELETE SET NULL ON UPDATE CASCADE;
