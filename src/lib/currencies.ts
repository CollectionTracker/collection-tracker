/** Display currencies, in selector order. Every price is stored in USD and converted for display. */
export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "HKD", "NZD"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const BASE_CURRENCY = "USD" satisfies Currency;

/** Display details from the design render. Several currencies share "$" or "¥"; the selector shows the code beside it. */
export const CURRENCY_INFO: Record<
  Currency,
  { symbol: string; name: string; country: string; flag: string; decimals: number }
> = {
  USD: { symbol: "$", name: "US Dollar", country: "United States", flag: "🇺🇸", decimals: 2 },
  EUR: { symbol: "€", name: "Euro", country: "Eurozone", flag: "🇪🇺", decimals: 2 },
  GBP: { symbol: "£", name: "British Pound", country: "United Kingdom", flag: "🇬🇧", decimals: 2 },
  JPY: { symbol: "¥", name: "Japanese Yen", country: "Japan", flag: "🇯🇵", decimals: 0 },
  CAD: { symbol: "$", name: "Canadian Dollar", country: "Canada", flag: "🇨🇦", decimals: 2 },
  AUD: { symbol: "$", name: "Australian Dollar", country: "Australia", flag: "🇦🇺", decimals: 2 },
  CHF: { symbol: "Fr", name: "Swiss Franc", country: "Switzerland", flag: "🇨🇭", decimals: 2 },
  CNY: { symbol: "¥", name: "Chinese Yuan", country: "China", flag: "🇨🇳", decimals: 2 },
  HKD: { symbol: "$", name: "Hong Kong Dollar", country: "Hong Kong", flag: "🇭🇰", decimals: 2 },
  NZD: { symbol: "$", name: "New Zealand Dollar", country: "New Zealand", flag: "🇳🇿", decimals: 2 },
};

export const isCurrency = (code: string): code is Currency => (CURRENCIES as readonly string[]).includes(code);

/** Currencies whose code, name, country or symbol contains the query (case-insensitive), in selector order. */
export function searchCurrencies(query: string): Currency[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...CURRENCIES];
  return CURRENCIES.filter((code) => {
    const { name, country, symbol } = CURRENCY_INFO[code];
    return [code, name, country, symbol].some((s) => s.toLowerCase().includes(q));
  });
}

/** Rate per 1 USD as the selector shows it: 1.000 for USD, one decimal for JPY, two otherwise. */
export const rateText = (code: Currency, rate: number) =>
  code === BASE_CURRENCY ? "1.000" : rate.toFixed(CURRENCY_INFO[code].decimals === 0 ? 1 : 2);

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

/**
 * Validate a Frankfurter (ECB reference rates) response, `{ amount: 1, base: "USD", date: "2026-10-23", rates: { EUR: 0.89 } }`,
 * and keep only supported currencies. Throws on a malformed response. Checked by hand rather than with zod because
 * this module ships to the browser with the formatters.
 */
export function parseRates(json: unknown): { day: string; rates: Partial<Record<Currency, number>> } {
  const { base, date, rates } = (json ?? {}) as { base?: unknown; date?: unknown; rates?: unknown };
  if (base !== BASE_CURRENCY) throw new Error(`Expected ${BASE_CURRENCY} rates, got base ${String(base)}`);
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Rate response has no valid date");
  if (typeof rates !== "object" || rates === null) throw new Error("Rate response has no rates");
  const out: Partial<Record<Currency, number>> = {};
  for (const [code, rate] of Object.entries(rates)) {
    if (!isCurrency(code) || code === BASE_CURRENCY) continue;
    if (typeof rate !== "number" || !(rate > 0) || !Number.isFinite(rate)) throw new Error(`Invalid ${code} rate`);
    out[code] = rate;
  }
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
