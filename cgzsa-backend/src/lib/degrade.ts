import { logger } from "@/lib/log";

const log = logger("degrade");

/**
 * Graceful degradation for pages whose content comes from the database.
 *
 * With PostgreSQL stopped, /news and /search returned HTTP 500 and the framework
 * error shell — a page that is blank until JavaScript loads and the client-side
 * error boundary renders. On the mobile connections this site is explicitly
 * built for, that is a blank screen for several seconds and then an error, which
 * is a worse experience than the honest one: the page's own chrome, and a
 * sentence saying that this section cannot be loaded right now.
 *
 * These helpers let a listing page keep rendering its header, navigation and
 * search box when only the list itself is unavailable. They are for reads that
 * have a sensible empty state, never for writes and never where an empty result
 * would be mistaken for a real answer — a form submission must still fail
 * loudly rather than quietly appearing to succeed.
 */

export type Degraded<T> = { data: T; ok: true } | { data: T; ok: false };

/**
 * Run a read, falling back to `whenUnavailable` if it throws.
 *
 * The `ok` flag lets the page tell the two situations apart: there is genuinely
 * nothing here, or we could not find out. Those need different words on screen.
 */
export async function tryRead<T>(
  label: string,
  read: () => Promise<T>,
  whenUnavailable: T,
): Promise<Degraded<T>> {
  try {
    return { data: await read(), ok: true };
  } catch (err) {
    log.error("read unavailable, serving fallback", { what: label, err });
    return { data: whenUnavailable, ok: false };
  }
}
