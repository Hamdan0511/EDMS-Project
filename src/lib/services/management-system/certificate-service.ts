import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/permissions";
import { saveUploadedFile } from "@/lib/storage";
import { sha256 } from "@/lib/management-system/checksum";
import { ISO_STANDARD_LABELS, MANAGEMENT_SYSTEM_DESCRIPTIONS } from "@/lib/management-system/status";
import type { ManagementSystemCategory } from "@prisma/client";

export class ManagementSystemError extends Error {}

const MANAGE_PERMISSION = "MANAGEMENT_SYSTEM_MANAGE";

/** One certificate per management system per project — uploading again for
 * the same system replaces the record (the PDF itself is the authoritative
 * source; we never edit or regenerate it, only swap which real file is
 * registered). */
export async function upsertManagementSystemCertificate(params: {
  projectId: string;
  actingUserId: string;
  managementSystem: ManagementSystemCategory;
  file: File;
}) {
  const { projectId, actingUserId, managementSystem } = params;
  await requirePermission(actingUserId, MANAGE_PERMISSION, { projectId });

  const buffer = Buffer.from(await params.file.arrayBuffer());
  const checksum = sha256(buffer);
  const { storedPath, sizeBytes } = await saveUploadedFile("management-system", params.file);

  const certificate = await prisma.managementSystemCertificate.upsert({
    where: { projectId_managementSystem: { projectId, managementSystem } },
    update: {
      isoStandard: ISO_STANDARD_LABELS[managementSystem],
      title: MANAGEMENT_SYSTEM_DESCRIPTIONS[managementSystem],
      fileName: params.file.name,
      storedPath,
      mimeType: params.file.type || "application/pdf",
      sizeBytes,
      checksum,
      uploadedById: actingUserId,
    },
    create: {
      projectId,
      managementSystem,
      isoStandard: ISO_STANDARD_LABELS[managementSystem],
      title: MANAGEMENT_SYSTEM_DESCRIPTIONS[managementSystem],
      fileName: params.file.name,
      storedPath,
      mimeType: params.file.type || "application/pdf",
      sizeBytes,
      checksum,
      uploadedById: actingUserId,
    },
  });

  await logAudit({
    userId: actingUserId,
    projectId,
    action: "MANAGEMENT_SYSTEM_CERTIFICATE_UPLOADED",
    entityType: "ManagementSystemCertificate",
    entityId: certificate.id,
    metadata: { managementSystem, isoStandard: certificate.isoStandard },
  });

  return certificate;
}
