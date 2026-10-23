import { z } from "zod";

/** Display currencies, in selector order. Every price is stored in USD and converted for display. */
export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "HKD", "NZD"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const BASE_CURRENCY = "USD" satisfies Currency;

export const isCurrency = (code: string): code is Currency => (CURRENCIES as readonly string[]).includes(code);

/** Rates from the design render, used for a currency only when no rate has ever been stored for it (e.g. offline first run). */
export const FALLBACK_RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 154.5,
  CAD: 1.39,
  AUD: 1.54,
  CHF: 0.88,
  CNY: 7.24,
  HKD: 7.78,
  NZD: 1.69,
};

export type RateRow = { day: string; currency: string; rate: number; source: string };

export type FxRates = {
  /** Units of each currency per 1 USD. */
  rates: Record<Currency, number>;
  /** Latest rate day used, or null when nothing is stored yet. */
  day: string | null;
  source: string | null;
  /** Currencies that had no stored rate and use FALLBACK_RATES. */
  fallback: Currency[];
};

// Frankfurter (ECB reference rates): { amount: 1, base: "USD", date: "2026-10-23", rates: { EUR: 0.89, ... } }
const frankfurterResponse = z.object({
  base: z.literal(BASE_CURRENCY),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rates: z.record(z.string(), z.number().positive()),
});

/** Validate a Frankfurter response and keep only supported currencies. Throws on a malformed response. */
export function parseRates(json: unknown): { day: string; rates: Partial<Record<Currency, number>> } {
  const { date, rates } = frankfurterResponse.parse(json);
  const out: Partial<Record<Currency, number>> = {};
  for (const [code, rate] of Object.entries(rates)) if (isCurrency(code) && code !== BASE_CURRENCY) out[code] = rate;
  if (!Object.keys(out).length) throw new Error("No supported currencies in rate response");
  return { day: date, rates: out };
}

/**
 * Pick one rate per currency: the latest stored on or before the requested day (`latest`), otherwise the earliest
 * stored after it (`earliest`, for days before rates were first fetched), otherwise the built-in fallback.
 */
export function resolveRates(latest: RateRow[], earliest: RateRow[] = []): FxRates {
  const pick = new Map<string, RateRow>();
  for (const r of earliest) pick.set(r.currency, r);
  for (const r of latest) pick.set(r.currency, r);
  const rates = { ...FALLBACK_RATES };
  const fallback: Currency[] = [];
  let newest: RateRow | null = null;
  for (const code of CURRENCIES) {
    if (code === BASE_CURRENCY) continue;
    const row = pick.get(code);
    if (!row) {
      fallback.push(code);
      continue;
    }
    rates[code] = row.rate;
    if (!newest || row.day > newest.day) newest = row;
  }
  return { rates, day: newest?.day ?? null, source: newest?.source ?? null, fallback };
}

/** Convert a USD amount into `currency`. */
export const convert = (usd: number, currency: Currency, fx: Pick<FxRates, "rates">) => usd * fx.rates[currency];
