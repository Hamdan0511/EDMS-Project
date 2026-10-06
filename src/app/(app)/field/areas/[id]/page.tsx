import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { fieldAreaAndDescendantIds } from "@/lib/services/field/area-service";
import { SectionHeader } from "@/components/ui/section-header";
import { buttonClass } from "@/components/ui/button";
import {
  ChevronLeft,
  EyeIcon,
  ClipboardCheck,
  AlertCircle,
  ListTodo,
  ClipboardList,
  FlaskConical,
  Camera,
} from "@/components/ui/icons";

export default async function FieldAreaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;
  const projectId = membership.projectId;

  const area = await prisma.fieldArea.findFirst({ where: { id, projectId }, include: { parent: true, children: true } });
  if (!area) notFound();

  const areaIds = await fieldAreaAndDescendantIds(projectId, id);

  const [
    observationsTotal,
    observationsOpen,
    inspectionsTotal,
    inspectionsFailed,
    issuesTotal,
    issuesOpen,
    punchItemsTotal,
    punchItemsOpen,
    itpsTotal,
    testsTotal,
    testsFailed,
    photosTotal,
  ] = await Promise.all([
    prisma.fieldObservation.count({ where: { projectId, areaId: { in: areaIds } } }),
    prisma.fieldObservation.count({ where: { projectId, areaId: { in: areaIds }, status: { not: "CLOSED" } } }),
    prisma.fieldInspection.count({ where: { projectId, areaId: { in: areaIds } } }),
    prisma.fieldInspection.count({ where: { projectId, areaId: { in: areaIds }, status: "FAILED" } }),
    prisma.fieldIssue.count({ where: { projectId, areaId: { in: areaIds } } }),
    prisma.fieldIssue.count({ where: { projectId, areaId: { in: areaIds }, status: { not: "CLOSED" } } }),
    prisma.fieldPunchItem.count({ where: { projectId, areaId: { in: areaIds } } }),
    prisma.fieldPunchItem.count({ where: { projectId, areaId: { in: areaIds }, status: { not: "CLOSED" } } }),
    prisma.fieldItp.count({ where: { projectId, areaId: { in: areaIds } } }),
    prisma.fieldTest.count({ where: { projectId, areaId: { in: areaIds } } }),
    prisma.fieldTest.count({ where: { projectId, areaId: { in: areaIds }, resultStatus: "FAIL" } }),
    prisma.fieldPhoto.count({ where: { projectId, areaId: { in: areaIds } } }),
  ]);

  const cards = [
    { label: "Site Observations", href: `/field/observations?areaId=${id}`, icon: EyeIcon, total: observationsTotal, flagged: observationsOpen, flagLabel: "open" },
    { label: "Quality Inspections", href: `/field/inspections?areaId=${id}`, icon: ClipboardCheck, total: inspectionsTotal, flagged: inspectionsFailed, flagLabel: "failed" },
    { label: "Site Issues", href: `/field/issues?areaId=${id}`, icon: AlertCircle, total: issuesTotal, flagged: issuesOpen, flagLabel: "open" },
    { label: "Punch / Snagging", href: `/field/punch?areaId=${id}`, icon: ListTodo, total: punchItemsTotal, flagged: punchItemsOpen, flagLabel: "open" },
    { label: "ITP & Hold Points", href: `/field/itp?areaId=${id}`, icon: ClipboardList, total: itpsTotal, flagged: 0, flagLabel: "" },
    { label: "Test & Inspection Results", href: `/field/tests?areaId=${id}`, icon: FlaskConical, total: testsTotal, flagged: testsFailed, flagLabel: "failed" },
    { label: "Site Photos & Evidence", href: `/field/photos?areaId=${id}`, icon: Camera, total: photosTotal, flagged: 0, flagLabel: "" },
  ];

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            {area.parent ? `${area.parent.name} / ` : ""}
            Site Location
          </p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">
            {area.name}
            {area.levelType && <span className="ml-2 text-[13px] font-normal text-text-muted">{area.levelType}</span>}
          </h1>
        </div>
        <Link href="/field/areas" className={buttonClass("secondary", "md")}>
          <ChevronLeft size={14} />
          Back to Site Areas
        </Link>
      </div>

      <p className="mb-4 text-[13px] text-text-secondary">
        Counts below cover {area.name} and its {areaIds.length - 1} sub-location{areaIds.length - 1 === 1 ? "" : "s"}, aggregated live from real records — nothing here is cached or estimated.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} href={c.href} className="flex items-center justify-between rounded-[3px] border border-border bg-white p-3.5 hover:border-brand-400">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[3px] bg-brand-50 text-brand-700">
                  <Icon size={16} />
                </span>
                <div>
                  <p className="text-[13px] font-medium text-text-primary">{c.label}</p>
                  <p className="text-[11px] text-text-muted">
                    {c.total} total{c.flagLabel && c.flagged > 0 ? ` · ${c.flagged} ${c.flagLabel}` : ""}
                  </p>
                </div>
              </div>
              <span className="text-lg font-semibold text-text-primary">{c.total}</span>
            </Link>
          );
        })}
      </div>

      {area.children.length > 0 && (
        <>
          <SectionHeader>Sub-locations</SectionHeader>
          <div className="rounded-[3px] border border-border bg-white">
            <ul className="flex flex-col divide-y divide-border">
              {area.children.map((child) => (
                <li key={child.id} className="px-4 py-2 text-[13px]">
                  <Link href={`/field/areas/${child.id}`} className="text-brand-700 hover:underline">
                    {child.name}
                  </Link>
                  {child.levelType && <span className="ml-2 text-[11px] text-text-muted">{child.levelType}</span>}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
