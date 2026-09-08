-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'FOR_REVIEW', 'UNDER_REVIEW', 'APPROVED', 'APPROVED_WITH_COMMENTS', 'REJECTED', 'REVISE_RESUBMIT', 'SUPERSEDED', 'WITHDRAWN', 'CLOSED');

-- AlterTable: convert the free-text status column to the new enum, mapping
-- every existing value (all current rows are the seeded default "Draft").
ALTER TABLE "Document" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Document" ALTER COLUMN "status" TYPE "DocumentStatus" USING (
  CASE "status"
    WHEN 'Draft' THEN 'DRAFT'
    WHEN 'For Review' THEN 'FOR_REVIEW'
    WHEN 'Under Review' THEN 'UNDER_REVIEW'
    WHEN 'Approved' THEN 'APPROVED'
    WHEN 'Approved with Comments' THEN 'APPROVED_WITH_COMMENTS'
    WHEN 'Rejected' THEN 'REJECTED'
    WHEN 'Revise & Resubmit' THEN 'REVISE_RESUBMIT'
    WHEN 'Superseded' THEN 'SUPERSEDED'
    WHEN 'Withdrawn' THEN 'WITHDRAWN'
    WHEN 'Closed' THEN 'CLOSED'
    ELSE 'DRAFT'
  END
)::"DocumentStatus";
ALTER TABLE "Document" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "Document_projectId_status_idx" ON "Document"("projectId", "status");

-- CreateIndex
CREATE INDEX "Document_projectId_discipline_idx" ON "Document"("projectId", "discipline");
