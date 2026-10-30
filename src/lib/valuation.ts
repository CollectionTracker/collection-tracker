export type Range = { low: number; mid: number; high: number };

/**
 * Default spread around the midpoint when an item has no explicit low/high:
 * low = mid × (1 − spread), high = mid × (1 + spread). See docs/valuation.md.
 */
export const DEFAULT_SPREAD = { raw: 0.1, sealed: 0.15 } as const;

/**
 * Illustrative selling cost for projections and liquidation: marketplace final value fee plus payment processing,
 * roughly what eBay or TCGplayer take. Shipping and taxes are left out, as elsewhere in the app.
 */
export const SELLING_FEE_PCT = 13;

/** Low/mid/high for a value: the midpoint is the market value, an entered low/high wins over the spread. */
export function rangeOf(mid: number, spread: number, low?: number | null, high?: number | null): Range {
  return {
    low: Math.min(low ?? mid * (1 - spread), mid),
    mid,
    high: Math.max(high ?? mid * (1 + spread), mid),
  };
}

export function sumRanges(ranges: Range[]): Range {
  return ranges.reduce(
    (a, r) => ({ low: a.low + r.low, mid: a.mid + r.mid, high: a.high + r.high }),
    { low: 0, mid: 0, high: 0 },
  );
}
