import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { CertificateCard } from "@/components/management-system/certificate-card";
import { MANAGEMENT_SYSTEM_ORDER } from "@/lib/management-system/status";

export default async function ManagementSystemCertificatesPage() {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const projectId = membership.projectId;

  const canDownload = await hasPermission(user.id, "MANAGEMENT_SYSTEM_DOWNLOAD", { projectId });
  const certificates = await prisma.managementSystemCertificate.findMany({ where: { projectId } });
  const certByCategory = new Map(certificates.map((c) => [c.managementSystem, c]));

  return (
    <div className="p-6">
      <div className="mb-5 border-b border-border pb-4 text-center">
        <h1 className="text-lg font-semibold tracking-tight text-text-primary">ISO Certificates</h1>
        <p className="mt-1 text-[13px] text-text-secondary">Certified Management Systems — Shanfari Trading and Furnishing Co. LLC</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {MANAGEMENT_SYSTEM_ORDER.map((ms) => (
          <CertificateCard
            key={ms}
            ms={ms}
            cert={certByCategory.get(ms) ?? null}
            canDownload={canDownload}
            registerHref={`/management-system?managementSystem=${ms}`}
            variant="full"
          />
        ))}
      </div>
    </div>
  );
}
