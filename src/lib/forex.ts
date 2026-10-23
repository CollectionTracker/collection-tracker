import { cache } from "react";
import { asc, desc, gt, lte, max, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { fxRates } from "@/db/schema";
import { BASE_CURRENCY, CURRENCIES, type FxRates, parseRates, resolveRates } from "./currencies";

// ECB reference rates via Frankfurter: free, no API key, published once per working day around 16:00 CET.
const SOURCE = "frankfurter";
const URL_ = `https://api.frankfurter.dev/v1/latest?base=${BASE_CURRENCY}&symbols=${CURRENCIES.filter((c) => c !== BASE_CURRENCY).join(",")}`;

/** After a failed fetch, page loads use stored rates and don't retry for this long. */
const RETRY_AFTER_MS = 60 * 60_000;
const g = globalThis as unknown as { __fxFailedAt?: number };

/** Fetch today's rates and store them under their publication day. Throws when the source is unreachable. */
export async function refreshFxRates() {
  const res = await fetch(URL_, { signal: AbortSignal.timeout(5_000), cache: "no-store" });
  if (!res.ok) throw new Error(`frankfurter ${res.status}`);
  const { day, rates } = parseRates(await res.json());
  const db = await getDb();
  await db
    .insert(fxRates)
    .values(Object.entries(rates).map(([currency, rate]) => ({ day, currency, rate, source: SOURCE })))
    .onConflictDoUpdate({
      target: [fxRates.day, fxRates.currency],
      set: { rate: sql`excluded.rate`, source: sql`excluded.source`, fetchedAt: sql`now()` },
    });
  g.__fxFailedAt = undefined;
  return { day, currencies: Object.keys(rates).length };
}

/** Fetch rates at most once a day; on failure keep the last known rates. */
async function refreshIfStale() {
  if (g.__fxFailedAt && Date.now() - g.__fxFailedAt < RETRY_AFTER_MS) return;
  const db = await getDb();
  const [{ last }] = await db.select({ last: max(fxRates.fetchedAt) }).from(fxRates);
  if (last && last.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)) return;
  try {
    await refreshFxRates();
  } catch (e) {
    g.__fxFailedAt = Date.now();
    console.warn("Exchange rate refresh failed, using last known rates:", e);
  }
}

/**
 * Rates (units per 1 USD) for display. Current rates are refreshed daily; with `asOf` (a snapshot day) the rates
 * stored on or before that day are used. Missing currencies fall back to the last known, then built-in, rate.
 * Cached per request, so several components can ask for the rates with one query.
 */
export const getFxRates = cache(async (asOf?: string): Promise<FxRates> => {
  if (!asOf) await refreshIfStale();
  const db = await getDb();
  const latest = await db
    .selectDistinctOn([fxRates.currency])
    .from(fxRates)
    .where(asOf ? lte(fxRates.day, asOf) : undefined)
    .orderBy(fxRates.currency, desc(fxRates.day));
  const earliest =
    asOf && latest.length < CURRENCIES.length - 1
      ? await db
          .selectDistinctOn([fxRates.currency])
          .from(fxRates)
          .where(gt(fxRates.day, asOf))
          .orderBy(fxRates.currency, asc(fxRates.day))
      : [];
  return resolveRates(latest, earliest);
});
