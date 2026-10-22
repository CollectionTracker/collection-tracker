import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export const COMPARISON_DAYS = 30;

export type Comparison = {
  baselineDay: string;
  baselineValue: number;
  change: number;
  changePct: number | null; // null when the baseline value is zero
};

const addDays = (day: string, n: number) => new Date(Date.parse(day) + n * 86_400_000).toISOString().slice(0, 10);

/**
 * Pick the snapshot days to compare `current` against, from the sorted days with stored prices.
 * YTD uses the last snapshot of the previous year, or the first snapshot this year when history starts
 * mid-year. The 30-day baseline must be a snapshot at least 30 days old; there is no fudging.
 */
export function pickBaselines(days: string[], current: string) {
  const yearStart = `${current.slice(0, 4)}-01-01`;
  const before = days.filter((d) => d < yearStart).at(-1);
  const firstThisYear = days.find((d) => d >= yearStart && d < current);
  return {
    ytd: before ?? firstThisYear ?? null,
    thirtyDay: days.filter((d) => d <= addDays(current, -COMPARISON_DAYS)).at(-1) ?? null,
  };
}

export function compare(current: number, baselineDay: string, baselineValue: number): Comparison {
  const change = current - baselineValue;
  return { baselineDay, baselineValue, change, changePct: baselineValue > 0 ? (change / baselineValue) * 100 : null };
}

/** Raw + sealed portfolio value using the latest price on or before `day`. */
async function valueAsOf(day: string): Promise<number> {
  const db = await getDb();
  const { rows } = await db.execute<{ v: number }>(sql`
    select (
      select coalesce(sum(e.quantity * cur.market), 0)
      from collection_entries e
      left join lateral (
        select market from price_snapshots p
        where p.card_id = e.card_id and p.variant = e.variant and p.market is not null and p.day <= ${day}::date
        order by day desc limit 1) cur on true
    ) + (
      select coalesce(sum(p.quantity * cur.market), 0)
      from sealed_products p
      left join lateral (
        select market from sealed_price_snapshots s
        where s.sealed_product_id = p.id and s.market is not null and s.day <= ${day}::date
        order by day desc limit 1) cur on true
    ) as v`);
  return Number(rows[0].v);
}

/** YTD and 30-day change of the whole portfolio, from stored snapshots; each is null when history is too short. */
export async function getComparisons(asOf: string | null = null) {
  const db = await getDb();
  const { rows } = await db.execute<{ day: string }>(sql`
    select day::text as day from (
      select day from price_snapshots union select day from sealed_price_snapshots
    ) d where (${asOf}::date is null or day <= ${asOf}::date) order by day`);
  const days = rows.map((r) => r.day);
  const current = days.at(-1);
  if (!current) return { currentDay: null, ytd: null, thirtyDay: null };
  const base = pickBaselines(days, current);
  const now = await valueAsOf(current);
  const one = async (d: string | null) => (d ? compare(now, d, await valueAsOf(d)) : null);
  return { currentDay: current, ytd: await one(base.ytd), thirtyDay: await one(base.thirtyDay) };
}

export type Comparisons = Awaited<ReturnType<typeof getComparisons>>;
