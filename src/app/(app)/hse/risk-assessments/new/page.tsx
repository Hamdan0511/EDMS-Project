import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { NewRiskAssessmentForm } from "@/components/hse/new-risk-assessment-form";
import { ShieldAlert } from "@/components/ui/icons";

export default async function NewRiskAssessmentPage() {
  const { user, membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  const canManage = await hasPermission(user.id, "HSE_MANAGE_RISK_ASSESSMENTS", { projectId: membership.projectId });
  if (!canManage) {
    return (
      <div className="p-6">
        <EmptyState title="You do not have permission to create risk assessments" />
      </div>
    );
  }

  const members = await prisma.projectMember.findMany({
    where: { projectId: membership.projectId },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <ShieldAlert size={20} className="text-amber-600" />
        <h1 className="text-[20px] font-semibold text-text-primary">New Risk Assessment</h1>
      </div>
      <div className="mx-auto max-w-xl">
        <Link href="/hse/risk-assessments" className="mb-3 inline-block text-[12px] text-brand-700 hover:underline">
          ← Back to Risk Assessments
        </Link>
        <NewRiskAssessmentForm
          projectId={membership.projectId}
          members={members.map((m) => ({ id: m.user.id, name: m.user.name }))}
        />
      </div>
    </div>
  );
}
