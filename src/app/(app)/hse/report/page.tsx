import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldAlert, TriangleAlert, AlertCircle, EyeIcon } from "@/components/ui/icons";
import { ReportIssueForm } from "@/components/hse/report-issue-form";

const TYPES = [
  { type: "hazard", label: "Hazard", description: "A condition that could cause harm.", icon: TriangleAlert },
  { type: "incident", label: "Incident", description: "Something has already happened.", icon: AlertCircle },
  { type: "near-miss", label: "Near Miss", description: "It almost happened, but didn't.", icon: TriangleAlert },
  { type: "observation", label: "Safety Observation", description: "Something worth noting.", icon: EyeIcon },
] as const;

export default async function ReportIssuePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }
  const params = await searchParams;
  const selectedType = TYPES.find((t) => t.type === params.type)?.type;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <ShieldAlert size={20} className="text-amber-600" />
        <h1 className="text-[20px] font-semibold text-text-primary">Report a Safety Issue</h1>
      </div>

      {!selectedType ? (
        <div className="mx-auto max-w-xl">
          <p className="mb-4 text-[13px] text-text-secondary">What would you like to report?</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TYPES.map((t) => (
              <Link
                key={t.type}
                href={`/hse/report?type=${t.type}`}
                className="flex flex-col gap-1.5 rounded-[4px] border border-border bg-white p-4 text-left shadow-sm hover:border-accent"
              >
                <t.icon size={20} className="text-stone-700" />
                <span className="text-[14px] font-semibold text-text-primary">{t.label}</span>
                <span className="text-[12px] text-text-secondary">{t.description}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-xl">
          <Link href="/hse/report" className="mb-3 inline-block text-[12px] text-brand-700 hover:underline">
            ← Choose a different type
          </Link>
          <ReportIssueForm type={selectedType} projectId={membership.projectId} />
        </div>
      )}
    </div>
  );
}
