import { NextResponse } from "next/server";
import { getCurrentUser, destroySession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) {
    await logAudit({ userId: user.id, action: "LOGOUT", entityType: "User", entityId: user.id });
  }
  return NextResponse.json({ ok: true });
}
