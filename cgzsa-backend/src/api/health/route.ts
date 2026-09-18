import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { logger } from "@/lib/log";

const log = logger("health");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness and readiness for the container healthcheck and any external monitor.
 *
 * The application had no health endpoint, so an orchestrator could only tell
 * whether the process had exited — not whether it could still serve. A process
 * that is running but cannot reach the database is exactly the state worth
 * restarting, and exactly the state a port check reports as healthy.
 *
 * Deliberately unauthenticated but deliberately uninformative: it reports up or
 * down and nothing about versions, configuration or the error itself.
 */
export async function GET() {
  const started = Date.now();
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json(
      { ok: true, db: "up", ms: Date.now() - started },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    log.error("database unreachable", { err });
    return NextResponse.json(
      { ok: false, db: "down" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
