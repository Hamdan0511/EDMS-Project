import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Readiness: can this instance actually serve traffic right now? Checks the
 * one hard dependency every request path needs — the database. Never
 * returns the underlying error message/stack (could leak connection
 * details); failures are logged server-side only.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    logger.error("READINESS_CHECK_FAILED", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
