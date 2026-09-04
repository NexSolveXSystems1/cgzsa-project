import { sql } from "drizzle-orm";
import { db } from "@/db";
import { assistantSettings } from "@/db/schema";

/**
 * Charging assistant usage against the monthly cap.
 *
 * `spentThisMonthUsd` was read by the gate in the chat route and displayed on the
 * assistant screen, but no code ever wrote to it — so the cap the README presents
 * as the protection against "a surprise invoice" could never trip, and the screen
 * showed $0.00 of $25 no matter how much had been spent.
 *
 * Prices are per million tokens and will drift. They live here, in one place,
 * with the date they were last checked, because a stale price is a recoverable
 * problem and a silently uncounted one is not. When a model is not listed we
 * charge the most expensive known rate rather than nothing: over-counting stops
 * the assistant early, under-counting produces the invoice this control exists
 * to prevent.
 */

// Checked August 2026. USD per million tokens.
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-3-5-haiku": { input: 0.8, output: 4 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-opus-4-1": { input: 15, output: 75 },
};

const FALLBACK = { input: 15, output: 75 };

function rateFor(model: string) {
  if (!model || model === "extractive" || model === "none") return { input: 0, output: 0 };
  const key = Object.keys(PRICES).find((k) => model.startsWith(k));
  return key ? PRICES[key] : FALLBACK;
}

/** Cost in USD of one exchange. Returns 0 for the local extractive provider. */
export function priceUsd(model: string, inputTokens: number, outputTokens: number): number {
  const rate = rateFor(model);
  return (inputTokens / 1_000_000) * rate.input + (outputTokens / 1_000_000) * rate.output;
}

/**
 * Add to the running monthly total, rolling it over on the first charge of a new
 * calendar month. The reset and the increment are one statement so two concurrent
 * requests cannot both decide they are the first of the month.
 */
export async function recordSpend(usd: number) {
  if (!(usd > 0)) return;
  await db.update(assistantSettings).set({
    spentThisMonthUsd: sql`
      case
        when date_trunc('month', ${assistantSettings.updatedAt}) < date_trunc('month', now())
        then ${usd}
        else ${assistantSettings.spentThisMonthUsd} + ${usd}
      end`,
    updatedAt: new Date(),
  });
}
