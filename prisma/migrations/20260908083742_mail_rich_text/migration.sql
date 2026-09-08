-- AlterTable
ALTER TABLE "Mail" ADD COLUMN     "messageText" TEXT NOT NULL DEFAULT '';

-- Data migration: every existing "messageHtml" value was actually plain
-- text (the editor before this change was a plain textarea). Preserve it
-- verbatim as messageText, and turn messageHtml into equivalent-safe HTML
-- (escape entities, convert line breaks) so existing mail renders exactly
-- as before once messageHtml starts being rendered as real HTML.
UPDATE "Mail" SET
  "messageText" = "messageHtml",
  "messageHtml" = replace(
    replace(
      replace(
        replace(
          replace("messageHtml", '&', '&amp;'),
          '<', '&lt;'
        ),
        '>', '&gt;'
      ),
      E'\r\n', '<br>'
    ),
    E'\n', '<br>'
  );

-- CreateTable
CREATE TABLE "AutoText" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoText_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailInlineImage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailInlineImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutoText_projectId_idx" ON "AutoText"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "AutoText_projectId_name_key" ON "AutoText"("projectId", "name");

-- CreateIndex
CREATE INDEX "Signature_userId_idx" ON "Signature"("userId");

-- CreateIndex
CREATE INDEX "MailInlineImage_projectId_idx" ON "MailInlineImage"("projectId");

-- AddForeignKey
ALTER TABLE "AutoText" ADD CONSTRAINT "AutoText_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoText" ADD CONSTRAINT "AutoText_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailInlineImage" ADD CONSTRAINT "MailInlineImage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailInlineImage" ADD CONSTRAINT "MailInlineImage_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
