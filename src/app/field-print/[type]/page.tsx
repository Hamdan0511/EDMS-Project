import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { getFieldReportTable, FIELD_REPORT_TYPES, type FieldReportType } from "@/lib/field/reports";
import { PrintTrigger } from "@/components/ui/print-trigger";
import { ShanfariLogo } from "@/components/ui/shanfari-logo";

const VALID_TYPES = FIELD_REPORT_TYPES.map((t) => t.key);

export default async function FieldPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ dateFrom?: string; dateTo?: string; areaId?: string; walkId?: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) notFound();
  const { type } = await params;
  if (!VALID_TYPES.includes(type as FieldReportType)) notFound();

  const canExport = await hasPermission(user.id, "FIELD_EXPORT_REPORTS", { projectId: membership.projectId });
  if (!canExport) notFound();

  const sp = await searchParams;
  const dateFrom = sp.dateFrom ? new Date(`${sp.dateFrom}T00:00:00.000Z`) : undefined;
  const dateTo = sp.dateTo ? new Date(`${sp.dateTo}T23:59:59.999Z`) : undefined;

  const table = await getFieldReportTable(type as FieldReportType, membership.projectId, {
    dateFrom,
    dateTo,
    areaId: sp.areaId,
    walkId: sp.walkId,
  });

  const project = await prisma.project.findUnique({ where: { id: membership.projectId } });

  return (
    <div className="print-page">
      <PrintTrigger />
      <style>{`
        @page { size: A4 landscape; margin: 14mm; }
        body { background: white; }
        .print-page { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; font-size: 11px; max-width: 297mm; margin: 0 auto; padding: 12px; }
        table.print-meta { width: 100%; border-collapse: collapse; margin: 10px 0; }
        table.print-meta td { padding: 4px 0; vertical-align: top; }
        .print-label { color: #71695f; text-transform: uppercase; font-size: 10px; font-weight: 600; }
        table.print-rows { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.print-rows th, table.print-rows td { border: 1px solid #ded6c8; padding: 5px 7px; text-align: left; font-size: 10.5px; }
        table.print-rows th { background: #f7f3ec; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.03em; color: #71695f; }
        @media screen { .print-page { padding: 24px; box-shadow: 0 0 0 1px #ded6c8; margin: 24px auto; } }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {(project?.name ?? membership.project.name).toUpperCase()}
          </div>
          {project?.clientName && <div>{project.clientName}</div>}
          {project?.location && <div>{project.location}</div>}
        </div>
        <ShanfariLogo variant="stacked" size={20} />
      </div>

      <h1 style={{ fontSize: 15, borderTop: "1px solid #ded6c8", borderBottom: "1px solid #ded6c8", padding: "10px 0", marginTop: 12 }}>
        {table.title}
      </h1>

      <table className="print-meta">
        <tbody>
          <tr>
            <td style={{ width: "33%" }}>
              <div className="print-label">Filters</div>
              {table.filtersSummary}
            </td>
            <td style={{ width: "33%" }}>
              <div className="print-label">Generated</div>
              {table.generatedAt.toLocaleString("en-GB")}
            </td>
            <td>
              <div className="print-label">Total Records</div>
              {table.rows.length}
            </td>
          </tr>
        </tbody>
      </table>

      <p>{table.description}</p>

      <table className="print-rows">
        <thead>
          <tr>
            {table.columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.length === 0 ? (
            <tr>
              <td colSpan={table.columns.length} style={{ textAlign: "center", color: "#71695f" }}>
                No records match these filters.
              </td>
            </tr>
          ) : (
            table.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
