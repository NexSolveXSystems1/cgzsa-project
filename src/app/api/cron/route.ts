import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { and, eq, lte, isNotNull, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  articles, conversations, contactMessages, loginAttempts, sessions, volunteerApplications,
} from "@/db/schema";
import { buildPassages } from "@/lib/knowledge";
import { purgeExpiredAssets } from "@/app/admin/media/actions";
import { logger } from "@/lib/log";

const log = logger("cron");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Scheduled maintenance. Call once an hour, e.g.
 *   curl -H "authorization: Bearer $CRON_SECRET" https://cgzsa.org/api/cron
 *
 *  - publishes approved articles whose publish time has arrived
 *  - deletes chat transcripts past their twelve-month retention date
 *  - deletes contact messages past twenty-four months
 *  - clears expired sessions
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;

  // Fails closed: in production an unset secret means nobody may run this,
  // rather than everybody. In development it is left open for convenience.
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
    }
  } else {
    const offered = req.headers.get("authorization") ?? "";
    const expected = `Bearer ${secret}`;
    const a = Buffer.from(offered);
    const b = Buffer.from(expected);
    // Constant-time, so the secret cannot be recovered a byte at a time.
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "Not permitted." }, { status: 401 });
    }
  }

  const now = new Date();
  const results: Record<string, number> = {};
  const failures: Record<string, string> = {};

  // Each step is isolated. Previously one statement throwing aborted the whole
  // handler: a foreign-key violation while deleting an expired conversation
  // meant scheduled publishing and session cleanup silently stopped running too,
  // and the operator saw only a 500. Now a failing step is reported by name and
  // the rest still run.
  async function step(name: string, run: () => Promise<number>) {
    try {
      results[name] = await run();
    } catch (err) {
      results[name] = 0;
      failures[name] = err instanceof Error ? err.message : String(err);
      log.error(`${name} failed`, { err });
    }
  }

  await step("published", async () => {
    const due = await db
      .update(articles)
      .set({ status: "PUBLISHED", publishedAt: now })
      .where(and(eq(articles.status, "APPROVED"), isNotNull(articles.publishAt), lte(articles.publishAt, now)))
      .returning({ id: articles.id });
    return due.length;
  });

  await step("conversationsDeleted", async () => {
    const expired = await db
      .delete(conversations)
      .where(lte(conversations.deleteAfter, now))
      .returning({ id: conversations.id });
    return expired.length;
  });

  await step("contactMessagesDeleted", async () => {
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - 24);
    const old = await db
      .delete(contactMessages)
      .where(lt(contactMessages.createdAt, cutoff))
      .returning({ id: contactMessages.id });
    return old.length;
  });

  await step("volunteerApplicationsDeleted", async () => {
    // The privacy policy retention-limits these alongside contact messages, but
    // nothing was deleting them.
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - 24);
    const old = await db
      .delete(volunteerApplications)
      .where(lt(volunteerApplications.createdAt, cutoff))
      .returning({ id: volunteerApplications.id });
    return old.length;
  });

  await step("mediaFilesPurged", async () => {
    // Files for assets soft-deleted more than thirty days ago. Without this the
    // storage volume grew forever and a deleted photograph stayed on disk.
    return purgeExpiredAssets();
  });

  await step("sessionsCleared", async () => {
    const stale = await db.delete(sessions).where(lt(sessions.expiresAt, now)).returning({ id: sessions.id });
    return stale.length;
  });

  await step("loginAttemptsCleared", async () => {
    const cutoff = new Date(now.getTime() - 24 * 3600_000);
    const old = await db
      .delete(loginAttempts)
      .where(lt(loginAttempts.createdAt, cutoff))
      .returning({ id: loginAttempts.id });
    return old.length;
  });

  if (results.published > 0) {
    try {
      await buildPassages();
    } catch (err) {
      failures.reindex = err instanceof Error ? err.message : String(err);
      log.error("reindex failed", { err });
    }
  }

  const failed = Object.keys(failures);
  return NextResponse.json(
    { ok: failed.length === 0, at: now.toISOString(), ...results, ...(failed.length ? { failures } : {}) },
    // 207: the job ran, but not every step succeeded. A monitor watching for a
    // non-2xx would otherwise never learn that retention had stopped working.
    { status: failed.length ? 207 : 200 },
  );
}
