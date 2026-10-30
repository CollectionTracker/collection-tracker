import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { type Range, SELLING_FEE_PCT } from "./valuation";

/** Days of snapshot history the volatility readout looks back over. */
export const VOLATILITY_WINDOW_DAYS = 90;

export type Point = { day: string; value: number };

export type Volatility = {
  from: string;
  to: string;
  snapshots: number;
  change: number;
  changePct: number | null; // null when the first value is zero
  /** Standard deviation of the % moves between consecutive snapshots. */
  stdDevPct: number;
  best: { day: string; pct: number };
  worst: { day: string; pct: number };
  /** Largest peak-to-trough fall in the window, as a negative % (0 when it never fell). */
  maxDrawdownPct: number;
};

/** Volatility of a value series sorted by day; null with fewer than three snapshots (two moves). */
export function volatility(series: readonly Point[]): Volatility | null {
  if (series.length < 3) return null;
  const moves: { day: string; pct: number }[] = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1].value;
    if (prev > 0) moves.push({ day: series[i].day, pct: (series[i].value / prev - 1) * 100 });
  }
  if (moves.length < 2) return null;
  const mean = moves.reduce((a, m) => a + m.pct, 0) / moves.length;
  const variance = moves.reduce((a, m) => a + (m.pct - mean) ** 2, 0) / (moves.length - 1);
  let peak = series[0].value;
  let maxDrawdownPct = 0;
  for (const p of series) {
    peak = Math.max(peak, p.value);
    if (peak > 0) maxDrawdownPct = Math.min(maxDrawdownPct, (p.value / peak - 1) * 100);
  }
  const first = series[0];
  const last = series.at(-1)!;
  return {
    from: first.day,
    to: last.day,
    snapshots: series.length,
    change: last.value - first.value,
    changePct: first.value > 0 ? (last.value / first.value - 1) * 100 : null,
    stdDevPct: Math.sqrt(variance),
    best: moves.reduce((a, m) => (m.pct > a.pct ? m : a)),
    worst: moves.reduce((a, m) => (m.pct < a.pct ? m : a)),
    maxDrawdownPct,
  };
}

export type Liquidation = {
  feePct: number;
  /** Net proceeds selling at the low, mid and high estimate, after fees. */
  quick: number;
  fair: number;
  patient: number;
  /** Fair proceeds minus cost basis; null when no cost is known. */
  fairVsCost: number | null;
};

/** What selling everything might bring in after fees, at each point of the valuation range. */
export function liquidation(range: Range, costBasis: number | null, feePct = SELLING_FEE_PCT): Liquidation {
  const net = (v: number) => v * (1 - feePct / 100);
  return {
    feePct,
    quick: net(range.low),
    fair: net(range.mid),
    patient: net(range.high),
    fairVsCost: costBasis == null ? null : net(range.mid) - costBasis,
  };
}

/**
 * Raw and sealed value at each snapshot day in the volatility window ending at `asOf` (or the latest snapshot), each
 * holding at its latest price on or before that day, so a day where only some prices were stored doesn't dip.
 */
export async function getValueSeries(asOf: string | null = null) {
  const db = await getDb();
  const { rows } = await db.execute<{ day: string; raw: number; sealed: number }>(sql`
    with days as (
      select distinct day from (select day from price_snapshots union select day from sealed_price_snapshots) d
      where ${asOf}::date is null or day <= ${asOf}::date
    ), win as (
      select day from days where day > (select max(day) from days) - ${VOLATILITY_WINDOW_DAYS}::int
    )
    select w.day::text as day,
      (select coalesce(sum(e.quantity * cur.market), 0)::float8
       from collection_entries e
       left join lateral (
         select market from price_snapshots p
         where p.card_id = e.card_id and p.variant = e.variant and p.market is not null and p.day <= w.day
         order by day desc limit 1) cur on true) as raw,
      (select coalesce(sum(p.quantity * cur.market), 0)::float8
       from sealed_products p
       left join lateral (
         select market from sealed_price_snapshots s
         where s.sealed_product_id = p.id and s.market is not null and s.day <= w.day
         order by day desc limit 1) cur on true) as sealed
    from win w order by w.day`);
  const pick = (key: "raw" | "sealed" | "all") =>
    rows.map((r) => ({ day: r.day, value: key === "all" ? Number(r.raw) + Number(r.sealed) : Number(r[key]) }));
  return { portfolio: pick("all"), raw: pick("raw"), sealed: pick("sealed") };
}
