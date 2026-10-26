import type { SealedHolding } from "./sealed-stats";

export const SEALED_TYPE_LABELS: Record<string, string> = {
  etb: "Elite Trainer Box",
  case: "Case",
  booster_box: "Booster Box",
  upc: "Ultra Premium Collection",
  bundle: "Booster Bundle",
  tin: "Tin",
  other: "Other",
};

/** Display name for a stored product type ("booster_box" → "Booster Box"); unknown values pass through. */
export const sealedTypeLabel = (t: string) => SEALED_TYPE_LABELS[t] ?? t;

/** Prices older than this are flagged on the Sealed Inventory view. */
export const STALE_PRICE_DAYS = 7;

export type SealedBucket = { label: string; value: number; units: number; products: number };
export type TypeReturn = SealedBucket & { cost: number | null; gain: number | null; gainPct: number | null };
export type PriceCoverage = { tcgcsv: number; manual: number; unpriced: number; linked: number; stale: SealedHolding[] };

function bucket(holdings: SealedHolding[], key: (h: SealedHolding) => string): SealedBucket[] {
  const m = new Map<string, SealedBucket>();
  for (const h of holdings) {
    const b = m.get(key(h)) ?? { label: key(h), value: 0, units: 0, products: 0 };
    b.value += h.value;
    b.units += h.quantity;
    b.products += 1;
    m.set(key(h), b);
  }
  return [...m.values()].sort((a, b) => b.value - a.value);
}

/** Value per product type, largest first. */
export const byType = (holdings: SealedHolding[]) => bucket(holdings, (h) => sealedTypeLabel(h.productType));

/** Value per set group, largest first; products without one are "No set". */
export const bySetGroup = (holdings: SealedHolding[]) => bucket(holdings, (h) => h.setGroup ?? "No set");

/** Cost, value and gain per product type over the products with a known purchase price, best return first. */
export function returnsByType(holdings: SealedHolding[]): TypeReturn[] {
  return byType(holdings)
    .map((b) => {
      const priced = holdings.filter((h) => sealedTypeLabel(h.productType) === b.label && h.cost != null);
      if (!priced.length) return { ...b, cost: null, gain: null, gainPct: null };
      const cost = priced.reduce((a, h) => a + h.cost!, 0);
      const gain = priced.reduce((a, h) => a + h.value, 0) - cost;
      return { ...b, cost, gain, gainPct: cost > 0 ? (gain / cost) * 100 : null };
    })
    .sort((a, b) => (b.gainPct ?? -Infinity) - (a.gainPct ?? -Infinity));
}

/** How the products are priced, and which priced ones haven't had a price for `STALE_PRICE_DAYS` days as of `today`. */
export function priceCoverage(holdings: SealedHolding[], today: string): PriceCoverage {
  const cutoff = Date.parse(today) - STALE_PRICE_DAYS * 86_400_000;
  return {
    tcgcsv: holdings.filter((h) => h.priceSource === "tcgcsv").length,
    manual: holdings.filter((h) => h.priceSource === "manual").length,
    unpriced: holdings.filter((h) => h.priceSource == null).length,
    linked: holdings.filter((h) => h.linked).length,
    stale: holdings
      .filter((h) => h.priceDay != null && Date.parse(h.priceDay) < cutoff)
      .sort((a, b) => a.priceDay!.localeCompare(b.priceDay!)),
  };
}

/** Largest moves since each product's previous price, gainers then losers, `n` of each. */
export function sealedMovers(holdings: SealedHolding[], n = 5) {
  const moved = holdings.filter((h) => h.change != null && h.change !== 0).sort((a, b) => Math.abs(b.change!) - Math.abs(a.change!));
  return [...moved.filter((h) => h.change! > 0).slice(0, n), ...moved.filter((h) => h.change! < 0).slice(0, n)];
}
