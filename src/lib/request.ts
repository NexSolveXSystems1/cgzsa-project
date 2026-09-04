/**
 * Resolving the client's address.
 *
 * `X-Forwarded-For` is a list the client can start. A request that arrives
 * carrying `X-Forwarded-For: 10.0.0.1` and then passes through one reverse proxy
 * reaches the application as `10.0.0.1, <real address>` — so taking the leftmost
 * value, as this application previously did everywhere, hands the rate limiter a
 * value the attacker chose. In testing, eight contact submissions with a rotating
 * leftmost value were all accepted; the same eight from one address were limited
 * after five.
 *
 * The correct value is counted from the RIGHT: the rightmost entry was written by
 * the proxy nearest to us and cannot be forged, and each further hop leftward is
 * only as trustworthy as the proxy that wrote it. TRUSTED_PROXY_COUNT says how
 * many proxies sit in front of the application, so we know how far left to look.
 *
 *   0  no proxy — ignore the header entirely and use the socket address
 *   1  one reverse proxy (nginx, Caddy, a single load balancer) — the default
 *   2  a CDN in front of a reverse proxy
 *
 * A platform header that the platform sets and clients cannot forge is better
 * still, so CLIENT_IP_HEADER is honoured first when it is configured
 * (`cf-connecting-ip`, `true-client-ip`, `fly-client-ip` and so on).
 *
 * When no address can be established we return null rather than a plausible
 * fallback, and callers put those requests in one shared bucket. Failing closed
 * onto a shared limit is the safe direction: an unidentifiable client gets a
 * limit, not an exemption.
 */

function trustedProxyCount(): number {
  const raw = process.env.TRUSTED_PROXY_COUNT;
  if (raw === undefined) return 1;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 1;
}

/** Strip a port and IPv6 brackets, and reject anything that is not an address. */
function normalise(value: string | undefined): string | null {
  if (!value) return null;
  let v = value.trim();
  if (!v) return null;
  if (v.startsWith("[")) {
    const close = v.indexOf("]");
    if (close > 0) v = v.slice(1, close);
  } else if (v.includes(".") && v.includes(":")) {
    v = v.slice(0, v.indexOf(":")); // IPv4 with a port
  }
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^[0-9a-fA-F:]+$/;
  if (!ipv4.test(v) && !ipv6.test(v)) return null;
  return v;
}

type HeaderBag = { get(name: string): string | null };

/**
 * The client's address, or null when it cannot be established.
 * Never trust the return value for authorisation — it is for rate limiting,
 * abuse investigation and the audit log.
 */
export function clientAddress(h: HeaderBag): string | null {
  const platformHeader = process.env.CLIENT_IP_HEADER;
  if (platformHeader) {
    const direct = normalise(h.get(platformHeader) ?? undefined);
    if (direct) return direct;
  }

  const hops = trustedProxyCount();
  if (hops === 0) return normalise(h.get("x-real-ip") ?? undefined);

  const chain = (h.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!chain.length) return normalise(h.get("x-real-ip") ?? undefined);

  // Each trusted proxy appends one entry, so in a correct deployment the last
  // `hops` entries were written by our own infrastructure and the client's real
  // address sits at chain.length - hops. Anything to the left of that the client
  // supplied and we ignore.
  //
  // A chain shorter than `hops` means the request did not pass through the
  // proxies we were told to expect — a misconfiguration, or a request that
  // reached the app directly. Neither gives a trustworthy address, so return
  // null and let the caller put it in the shared bucket. Returning the leftmost
  // value here would trust exactly the bytes the client chose.
  const index = chain.length - hops;
  if (index < 0) return null;
  return normalise(chain[index]);
}

/**
 * A rate-limit bucket key. Requests whose address cannot be established share a
 * single bucket rather than each receiving their own unlimited allowance.
 */
export function rateLimitKey(scope: string, address: string | null): string {
  return `${scope}:${address ?? "unidentified"}`;
}
