-- CreateEnum
CREATE TYPE "TemporaryFileStatus" AS ENUM ('TEMPORARY', 'PROCESSING', 'REGISTERED');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "TemporaryFile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "TemporaryFileStatus" NOT NULL DEFAULT 'TEMPORARY',
    "registeredDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemporaryFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryFile_registeredDocumentId_key" ON "TemporaryFile"("registeredDocumentId");

-- CreateIndex
CREATE INDEX "TemporaryFile_projectId_status_idx" ON "TemporaryFile"("projectId", "status");

-- CreateIndex
CREATE INDEX "TemporaryFile_uploadedById_idx" ON "TemporaryFile"("uploadedById");

-- AddForeignKey
ALTER TABLE "TemporaryFile" ADD CONSTRAINT "TemporaryFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryFile" ADD CONSTRAINT "TemporaryFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryFile" ADD CONSTRAINT "TemporaryFile_registeredDocumentId_fkey" FOREIGN KEY ("registeredDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
