import { NextResponse } from "next/server";

/**
 * Liveness: is this process running at all? No dependency checks on
 * purpose — an orchestrator uses this to decide whether to restart the
 * container, and a slow/unreachable database must never make a healthy
 * process look dead. See /api/health/ready for the dependency check.
 */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
