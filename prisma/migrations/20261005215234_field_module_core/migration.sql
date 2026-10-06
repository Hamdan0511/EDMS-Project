-- CreateEnum
CREATE TYPE "FieldPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FieldInspectionClassification" AS ENUM ('R', 'S', 'W', 'H');

-- CreateTable
CREATE TABLE "FieldArea" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "levelType" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldAttachment" (
    "id" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "category" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldPhoto" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "markupAttachmentId" TEXT,
    "areaId" TEXT,
    "capturedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldDocumentReference" (
    "id" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentVersionId" TEXT,
    "revisionAtIssue" TEXT,
    "pinX" DOUBLE PRECISION,
    "pinY" DOUBLE PRECISION,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldDocumentReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldLookup" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FieldLookup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldComment" (
    "id" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FieldArea_projectId_parentId_idx" ON "FieldArea"("projectId", "parentId");

-- CreateIndex
CREATE INDEX "FieldAttachment_recordType_recordId_idx" ON "FieldAttachment"("recordType", "recordId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldPhoto_attachmentId_key" ON "FieldPhoto"("attachmentId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldPhoto_markupAttachmentId_key" ON "FieldPhoto"("markupAttachmentId");

-- CreateIndex
CREATE INDEX "FieldPhoto_projectId_idx" ON "FieldPhoto"("projectId");

-- CreateIndex
CREATE INDEX "FieldDocumentReference_recordType_recordId_idx" ON "FieldDocumentReference"("recordType", "recordId");

-- CreateIndex
CREATE INDEX "FieldDocumentReference_documentId_idx" ON "FieldDocumentReference"("documentId");

-- CreateIndex
CREATE INDEX "FieldLookup_projectId_kind_idx" ON "FieldLookup"("projectId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "FieldLookup_projectId_kind_name_key" ON "FieldLookup"("projectId", "kind", "name");

-- CreateIndex
CREATE INDEX "FieldComment_recordType_recordId_idx" ON "FieldComment"("recordType", "recordId");

-- AddForeignKey
ALTER TABLE "FieldArea" ADD CONSTRAINT "FieldArea_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldArea" ADD CONSTRAINT "FieldArea_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FieldArea"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FieldAttachment" ADD CONSTRAINT "FieldAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldPhoto" ADD CONSTRAINT "FieldPhoto_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldPhoto" ADD CONSTRAINT "FieldPhoto_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "FieldAttachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldPhoto" ADD CONSTRAINT "FieldPhoto_markupAttachmentId_fkey" FOREIGN KEY ("markupAttachmentId") REFERENCES "FieldAttachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldPhoto" ADD CONSTRAINT "FieldPhoto_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "FieldArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldPhoto" ADD CONSTRAINT "FieldPhoto_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldDocumentReference" ADD CONSTRAINT "FieldDocumentReference_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldDocumentReference" ADD CONSTRAINT "FieldDocumentReference_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldDocumentReference" ADD CONSTRAINT "FieldDocumentReference_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldLookup" ADD CONSTRAINT "FieldLookup_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldComment" ADD CONSTRAINT "FieldComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
