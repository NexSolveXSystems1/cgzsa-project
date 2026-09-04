import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => expect(slugify("Access to Safe Drinking Water")).toBe("access-to-safe-drinking-water"));
  it("drops punctuation", () => expect(slugify("Waste, Water & Parks!")).toBe("waste-water-parks"));
  it("collapses repeated separators", () => expect(slugify("a   b---c")).toBe("a-b-c"));
  it("never returns an empty slug", async () => {
    expect(await uniqueSlug("!!!", async () => false)).toBe("item");
  });
});

describe("uniqueSlug", () => {
  it("appends a number when the slug is taken", async () => {
    const taken = new Set(["news", "news-2"]);
    expect(await uniqueSlug("News", async (s) => taken.has(s))).toBe("news-3");
  });
});
