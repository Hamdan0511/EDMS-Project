import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const search = await prisma.savedSearch.findFirst({ where: { id, userId: user.id } });
  if (!search) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.savedSearch.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
