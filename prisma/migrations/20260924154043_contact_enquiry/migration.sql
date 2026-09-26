-- CreateEnum
CREATE TYPE "ContactEnquiryType" AS ENUM ('GENERAL', 'PROJECT', 'INTERIOR_DESIGN', 'FURNITURE', 'FIT_OUT', 'EXHIBITION', 'DIGITAL_PLATFORM', 'HSE_SAFETY', 'QUALITY_COMPLIANCE');

-- CreateTable
CREATE TABLE "ContactEnquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT NOT NULL,
    "enquiryType" "ContactEnquiryType" NOT NULL,
    "projectArea" TEXT,
    "message" TEXT NOT NULL,
    "attachmentPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactEnquiry_createdAt_idx" ON "ContactEnquiry"("createdAt");
