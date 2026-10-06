import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { getTestChain } from "@/lib/services/field/test-service";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonClass } from "@/components/ui/button";
import { ChevronLeft, FlaskConical } from "@/components/ui/icons";
import { FieldAuditTrail } from "@/components/field/field-audit-trail";
import { getFieldAuditTrail } from "@/lib/field/audit-trail";
import { CreateRetestForm } from "@/components/field/create-retest-form";
import { CreateIssueFromTestButton } from "@/components/field/create-issue-from-test-button";
import { TEST_RESULT_LABELS, TEST_RESULT_BADGE_CLASSES } from "@/lib/field/status";

export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;
  const projectId = membership.projectId;

  const test = await prisma.fieldTest.findFirst({
    where: { id, projectId },
    include: { area: true, type: true, responsibleOrg: true, createdBy: true },
  });
  if (!test) notFound();

  const [chain, canManage, auditTrail] = await Promise.all([
    getTestChain(id, projectId),
    hasPermission(user.id, "FIELD_MANAGE_TESTS", { projectId }),
    getFieldAuditTrail("FieldTest", id, projectId),
  ]);

  const latest = chain[chain.length - 1];
  const isLatest = latest?.id === test.id;
  const canRetest = canManage && isLatest && test.resultStatus === "FAIL";
  const canCreateIssue = canManage && test.resultStatus === "FAIL";

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Test Result</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{test.testNumber}</h1>
        </div>
        <Link href="/field/tests" className={buttonClass("secondary", "md")}>
          <ChevronLeft size={14} />
          Back
        </Link>
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-[3px] border border-border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <StatusBadge label={TEST_RESULT_LABELS[test.resultStatus]} className={TEST_RESULT_BADGE_CLASSES[test.resultStatus]} />
          {test.type && <span className="text-[13px] text-text-secondary">{test.type.name}</span>}
          {canCreateIssue && <CreateIssueFromTestButton testId={test.id} />}
        </div>

        {chain.length > 1 && (
          <>
            <SectionHeader>Test History</SectionHeader>
            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
              {chain.map((t, i) => (
                <div key={t.id} className="flex items-center gap-2">
                  {i > 0 && <span className="text-text-muted">→</span>}
                  <Link
                    href={`/field/tests/${t.id}`}
                    className={`flex items-center gap-1.5 rounded-[3px] border px-2 py-1 text-[12px] ${
                      t.id === test.id ? "border-brand-400 bg-brand-50 font-medium text-brand-700" : "border-border text-text-secondary hover:border-brand-400"
                    }`}
                  >
                    <FlaskConical size={12} />
                    {t.testNumber}
                    <StatusBadge label={TEST_RESULT_LABELS[t.resultStatus]} className={TEST_RESULT_BADGE_CLASSES[t.resultStatus]} />
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}

        <SectionHeader>Overview</SectionHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-3 text-[13px]">
          <Row label="Type" value={test.type?.name ?? "—"} />
          <Row label="Location" value={test.area?.name ?? "—"} />
          <Row label="Test Date" value={test.testDate.toLocaleDateString("en-GB")} />
          <Row label="Tested By" value={test.testedByName} />
          <Row label="Witnessed By" value={test.witnessedByName ?? "—"} />
          <Row label="Responsible Org" value={test.responsibleOrg?.name ?? "—"} />
          <Row label="Requirement" value={test.requirement ?? "—"} full />
          <Row label="Actual Result" value={test.actualResult ? `${test.actualResult}${test.unit ? ` ${test.unit}` : ""}` : "—"} />
          <Row label="Certificate Ref." value={test.certificateReference ?? "—"} />
          <Row label="Recorded By" value={test.createdBy.name} />
        </div>

        {test.notes && (
          <>
            <SectionHeader>Notes</SectionHeader>
            <div className="whitespace-pre-wrap px-4 py-3 text-[13px] text-text-primary">{test.notes}</div>
          </>
        )}

        {canRetest && (
          <>
            <SectionHeader>Create Retest</SectionHeader>
            <div className="px-4 py-3">
              <CreateRetestForm testId={test.id} defaultTestedByName={test.testedByName} />
            </div>
          </>
        )}

        <SectionHeader>Audit Trail</SectionHeader>
        <FieldAuditTrail events={auditTrail} />
      </div>
    </div>
  );
}

function Row({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={`flex gap-2 ${full ? "col-span-2" : ""}`}>
      <span className="w-32 shrink-0 text-text-muted">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
