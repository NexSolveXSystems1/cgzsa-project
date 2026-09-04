import { describe, it, expect } from "vitest";
import { currentCode, newSecret, otpauthUrl, verifyTotp } from "@/lib/totp";

describe("totp", () => {
  const secret = newSecret();

  it("produces a base32 secret of the expected length", () => {
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
  });

  it("accepts the current code", () => {
    expect(verifyTotp(secret, currentCode(secret)).ok).toBe(true);
  });

  it("accepts one step of clock drift in each direction", () => {
    const now = Date.now();
    expect(verifyTotp(secret, currentCode(secret, now - 30_000), { at: now }).ok).toBe(true);
    expect(verifyTotp(secret, currentCode(secret, now + 30_000), { at: now }).ok).toBe(true);
  });

  it("refuses a code from four minutes ago", () => {
    const now = Date.now();
    expect(verifyTotp(secret, currentCode(secret, now - 240_000), { at: now }).ok).toBe(false);
  });

  it("refuses a malformed code", () => {
    expect(verifyTotp(secret, "abc").ok).toBe(false);
    expect(verifyTotp(secret, "12345").ok).toBe(false);
    expect(verifyTotp(secret, "").ok).toBe(false);
  });

  it("reports the step a code belonged to, so it can be recorded", () => {
    const now = Date.now();
    const result = verifyTotp(secret, currentCode(secret, now), { at: now });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.step).toBe(Math.floor(now / 1000 / 30));
  });

  it("refuses a code that has already been used (RFC 6238 §5.2)", () => {
    const now = Date.now();
    const code = currentCode(secret, now);
    const first = verifyTotp(secret, code, { at: now });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    // Same code, now that the step has been recorded against the user.
    expect(verifyTotp(secret, code, { at: now, lastStep: first.step }).ok).toBe(false);
  });

  it("still accepts the next step after one has been consumed", () => {
    const now = Date.now();
    const used = verifyTotp(secret, currentCode(secret, now), { at: now });
    expect(used.ok).toBe(true);
    if (!used.ok) return;
    const later = now + 30_000;
    expect(verifyTotp(secret, currentCode(secret, later), { at: later, lastStep: used.step }).ok).toBe(true);
  });

  it("refuses a replay of an earlier step within the drift window", () => {
    const now = Date.now();
    const previous = currentCode(secret, now - 30_000);
    const consumed = Math.floor(now / 1000 / 30);
    expect(verifyTotp(secret, previous, { at: now, lastStep: consumed }).ok).toBe(false);
  });

  it("builds an otpauth url an authenticator app can read", () => {
    const url = otpauthUrl(secret, "person@cgzsa.org");
    expect(url).toContain("otpauth://totp/");
    expect(url).toContain(`secret=${secret}`);
    expect(url).toContain("issuer=CGZSA");
  });
});
