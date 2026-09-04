import { permanentRedirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { redirects } from "@/db/schema";

/**
 * A published address must never break (design review §13). Call this before
 * notFound() on any route whose slug can change.
 */
export async function redirectIfMoved(path: string): Promise<void> {
  const [hop] = await db.select().from(redirects).where(eq(redirects.from, path)).limit(1);
  if (hop) permanentRedirect(hop.to);
}
