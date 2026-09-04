export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function formatTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function relative(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)} min`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} h`;
  return `${Math.floor(secs / 86400)} d`;
}

/**
 * Public reference numbers (MSG-2026-K7F3Q2NB).
 *
 * The previous implementation drew a four-digit number from Math.random, giving
 * a keyspace of 9,000 per prefix per year against a UNIQUE column. In testing,
 * 200 contact submissions produced three collisions, each one a lost message and
 * an HTTP 500 for the visitor. This uses a cryptographic source over a
 * Crockford-style alphabet with the ambiguous characters (I, L, O, U) removed,
 * so a reference can be read aloud without confusion.
 *
 * Eight characters over 32 symbols is 2^40 — about 1.1 × 10^12 — which puts the
 * first expected collision beyond a million references per prefix per year.
 * insertWithReference() below still retries, because "vanishingly unlikely" is
 * not the same as "impossible" and a lost enquiry is not an acceptable outcome.
 */
const REF_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const REF_LENGTH = 8;

export function reference(prefix: string) {
  const bytes = new Uint8Array(REF_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += REF_ALPHABET[b % REF_ALPHABET.length];
  return `${prefix}-${new Date().getFullYear()}-${out}`;
}

/** PostgreSQL's unique_violation. */
const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err &&
    (err as { code?: unknown }).code === UNIQUE_VIOLATION;
}

/**
 * Run an insert that carries a generated reference, retrying with a fresh one if
 * the database rejects it as a duplicate. Any other error is rethrown untouched.
 */
export async function insertWithReference<T>(
  prefix: string,
  insert: (ref: string) => Promise<T>,
  attempts = 5,
): Promise<{ ref: string; result: T }> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    const ref = reference(prefix);
    try {
      return { ref, result: await insert(ref) };
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      lastError = err;
    }
  }
  throw lastError;
}
