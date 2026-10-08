-- AlterTable
ALTER TABLE "ManagementSystemCertificate" ADD COLUMN     "certifyingBody" TEXT,
ADD COLUMN     "expiryDate" TIMESTAMP(3),
ADD COLUMN     "issueDate" TIMESTAMP(3),
ADD COLUMN     "registrationNo" TEXT,
ADD COLUMN     "scope" TEXT,
ADD COLUMN     "validUntil" TIMESTAMP(3);
