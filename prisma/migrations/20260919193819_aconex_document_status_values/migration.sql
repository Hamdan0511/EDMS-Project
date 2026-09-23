-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentStatus" ADD VALUE 'FOR_ACTION';
ALTER TYPE "DocumentStatus" ADD VALUE 'FOR_INFORMATION';
ALTER TYPE "DocumentStatus" ADD VALUE 'NO_OBJECTION';
ALTER TYPE "DocumentStatus" ADD VALUE 'NO_OBJECTION_WITH_COMMENTS';
ALTER TYPE "DocumentStatus" ADD VALUE 'NO_STATUS';
