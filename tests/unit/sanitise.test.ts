import { describe, expect, it } from "vitest";
import { sanitiseHtml, htmlToText } from "@/lib/sanitise";

describe("sanitiseHtml", () => {
  it("keeps the tags an editor is allowed to use", () => {
    const input = "<p>Hello <strong>world</strong></p><h2>Heading</h2><ul><li>One</li></ul>";
    expect(sanitiseHtml(input)).toBe(input);
  });

  it("removes a script element and everything inside it", () => {
    const out = sanitiseHtml('<p>Safe</p><script>alert("xss")</script>');
    expect(out).toBe("<p>Safe</p>");
    expect(out).not.toContain("alert");
  });

  it("removes event handler attributes", () => {
    const out = sanitiseHtml('<p onclick="steal()">Text</p>');
    expect(out).toBe("<p>Text</p>");
  });

  it("refuses a javascript: link but keeps the text", () => {
    const out = sanitiseHtml('<a href="javascript:alert(1)">Click</a>');
    expect(out).not.toContain("javascript:");
    expect(out).toContain("Click");
  });

  it("refuses a data: link", () => {
    expect(sanitiseHtml('<a href="data:text/html,<script>x</script>">x</a>')).not.toContain("data:");
  });

  it("keeps an ordinary link and hardens it", () => {
    const out = sanitiseHtml('<a href="https://example.org">Example</a>');
    expect(out).toContain('href="https://example.org"');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
  });

  it("strips an iframe and an svg", () => {
    expect(sanitiseHtml('<iframe src="//evil"></iframe><svg onload="x"></svg>')).toBe("");
  });

  it("drops unknown tags but keeps their text", () => {
    expect(sanitiseHtml("<marquee>Hello</marquee>")).toBe("Hello");
  });
});

describe("htmlToText", () => {
  it("turns block tags into paragraph breaks", () => {
    expect(htmlToText("<p>One</p><p>Two</p>")).toBe("One\n\nTwo");
  });
  it("decodes the common entities", () => {
    expect(htmlToText("<p>Tom &amp; Jerry</p>")).toBe("Tom & Jerry");
  });
});
