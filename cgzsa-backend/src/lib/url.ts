/**
 * A redirect target must be a path on this site.
 *
 * The stored value was passed to `new URL(to, req.url)` in proxy with no
 * validation, so an absolute URL sent visitors to another origin — a phishing
 * aid hosted on the charity's own domain, and a reputation problem with search
 * engines and mail filters.
 *
 * Three things have to be refused, not one:
 *   https://evil.example   an absolute URL
 *   //evil.example         protocol-relative: starts with a slash, not local
 *   /\evil.example         a backslash some clients normalise to a slash
 *
 * Kept in its own module, with no database import, so it can be unit-tested and
 * called from proxy, a server action and a route handler alike.
 */
export function isLocalPath(to: string): boolean {
  return to.startsWith("/") && !to.startsWith("//") && !to.includes("\\");
}
