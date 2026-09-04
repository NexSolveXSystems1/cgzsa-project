import { describe, it, expect } from "vitest";
import { sanitiseHtml } from "@/lib/sanitise";
import { reference } from "@/lib/format";
import { clientAddress, rateLimitKey } from "@/lib/request";
import { isLocalPath } from "@/lib/url";
import { mayEdit, mayView } from "@/lib/ownership";
import { priceUsd } from "@/lib/assistant-cost";
import { officeIsOpen, parseOfficeDays } from "@/lib/settings";
import type { Actor } from "@/lib/auth";

/**
 * One test per defect found in the audit, written so that reintroducing the
 * defect fails the suite. Each name states what used to happen.
 */

const headers = (map: Record<string, string>) => ({
  get: (name: string) => map[name.toLowerCase()] ?? null,
});

function actor(id: string, perms: string[]): Actor {
  return {
    id, name: "Test", email: "t@cgzsa.org", role: "CONTRIBUTOR",
    roleLabel: "Contributor", rank: 20, permissions: new Set(perms),
  };
}

describe("F-1 reference collisions lost contact messages", () => {
  it("draws from a keyspace large enough that 20,000 references do not collide", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20_000; i++) seen.add(reference("MSG"));
    // The old four-digit generator collided after a median of 145.
    expect(seen.size).toBe(20_000);
  });

  it("keeps the readable prefix-year shape", () => {
    expect(reference("MSG")).toMatch(/^MSG-\d{4}-[0-9A-HJKMNP-TV-Z]{8}$/);
  });

  it("omits the characters that are misread when a reference is read aloud", () => {
    const body = reference("VOL").split("-")[2];
    expect(body).not.toMatch(/[ILOU]/);
  });
});

describe("F-7 the sanitiser let an unterminated tag through", () => {
  it("escapes a bare '<script' that has no closing bracket", () => {
    const out = sanitiseHtml("Normal paragraph.<script");
    expect(out).not.toContain("<script");
    expect(out).toContain("&lt;script");
  });

  it("escapes a truncated tag left behind by removing a nested one", () => {
    expect(sanitiseHtml("<scr<script>ipt>alert(1)</script>")).not.toMatch(/<[a-z]/i);
  });

  it("removes comments, so an unterminated one cannot swallow the page", () => {
    expect(sanitiseHtml("<!--")).toBe("");
    expect(sanitiseHtml('<!--<a href="/x">--><p>after</p>')).toBe("<p>after</p>");
  });

  it("still strips scripts, event handlers and javascript: urls", () => {
    expect(sanitiseHtml("<script>alert(1)</script>")).toBe("");
    expect(sanitiseHtml("<img src=x onerror=alert(1)>")).toBe("");
    expect(sanitiseHtml('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
  });

  it("refuses a protocol-relative link, which the leading-slash test used to allow", () => {
    expect(sanitiseHtml('<a href="//evil.example/steal">x</a>')).toBe("<a>x</a>");
  });

  it("keeps the markup an editor is meant to be able to write", () => {
    const out = sanitiseHtml('<p>A <strong>bold</strong> <a href="/about">link</a>.</p>');
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain('href="/about"');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
  });

  it("leaves no '<' that is not an allow-listed tag", () => {
    const payloads = [
      "<script", "<scr<script>ipt>", "<!--", "<?php echo 1;",
      "<svg/onload=alert(1)", "<iframe", "<a href=", "5 < 6 and 7 > 3",
    ];
    for (const p of payloads) {
      const out = sanitiseHtml(p);
      const stray = out.match(/<(?!\/?(?:p|br|strong|b|em|i|u|h2|h3|ul|ol|li|blockquote|a)[\s>])/g);
      expect(stray, `payload: ${p} → ${out}`).toBeNull();
    }
  });
});

describe("F-10 rate limits were bypassable by spoofing X-Forwarded-For", () => {
  it("ignores the leftmost value the client wrote, behind one proxy", () => {
    process.env.TRUSTED_PROXY_COUNT = "1";
    const h = headers({ "x-forwarded-for": "10.0.0.99, 203.0.113.7" });
    // 10.0.0.99 is what the attacker supplied; 203.0.113.7 is what the proxy saw.
    expect(clientAddress(h)).toBe("203.0.113.7");
  });

  it("steps one further left for each additional trusted proxy", () => {
    process.env.TRUSTED_PROXY_COUNT = "2";
    const h = headers({ "x-forwarded-for": "10.0.0.99, 198.51.100.4, 203.0.113.7" });
    expect(clientAddress(h)).toBe("198.51.100.4");
  });

  it("ignores the header entirely when nothing is in front of the app", () => {
    process.env.TRUSTED_PROXY_COUNT = "0";
    expect(clientAddress(headers({ "x-forwarded-for": "10.0.0.99" }))).toBeNull();
  });

  it("prefers a platform header the client cannot forge", () => {
    process.env.TRUSTED_PROXY_COUNT = "1";
    process.env.CLIENT_IP_HEADER = "cf-connecting-ip";
    const h = headers({ "cf-connecting-ip": "203.0.113.9", "x-forwarded-for": "10.0.0.99" });
    expect(clientAddress(h)).toBe("203.0.113.9");
    delete process.env.CLIENT_IP_HEADER;
  });

  it("takes the only entry when exactly one proxy wrote it", () => {
    process.env.TRUSTED_PROXY_COUNT = "1";
    // No spoofing: the proxy appended the client's address to an empty header.
    expect(clientAddress(headers({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("fails closed when the chain is shorter than the proxies we expect", () => {
    // Fewer hops than configured means the request did not come through our
    // infrastructure, so nothing in the header is trustworthy. Returning the
    // leftmost value here would trust exactly the bytes the client chose.
    process.env.TRUSTED_PROXY_COUNT = "3";
    expect(clientAddress(headers({ "x-forwarded-for": "10.0.0.99" }))).toBeNull();
    process.env.TRUSTED_PROXY_COUNT = "1";
  });

  it("rejects a value that is not an address", () => {
    process.env.TRUSTED_PROXY_COUNT = "1";
    expect(clientAddress(headers({ "x-forwarded-for": "not-an-ip" }))).toBeNull();
  });

  it("puts unidentifiable callers in one shared bucket, not their own", () => {
    expect(rateLimitKey("contact", null)).toBe("contact:unidentified");
    expect(rateLimitKey("contact", null)).toBe(rateLimitKey("contact", null));
  });
});

describe("F-22 redirects could point at another origin", () => {
  it("accepts a path on this site", () => {
    expect(isLocalPath("/news/something")).toBe(true);
  });

  it("refuses an absolute url", () => {
    expect(isLocalPath("https://evil.example/phish")).toBe(false);
  });

  it("refuses a protocol-relative url, which starts with a slash but is not local", () => {
    expect(isLocalPath("//evil.example/phish")).toBe(false);
  });

  it("refuses a backslash, which some clients normalise to a slash", () => {
    expect(isLocalPath("/\\evil.example")).toBe(false);
  });
});

describe("F-13 contributors could not edit their own drafts", () => {
  const author = actor("u1", ["content.create"]);
  const editor = actor("u2", ["content.create", "content.edit_others"]);

  it("lets an author edit their own draft", () => {
    expect(mayEdit(author, { authorId: "u1", status: "DRAFT" })).toBe(true);
  });

  it("refuses somebody else's draft", () => {
    expect(mayEdit(author, { authorId: "u9", status: "DRAFT" })).toBe(false);
  });

  it("refuses their own work once it has entered review", () => {
    expect(mayEdit(author, { authorId: "u1", status: "IN_REVIEW" })).toBe(false);
    expect(mayEdit(author, { authorId: "u1", status: "PUBLISHED" })).toBe(false);
  });

  it("lets content.edit_others edit anything in any state", () => {
    expect(mayEdit(editor, { authorId: "u9", status: "PUBLISHED" })).toBe(true);
  });

  it("shows an author their own draft and everyone published work", () => {
    expect(mayView(author, { authorId: "u1", status: "DRAFT" })).toBe(true);
    expect(mayView(author, { authorId: "u9", status: "DRAFT" })).toBe(false);
    expect(mayView(author, { authorId: "u9", status: "PUBLISHED" })).toBe(true);
  });
});

describe("F-11 the assistant spending cap was never charged", () => {
  it("charges nothing for the local extractive provider", () => {
    expect(priceUsd("extractive", 0, 0)).toBe(0);
    expect(priceUsd("none", 1000, 1000)).toBe(0);
  });

  it("charges a known model at its published rate", () => {
    // 1M input at $0.80 plus 1M output at $4.00.
    expect(priceUsd("claude-3-5-haiku-latest", 1_000_000, 1_000_000)).toBeCloseTo(4.8, 6);
  });

  it("charges an unknown model at the most expensive rate rather than nothing", () => {
    // Over-counting stops the assistant early; under-counting produces the
    // invoice the cap exists to prevent.
    expect(priceUsd("some-future-model", 1_000_000, 0)).toBeGreaterThan(0);
  });
});

describe("F-47 the office-days setting was editable and did nothing", () => {
  // 2026-08-29 is a Saturday; 2026-08-27 a Thursday.
  const saturday = new Date("2026-08-29T10:00:00Z");
  const thursday = new Date("2026-08-27T10:00:00Z");

  it("parses a range", () => {
    expect([...parseOfficeDays("Monday to Friday")].sort()).toEqual([1, 2, 3, 4, 5]);
    expect([...parseOfficeDays("Mon-Sat")].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("parses a list", () => {
    expect([...parseOfficeDays("Mon, Tue, Wed")].sort()).toEqual([1, 2, 3]);
    expect([...parseOfficeDays("Saturday and Sunday")].sort()).toEqual([0, 6]);
  });

  it("falls back to weekdays rather than to always-open", () => {
    // Telling a visitor the office is open when it is not is the worse error.
    expect([...parseOfficeDays("gibberish")].sort()).toEqual([1, 2, 3, 4, 5]);
    expect([...parseOfficeDays("")].sort()).toEqual([1, 2, 3, 4, 5]);
    expect([...parseOfficeDays(null)].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("honours a Saturday that the setting says is a working day", () => {
    // The weekend used to be hardcoded, so this was false whatever was configured.
    expect(officeIsOpen("08:00", "17:00", saturday, "Monday to Saturday")).toBe(true);
    expect(officeIsOpen("08:00", "17:00", saturday, "Monday to Friday")).toBe(false);
  });

  it("still respects opening hours", () => {
    expect(officeIsOpen("08:00", "17:00", thursday, "Monday to Friday")).toBe(true);
    expect(officeIsOpen("08:00", "17:00", new Date("2026-08-27T19:00:00Z"), "Monday to Friday")).toBe(false);
  });

  it("evaluates in the configured timezone", () => {
    process.env.OFFICE_TIMEZONE = "Pacific/Auckland";   // UTC+12, so 10:00Z is 22:00 local
    expect(officeIsOpen("08:00", "17:00", thursday, "Monday to Friday")).toBe(false);
    process.env.OFFICE_TIMEZONE = "UTC";
    expect(officeIsOpen("08:00", "17:00", thursday, "Monday to Friday")).toBe(true);
    delete process.env.OFFICE_TIMEZONE;
  });

  it("does not throw on an invalid timezone", () => {
    process.env.OFFICE_TIMEZONE = "Not/AZone";
    expect(() => officeIsOpen("08:00", "17:00", thursday, "Monday to Friday")).not.toThrow();
    delete process.env.OFFICE_TIMEZONE;
  });
});
