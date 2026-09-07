import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { redirects } from "@/db/schema";
import { logger } from "@/lib/log";

const log = logger("middleware");

/**
 * Security headers.
 *
 * A note on script-src, because the choice here is a real trade-off rather than
 * an oversight.
 *
 * The strongest policy is a per-request nonce with 'strict-dynamic'. That
 * requires every page to be rendered per request, because a nonce cannot be
 * baked into HTML that was generated once at build time and served to everyone.
 * The design review (§15) prioritises static generation precisely so that the
 * public pages load quickly on a Liberian mobile connection, and that matters
 * more here than closing an injection route the application does not leave open:
 *
 *   - React escapes all interpolated content by default
 *   - the one place raw HTML is rendered is editor output, which passes through
 *     the allow-list sanitiser in src/lib/sanitise.ts on the way in and out
 *   - script, iframe, object, embed and svg elements are stripped there
 *
 * So 'unsafe-inline' is accepted for scripts, and the rest of the policy is kept
 * tight: nothing may be loaded from another origin, the page cannot be framed,
 * plugins are refused, and forms can only submit back to this site.
 *
 * If CGZSA later decides the trade should go the other way, the change is to
 * render dynamically and restore the nonce — nothing else in the application
 * depends on this decision.
 */
const isDev = process.env.NODE_ENV !== "production";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

/**
 * The redirect table, cached in process.
 *
 * This lookup previously ran as an uncached query on every public request, which
 * put the database on the critical path for pages that would otherwise have been
 * served from the incremental cache — with PostgreSQL stopped, /news, /contact
 * and /search all returned 500 from this query before the page even ran. It is
 * also a round trip added to every asset request.
 *
 * The table is small and changes only when an editor moves a page, so a short
 * TTL is ample. A database error now falls through to normal rendering instead
 * of failing the request: a missed redirect is a 404, which is recoverable; a
 * site-wide 500 is not.
 */
type Hop = { to: string; code: number };
const REDIRECT_TTL_MS = 60_000;
let redirectCache: { at: number; map: Map<string, Hop> } | null = null;

async function lookupRedirect(pathname: string): Promise<Hop | null> {
  const now = Date.now();
  if (!redirectCache || now - redirectCache.at > REDIRECT_TTL_MS) {
    try {
      const rows = await db.select().from(redirects);
      redirectCache = {
        at: now,
        map: new Map(rows.map((r) => [r.from, { to: r.to, code: r.code }])),
      };
    } catch (err) {
      log.error("could not load redirects", { err });
      // Keep serving from a stale copy if we have one; otherwise carry on
      // without redirects rather than failing every request on the site.
      if (!redirectCache) return null;
      redirectCache.at = now;
    }
  }
  return redirectCache.map.get(pathname) ?? null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // A published address must never break. This runs before the incremental
  // cache, so a moved page redirects immediately rather than serving a stale
  // copy until the cache expires (design review §13).
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api") && pathname !== "/") {
    const hop = await lookupRedirect(pathname);
    // Local paths only, checked again on the way out. A row written before this
    // rule existed, or by some other route into the database, must not be able
    // to send a visitor to another origin.
    if (hop && hop.to.startsWith("/") && !hop.to.startsWith("//")) {
      return NextResponse.redirect(new URL(hop.to, req.url), hop.code === 308 ? 308 : 301);
    }
  }

  const res = NextResponse.next();

  res.headers.set("Content-Security-Policy", CSP);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  // The administration area is never indexed and never cached.
  if (req.nextUrl.pathname.startsWith("/admin")) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "no-store, must-revalidate");
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
