-- CreateEnum
CREATE TYPE "DocumentMetadataCategory" AS ENUM ('DISCIPLINE', 'FUNCTIONAL_BREAKDOWN', 'SPATIAL_BREAKDOWN');

-- CreateEnum
CREATE TYPE "DocumentReviewStatus" AS ENUM ('A_NO_OBJECTION', 'B_NO_OBJECTION_WITH_COMMENTS', 'C_REVISE_RESUBMIT');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "functionalBreakdown" TEXT,
ADD COLUMN     "reviewStatus" "DocumentReviewStatus",
ADD COLUMN     "spatialBreakdown" TEXT;

-- CreateTable
CREATE TABLE "DocumentMetadataOption" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "DocumentMetadataCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentMetadataOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentMetadataOption_projectId_category_idx" ON "DocumentMetadataOption"("projectId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentMetadataOption_projectId_category_name_key" ON "DocumentMetadataOption"("projectId", "category", "name");

-- AddForeignKey
ALTER TABLE "DocumentMetadataOption" ADD CONSTRAINT "DocumentMetadataOption_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
