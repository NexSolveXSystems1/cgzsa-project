import { cache } from "react";
import { db } from "@/db";
import { assistantSettings, siteSettings } from "@/db/schema";
import { logger } from "@/lib/log";

const log = logger("settings");

type SiteSettings = typeof siteSettings.$inferSelect;
type AssistantSettings = typeof assistantSettings.$inferSelect;

/**
 * Site and assistant settings, cached in process.
 *
 * These are single-row tables that change when somebody edits the settings
 * screen — perhaps a few times a year — and they were being read from the
 * database on every request that renders the header or footer, which is every
 * page on the site. React's cache() deduplicated them within one render but not
 * across requests.
 *
 * The second reason for the cache is availability. Every public page's layout
 * calls getSiteSettings(), so a database blip took down pages whose own content
 * was static or cached — a whole-site outage caused by one unavailable row.
 * Holding the last known good copy means the site keeps serving its own name,
 * contact details and navigation while the database recovers.
 *
 * revalidatePath already refreshes the rendered pages when settings are saved;
 * bust() is called from the settings action so the cached copy goes too.
 */

const TTL_MS = 60_000;

type Cached<T> = { value: T; at: number };
const globalForSettings = globalThis as unknown as {
  __siteSettings?: Cached<SiteSettings>;
  __assistantSettings?: Cached<AssistantSettings>;
};

async function readThrough<T>(
  slot: "__siteSettings" | "__assistantSettings",
  read: () => Promise<T | undefined>,
  missing: string,
): Promise<T> {
  const held = globalForSettings[slot] as Cached<T> | undefined;
  const fresh = held && Date.now() - held.at < TTL_MS;
  if (fresh) return held.value;

  try {
    const row = await read();
    if (!row) throw new Error(missing);
    globalForSettings[slot] = { value: row, at: Date.now() } as never;
    return row;
  } catch (err) {
    // Serve the last known good copy rather than failing the whole page. If we
    // have never had one, the error is real and must surface.
    if (held) {
      log.error(`refresh failed, serving cached copy`, { err });
      held.at = Date.now();
      return held.value;
    }
    throw err;
  }
}

export const getSiteSettings = cache(async (): Promise<SiteSettings> =>
  readThrough(
    "__siteSettings",
    async () => (await db.select().from(siteSettings))[0],
    "Site settings missing. Run: npm run db:seed",
  ),
);

export const getAssistantSettings = cache(async (): Promise<AssistantSettings> =>
  readThrough(
    "__assistantSettings",
    async () => (await db.select().from(assistantSettings))[0],
    "Assistant settings missing. Run: npm run db:seed",
  ),
);

/** Drop the cached copies, so a save is visible immediately. */
export function bustSettingsCache() {
  delete globalForSettings.__siteSettings;
  delete globalForSettings.__assistantSettings;
}

/**
 * Which days the office is open, parsed from the free-text setting.
 *
 * `officeDays` is editable on the assistant screen, saved to the database, and
 * was read by nothing — so an administrator could set "Monday to Saturday",
 * see it saved, and have Saturday still treated as closed. The weekend was
 * hardcoded.
 *
 * The stored value is free text because that is what the schema has, so this
 * parses tolerantly: ranges ("Monday to Friday", "Mon-Sat"), lists
 * ("Mon, Tue, Wed") and single days all work. Anything it cannot make sense of
 * falls back to Monday–Friday rather than to "always open", because a visitor
 * told the office is open when it is not is worse than the reverse.
 *
 * Returns a set of JavaScript day numbers, where 0 is Sunday.
 */
const DAY_NAMES: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

const WEEKDAYS = new Set([1, 2, 3, 4, 5]);

export function parseOfficeDays(value: string | null | undefined): Set<number> {
  if (!value) return new Set(WEEKDAYS);
  const text = value.toLowerCase().trim();

  // A range: "monday to friday", "mon - sat", "monday–friday".
  const range = /([a-z]+)\s*(?:to|through|until|-|–|—)\s*([a-z]+)/.exec(text);
  if (range) {
    const from = DAY_NAMES[range[1]];
    const to = DAY_NAMES[range[2]];
    if (from !== undefined && to !== undefined) {
      const out = new Set<number>();
      // Walk forward so a range that wraps the week (Saturday to Tuesday)
      // still produces the days somebody meant.
      for (let i = 0, d = from; i < 7; i++, d = (d + 1) % 7) {
        out.add(d);
        if (d === to) break;
      }
      return out;
    }
  }

  // A list: "mon, tue, wed" or "monday and wednesday".
  const named = text.split(/[,;/]|\band\b|\s+/).map((t) => t.trim()).filter(Boolean);
  const out = new Set<number>();
  for (const token of named) {
    const d = DAY_NAMES[token.replace(/[^a-z]/g, "")];
    if (d !== undefined) out.add(d);
  }

  return out.size ? out : new Set(WEEKDAYS);
}

/**
 * Whether the office is open right now.
 *
 * Evaluated in the timezone named by OFFICE_TIMEZONE, defaulting to UTC. Liberia
 * is UTC+0, so the original hardcoded UTC produced correct answers — but by
 * coincidence rather than by decision, and it would have broken silently the day
 * CGZSA operated from anywhere else.
 */
export function officeIsOpen(
  open: string,
  close: string,
  now = new Date(),
  days?: string | null,
) {
  const zone = process.env.OFFICE_TIMEZONE || "UTC";

  let dayName: string;
  let hh: number;
  let mm: number;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    dayName = parts.find((p) => p.type === "weekday")?.value.toLowerCase() ?? "";
    hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    mm = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  } catch {
    // An invalid OFFICE_TIMEZONE must not take the chat widget down.
    log.error("invalid OFFICE_TIMEZONE, falling back to UTC", { zone });
    dayName = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][now.getUTCDay()];
    hh = now.getUTCHours();
    mm = now.getUTCMinutes();
  }

  const today = DAY_NAMES[dayName];
  if (today === undefined || !parseOfficeDays(days).has(today)) return false;

  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  if ([oh, om, ch, cm].some((n) => Number.isNaN(n))) return false;

  const mins = hh * 60 + mm;
  return mins >= oh * 60 + om && mins < ch * 60 + cm;
}
