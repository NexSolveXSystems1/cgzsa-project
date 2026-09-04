/**
 * Server-side HTML sanitiser.
 *
 * Design review §9: rich text is sanitised against an allow-list before storage
 * and again before render. Anything not on the list is discarded, including all
 * attributes except a small set on links.
 *
 * Two defects were found in the original and are fixed here.
 *
 * First, every pattern required a closing ">", so a fragment such as "<script"
 * with no ">" matched nothing and passed through untouched. A browser meeting
 * "<script" treats everything up to the next ">" anywhere later in the document
 * as attributes and everything after it as script content until a matching
 * "</script>" — which swallows the rest of the page, and with 'unsafe-inline' in
 * the script-src policy can end in execution. Any "<" that does not begin a
 * complete, allow-listed tag is now escaped rather than passed through.
 *
 * Second, HTML comments were left intact, so an unterminated "<!--" could
 * comment out the remainder of the page.
 *
 * The allow-list approach is deliberately narrow: a parser-based sanitiser would
 * be more robust still, and is worth adopting if the editor ever needs tables,
 * images or embeds. While the accepted set is this small, an allow-list applied
 * to every tag and every attribute is defensible — but it must be applied to
 * every "<", which is what the final pass below guarantees.
 */
const ALLOWED = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "h2", "h3", "ul", "ol", "li", "blockquote", "a",
]);

const VOID_ELEMENTS = new Set(["br"]);

export function sanitiseHtml(input: string): string {
  let out = input;

  // Remove whole dangerous elements including their contents.
  out = out.replace(/<(script|style|iframe|object|embed|form|svg|math)[\s\S]*?<\/\1>/gi, "");
  out = out.replace(/<(script|style|iframe|object|embed|form|svg|math)[^>]*\/?>/gi, "");

  // Comments, including unterminated ones and the CDATA and doctype forms.
  out = out.replace(/<!--[\s\S]*?-->/g, "");
  out = out.replace(/<![\s\S]*?>/g, "");
  out = out.replace(/<!--[\s\S]*$/g, "");
  out = out.replace(/<\?[\s\S]*?(\?>|$)/g, "");

  // Then walk every remaining complete tag.
  out = out.replace(/<\/?([a-zA-Z0-9-]+)([^>]*)>/g, (match, rawName: string, rawAttrs: string) => {
    const name = rawName.toLowerCase();
    if (!ALLOWED.has(name)) return "";
    if (match.startsWith("</")) return VOID_ELEMENTS.has(name) ? "" : `</${name}>`;

    if (name === "a") {
      const href = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(rawAttrs);
      const value = (href?.[2] ?? href?.[3] ?? href?.[4] ?? "").trim();
      // Only ordinary web and mail addresses, and only paths on this site.
      // A protocol-relative "//evil.example" is not a local path, so the second
      // test rejects it rather than letting the leading slash carry it through.
      const local = value.startsWith("/") && !value.startsWith("//");
      const safe = local || /^(https?:\/\/|mailto:)/i.test(value) ? value : "";
      return safe
        ? `<a href="${escapeAttr(safe)}" rel="noopener noreferrer nofollow">`
        : "<a>";
    }
    return name === "br" ? "<br>" : `<${name}>`;
  });

  // Anything still holding a "<" is not a tag we produced above, because every
  // complete tag has already been rewritten or removed. Escape it, so a stray
  // or truncated "<script" becomes text instead of markup.
  out = out.replace(/<(?!\/?(?:p|br|strong|b|em|i|u|h2|h3|ul|ol|li|blockquote|a)(?:\s[^<>]*)?>)/g, "&lt;");

  return out.trim();
}

function escapeAttr(v: string) {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Sanitise on the way out as well as on the way in.
 *
 * The two render sites passed the stored value straight to
 * dangerouslySetInnerHTML, so anything that reached the column by another route
 * — a seed, a restore, a future action that forgets the input filter — was
 * rendered raw. Calling this at the render site costs a few microseconds and
 * removes a whole class of "but how did that get into the database" incident.
 */
export function renderSafeHtml(stored: string): string {
  return sanitiseHtml(stored);
}

/** Plain text from HTML, for excerpts and the assistant's index. */
export function htmlToText(html: string) {
  return html
    .replace(/<\/(p|h2|h3|li|blockquote)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
