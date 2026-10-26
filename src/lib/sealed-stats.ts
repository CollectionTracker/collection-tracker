import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { DEFAULT_SPREAD, type Range, rangeOf, sumRanges } from "./valuation";

type SealedRow = {
  id: number;
  name: string;
  product_type: string;
  set_group: string | null;
  sku: string | null;
  quantity: number;
  purchase_price: number | null;
  unit: number | null;
  low: number | null;
  high: number | null;
  price_day: string | null;
  price_source: string | null;
  prev: number | null;
  linked: boolean;
};

export type SealedHolding = {
  id: number;
  name: string;
  productType: string;
  setGroup: string | null;
  sku: string | null;
  quantity: number;
  unit: number; // latest market price per unit, 0 when no price has been entered
  value: number;
  unitCost: number | null; // paid per unit, null when unknown
  cost: number | null; // total paid, null when unknown
  gain: number | null;
  gainPct: number | null;
  valuation: Range; // whole stack: entered low/high, else the default spread around value
  change: number | null; // whole stack, since the previous stored price; null without one
  changePct: number | null;
  priceDay: string | null; // day of the latest price
  priceSource: "manual" | "tcgcsv" | null; // where the latest price came from, null when unpriced
  linked: boolean; // matched to a TCGplayer product, so the daily sync prices it
};

export type CostBasis = {
  costBasis: number | null; // total paid across holdings with a known purchase price
  avgUnitCost: number | null; // costBasis / units that have a known purchase price
  gain: number | null; // value of those same holdings minus costBasis
  gainPct: number | null;
};

/** Cost basis over the holdings whose purchase price is known (unknown ones can't have a gain). */
export function costBasisOf(items: { quantity: number; value: number; cost: number | null }[]): CostBasis {
  const priced = items.filter((i) => i.cost != null);
  if (!priced.length) return { costBasis: null, avgUnitCost: null, gain: null, gainPct: null };
  const costBasis = priced.reduce((a, i) => a + i.cost!, 0);
  const units = priced.reduce((a, i) => a + i.quantity, 0);
  const gain = priced.reduce((a, i) => a + i.value, 0) - costBasis;
  return {
    costBasis,
    avgUnitCost: units > 0 ? costBasis / units : null,
    gain,
    gainPct: costBasis > 0 ? (gain / costBasis) * 100 : null,
  };
}

export async function getSealed(asOf: string | null = null) {
  const db = await getDb();
  const { rows } = await db.execute<SealedRow>(sql`
    select p.id, p.name, p.product_type, p.set_group, p.sku, p.quantity, p.purchase_price,
           cur.market as unit, cur.low, cur.high, cur.day::text as price_day, cur.price_source,
           prev.market as prev, p.tcgplayer_product_id is not null as linked
    from sealed_products p
    left join lateral (
      -- Only a hand-entered low/high is a valuation range; TCGCSV's are the cheapest and dearest listings.
      select market, day, price_source,
             case when price_source = 'manual' then low end as low,
             case when price_source = 'manual' then high end as high
      from sealed_price_snapshots s
      where s.sealed_product_id = p.id and s.market is not null
        and (${asOf}::date is null or s.day <= ${asOf}::date)
      order by day desc limit 1) cur on true
    left join lateral (
      select market from sealed_price_snapshots s
      where s.sealed_product_id = p.id and s.market is not null
        and (${asOf}::date is null or s.day <= ${asOf}::date)
      order by day desc limit 1 offset 1) prev on true`);

  const holdings: SealedHolding[] = rows.map((r) => {
    const unit = r.unit ?? 0;
    const value = unit * r.quantity;
    const cost = r.purchase_price == null ? null : r.purchase_price * r.quantity;
    return {
      id: r.id,
      name: r.name,
      productType: r.product_type,
      setGroup: r.set_group,
      sku: r.sku,
      quantity: r.quantity,
      unit,
      value,
      unitCost: r.purchase_price,
      cost,
      gain: cost == null ? null : value - cost,
      gainPct: cost ? ((value - cost) / cost) * 100 : null,
      valuation: rangeOf(value, DEFAULT_SPREAD.sealed, r.low == null ? null : r.low * r.quantity, r.high == null ? null : r.high * r.quantity),
      change: r.prev == null ? null : (unit - r.prev) * r.quantity,
      changePct: r.prev ? ((unit - r.prev) / r.prev) * 100 : null,
      priceDay: r.price_day,
      priceSource: r.price_source === "manual" || r.price_source === "tcgcsv" ? r.price_source : null,
      linked: r.linked,
    };
  });
  return {
    holdings,
    units: holdings.reduce((a, h) => a + h.quantity, 0),
    value: holdings.reduce((a, h) => a + h.value, 0),
    valuation: sumRanges(holdings.map((h) => h.valuation)),
    ...costBasisOf(holdings),
  };
}

export type Sealed = Awaited<ReturnType<typeof getSealed>>;

/** Sealed value at every stored price day up to `asOf`, each product at its latest price on or before that day. */
export async function getSealedHistory(asOf: string | null = null) {
  const db = await getDb();
  const { rows } = await db.execute<{ day: string; value: number }>(sql`
    with days as (
      select distinct day from sealed_price_snapshots where ${asOf}::date is null or day <= ${asOf}::date
    )
    select d.day::text as day,
      (select coalesce(sum(p.quantity * cur.market), 0)::float8
       from sealed_products p
       left join lateral (
         select market from sealed_price_snapshots s
         where s.sealed_product_id = p.id and s.market is not null and s.day <= d.day
         order by day desc limit 1) cur on true) as value
    from days d order by d.day`);
  return rows.map((r) => ({ day: r.day, value: Number(r.value) }));
}
