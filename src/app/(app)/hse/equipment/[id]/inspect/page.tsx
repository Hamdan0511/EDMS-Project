import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { EquipmentInspectionForm } from "@/components/hse/equipment-inspection-form";
import { checklistForEquipmentType } from "@/lib/hse/equipment";
import { ClipboardCheck } from "@/components/ui/icons";

export default async function EquipmentInspectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }
  const { id } = await params;

  const equipment = await prisma.hseEquipment.findFirst({ where: { id, projectId: membership.projectId } });
  if (!equipment) notFound();

  const canManage = await hasPermission(user.id, "HSE_MANAGE_EQUIPMENT", { projectId: membership.projectId });
  if (!canManage) {
    return (
      <div className="p-6">
        <EmptyState title="You do not have permission to inspect equipment" />
      </div>
    );
  }

  const mode = equipment.status === "OUT_OF_SERVICE" ? "reinspect" : "inspect";

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardCheck size={20} className="text-brand-700" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            {mode === "reinspect" ? "Reinspection" : "Pre-Use Inspection"}
          </p>
          <h1 className="text-lg font-semibold tracking-tight text-text-primary">
            {equipment.equipmentNumber} — {equipment.description}
          </h1>
        </div>
      </div>
      <div className="mx-auto max-w-2xl">
        <Link href={`/hse/equipment/${equipment.id}`} className="mb-3 inline-block text-[12px] text-brand-700 hover:underline">
          ← Back to Equipment
        </Link>
        <EquipmentInspectionForm
          equipmentId={equipment.id}
          checklist={checklistForEquipmentType(equipment.equipmentType)}
          mode={mode}
        />
      </div>
    </div>
  );
}
