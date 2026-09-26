import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { requestReinspection, EquipmentError, type EquipmentChecklistItemInput } from "@/lib/services/hse/equipment-service";
import { ForbiddenPermissionError } from "@/lib/auth/permissions";

function parseItems(raw: unknown): EquipmentChecklistItemInput[] | null {
  if (!Array.isArray(raw)) return null;
  const items: EquipmentChecklistItemInput[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return null;
    const { label, result, comment } = entry as Record<string, unknown>;
    if (typeof label !== "string" || !label.trim()) return null;
    if (result !== "PASS" && result !== "FAIL" && result !== "NOT_APPLICABLE") return null;
    items.push({ label, result, comment: typeof comment === "string" ? comment : undefined });
  }
  return items;
}

// Only callable while equipment.status === OUT_OF_SERVICE (enforced in the
// service, not just the UI) — this is how a failed item's corrective-action
// -> repair -> reinspection chain is required before equipment can become
// AVAILABLE again.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  const record = await prisma.hseEquipment.findUnique({ where: { id }, select: { projectId: true } });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await assertProjectMember(user, record.projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const items = parseItems(body?.items);
  if (!items) {
    return NextResponse.json({ error: "A valid checklist (items[]) is required." }, { status: 400 });
  }

  try {
    const inspection = await requestReinspection({
      projectId: record.projectId,
      equipmentId: id,
      actingUserId: user.id,
      items,
    });
    return NextResponse.json({ id: inspection.id, inspectionNumber: inspection.inspectionNumber, result: inspection.result });
  } catch (err) {
    if (err instanceof EquipmentError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenPermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error(`POST /api/hse/equipment/${id}/reinspect failed:`, err);
    return NextResponse.json({ error: "Failed to record the reinspection. Please try again." }, { status: 500 });
  }
}
