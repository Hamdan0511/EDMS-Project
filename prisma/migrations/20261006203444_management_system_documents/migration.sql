-- CreateEnum
CREATE TYPE "ManagementSystemCategory" AS ENUM ('QUALITY', 'ENVIRONMENT', 'HSE');

-- CreateTable
CREATE TABLE "ManagementSystemDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "documentNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "managementSystem" "ManagementSystemCategory" NOT NULL,
    "documentType" TEXT NOT NULL,
    "currentRevision" TEXT NOT NULL DEFAULT '01',
    "documentDate" TIMESTAMP(3),
    "author" TEXT,
    "documentOwner" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagementSystemDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagementSystemDocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagementSystemDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagementSystemCertificate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "managementSystem" "ManagementSystemCategory" NOT NULL,
    "isoStandard" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagementSystemCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManagementSystemDocument_projectId_managementSystem_idx" ON "ManagementSystemDocument"("projectId", "managementSystem");

-- CreateIndex
CREATE UNIQUE INDEX "ManagementSystemDocument_projectId_documentNo_key" ON "ManagementSystemDocument"("projectId", "documentNo");

-- CreateIndex
CREATE INDEX "ManagementSystemDocumentVersion_documentId_idx" ON "ManagementSystemDocumentVersion"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagementSystemDocumentVersion_documentId_versionNo_key" ON "ManagementSystemDocumentVersion"("documentId", "versionNo");

-- CreateIndex
CREATE INDEX "ManagementSystemCertificate_projectId_idx" ON "ManagementSystemCertificate"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagementSystemCertificate_projectId_managementSystem_key" ON "ManagementSystemCertificate"("projectId", "managementSystem");

-- AddForeignKey
ALTER TABLE "ManagementSystemDocument" ADD CONSTRAINT "ManagementSystemDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementSystemDocument" ADD CONSTRAINT "ManagementSystemDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementSystemDocument" ADD CONSTRAINT "ManagementSystemDocument_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementSystemDocumentVersion" ADD CONSTRAINT "ManagementSystemDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ManagementSystemDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementSystemDocumentVersion" ADD CONSTRAINT "ManagementSystemDocumentVersion_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementSystemCertificate" ADD CONSTRAINT "ManagementSystemCertificate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementSystemCertificate" ADD CONSTRAINT "ManagementSystemCertificate_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
