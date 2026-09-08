-- CreateEnum
CREATE TYPE "UserAccountType" AS ENUM ('FULL', 'GUEST');

-- CreateEnum
CREATE TYPE "MailDirection" AS ENUM ('OUTGOING', 'INCOMING');

-- CreateEnum
CREATE TYPE "MailResponseType" AS ENUM ('RESPOND_BY', 'APPROVE_BY', 'SUBMIT_COMMENTS_BY', 'REVISE_RESUBMIT_BY', 'SUBMIT_QUOTATION_BY', 'FABRICATE_AND_DELIVER_BY', 'TENDER_DUE_BY', 'ACKNOWLEDGE_BY', 'ACTION_BY');

-- AlterTable
ALTER TABLE "Mail" ADD COLUMN     "direction" "MailDirection" NOT NULL DEFAULT 'OUTGOING',
ADD COLUMN     "responseType" "MailResponseType";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountType" "UserAccountType" NOT NULL DEFAULT 'FULL';

-- CreateTable
CREATE TABLE "MailTypeAttributeOption" (
    "id" TEXT NOT NULL,
    "mailTypeId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailTypeAttributeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailDocumentReference" (
    "id" TEXT NOT NULL,
    "mailId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailDocumentReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailRelatedMail" (
    "id" TEXT NOT NULL,
    "mailId" TEXT NOT NULL,
    "relatedMailId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailRelatedMail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MailTypeAttributeOption_mailTypeId_slot_idx" ON "MailTypeAttributeOption"("mailTypeId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "MailTypeAttributeOption_mailTypeId_slot_value_key" ON "MailTypeAttributeOption"("mailTypeId", "slot", "value");

-- CreateIndex
CREATE INDEX "MailDocumentReference_documentId_idx" ON "MailDocumentReference"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "MailDocumentReference_mailId_documentId_key" ON "MailDocumentReference"("mailId", "documentId");

-- CreateIndex
CREATE INDEX "MailRelatedMail_relatedMailId_idx" ON "MailRelatedMail"("relatedMailId");

-- CreateIndex
CREATE UNIQUE INDEX "MailRelatedMail_mailId_relatedMailId_key" ON "MailRelatedMail"("mailId", "relatedMailId");

-- AddForeignKey
ALTER TABLE "MailTypeAttributeOption" ADD CONSTRAINT "MailTypeAttributeOption_mailTypeId_fkey" FOREIGN KEY ("mailTypeId") REFERENCES "MailType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailTypeAttributeOption" ADD CONSTRAINT "MailTypeAttributeOption_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailDocumentReference" ADD CONSTRAINT "MailDocumentReference_mailId_fkey" FOREIGN KEY ("mailId") REFERENCES "Mail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailDocumentReference" ADD CONSTRAINT "MailDocumentReference_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailDocumentReference" ADD CONSTRAINT "MailDocumentReference_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailRelatedMail" ADD CONSTRAINT "MailRelatedMail_mailId_fkey" FOREIGN KEY ("mailId") REFERENCES "Mail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailRelatedMail" ADD CONSTRAINT "MailRelatedMail_relatedMailId_fkey" FOREIGN KEY ("relatedMailId") REFERENCES "Mail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailRelatedMail" ADD CONSTRAINT "MailRelatedMail_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
