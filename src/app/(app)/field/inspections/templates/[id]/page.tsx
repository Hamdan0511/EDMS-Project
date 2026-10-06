import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { SectionHeader } from "@/components/ui/section-header";
import { buttonClass } from "@/components/ui/button";
import { ChevronLeft } from "@/components/ui/icons";

export default async function InspectionTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;

  const template = await prisma.fieldInspectionTemplate.findFirst({
    where: { id, projectId: membership.projectId },
    include: { groups: { include: { items: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } } },
  });
  if (!template) notFound();

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Inspection Template</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{template.name}</h1>
        </div>
        <Link href="/field/inspections/templates" className={buttonClass("secondary", "md")}>
          <ChevronLeft size={14} />
          Back
        </Link>
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-[3px] border border-border bg-white">
        {template.description && (
          <>
            <SectionHeader>Description</SectionHeader>
            <div className="px-4 py-3 text-[13px] text-text-primary">{template.description}</div>
          </>
        )}

        {template.groups.map((group) => (
          <div key={group.id}>
            <SectionHeader>{group.name}</SectionHeader>
            <ul className="flex flex-col divide-y divide-border">
              {group.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between px-4 py-2 text-[13px]">
                  <span className="text-text-primary">{item.label}</span>
                  <span className="text-[11px] text-text-muted">
                    {item.responseType.replaceAll("_", " / ")}
                    {item.isMandatory ? " · Mandatory" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
