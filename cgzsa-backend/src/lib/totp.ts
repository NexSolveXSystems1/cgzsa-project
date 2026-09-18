import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Time-based one-time passwords, RFC 6238, implemented directly.
 *
 * Design review §14: two-factor authentication available to all, enforceable
 * for Administrator and above. Written here rather than pulled from a library
 * because it is thirty lines and one fewer dependency to keep patched.
 */

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PERIOD = 30;
const DIGITS = 6;
const WINDOW = 1; // accept the previous and next step, for clock drift

export function newSecret(bytes = 20): string {
  const buf = randomBytes(bytes);
  let bits = "";
  for (const b of buf) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function base32Decode(secret: string): Buffer {
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const ch of clean) {
    const v = B32.indexOf(ch);
    if (v < 0) continue;
    bits += v.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function code(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

export function currentCode(secret: string, at = Date.now()): string {
  return code(secret, Math.floor(at / 1000 / PERIOD));
}

export type TotpResult = { ok: false } | { ok: true; step: number };

/**
 * Verify a code and report which time step it belonged to.
 *
 * The step matters: RFC 6238 §5.2 requires that a code be accepted at most once,
 * and this function previously returned a bare boolean with no record of what had
 * been used, so the same code was accepted repeatedly for the ninety seconds the
 * drift window keeps it valid. Callers store the returned step against the user
 * and pass it back as `lastStep`, which makes a replay fail.
 */
export function verifyTotp(
  secret: string,
  token: string,
  opts: { at?: number; lastStep?: number | null } = {},
): TotpResult {
  const at = opts.at ?? Date.now();
  const cleaned = token.replace(/\D/g, "");
  if (cleaned.length !== DIGITS) return { ok: false };
  const step = Math.floor(at / 1000 / PERIOD);

  for (let w = -WINDOW; w <= WINDOW; w++) {
    const candidate = step + w;
    // Already used, or older than one we have already accepted. Checked before
    // the comparison so a replayed code cannot be distinguished by timing.
    if (opts.lastStep != null && candidate <= opts.lastStep) continue;
    const expected = Buffer.from(code(secret, candidate));
    const given = Buffer.from(cleaned);
    // Constant-time, so a wrong code reveals nothing by how long it took.
    if (expected.length === given.length && timingSafeEqual(expected, given)) {
      return { ok: true, step: candidate };
    }
  }
  return { ok: false };
}

export function otpauthUrl(secret: string, email: string, issuer = "CGZSA"): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=${DIGITS}&period=${PERIOD}`;
}
