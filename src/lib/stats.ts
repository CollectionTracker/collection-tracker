import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { costBasisOf, getSealed } from "./sealed-stats";
import { DEFAULT_SPREAD, rangeOf, sumRanges } from "./valuation";

type EntryRow = {
  id: number;
  card_id: string;
  variant: string;
  condition: string;
  quantity: number;
  purchase_price: number | null;
  name: string;
  number: string;
  rarity: string | null;
  image_small: string | null;
  image_large: string | null;
  set_id: string;
  set_name: string;
  printed_total: number;
  cur: number | null;
  prev: number | null;
};

export type Holding = {
  id: number;
  cardId: string;
  name: string;
  number: string;
  rarity: string;
  image: string | null;
  imageLarge: string | null; // hi-res art for the hover preview
  setId: string;
  setName: string;
  variant: string;
  condition: string;
  quantity: number;
  unit: number;
  value: number;
  change: number; // $ change since previous snapshot, whole stack
  changePct: number;
  cost: number | null; // total paid, null when unknown
};

export type Bucket = { label: string; value: number; count: number };
export type SetProgress = { id: string; name: string; owned: number; total: number; value: number };

/** Dashboard figures as of `asOf` (a snapshot day); defaults to the latest stored prices. */
export async function getDashboard(asOf: string | null = null) {
  const db = await getDb();
  const { rows } = await db.execute<EntryRow>(sql`
    select e.id, e.card_id, e.variant, e.condition, e.quantity, e.purchase_price,
           c.name, c.number, c.rarity, c.image_small, c.image_large,
           s.id as set_id, s.name as set_name, s.printed_total,
           cur.market as cur, prev.market as prev
    from collection_entries e
    join cards c on c.id = e.card_id
    join sets s on s.id = c.set_id
    left join lateral (
      select market from price_snapshots p
      where p.card_id = e.card_id and p.variant = e.variant and p.market is not null
        and (${asOf}::date is null or p.day <= ${asOf}::date)
      order by day desc limit 1) cur on true
    left join lateral (
      select market from price_snapshots p
      where p.card_id = e.card_id and p.variant = e.variant and p.market is not null
        and (${asOf}::date is null or p.day <= ${asOf}::date)
      order by day desc limit 1 offset 1) prev on true`);

  const holdings: Holding[] = rows.map((r) => {
    const unit = r.cur ?? 0;
    const value = unit * r.quantity;
    const change = r.prev == null ? 0 : (unit - r.prev) * r.quantity;
    return {
      id: r.id,
      cardId: r.card_id,
      name: r.name,
      number: r.number,
      rarity: r.rarity ?? "Unknown",
      image: r.image_small,
      imageLarge: r.image_large,
      setId: r.set_id,
      setName: r.set_name,
      variant: r.variant,
      condition: r.condition,
      quantity: r.quantity,
      unit,
      value,
      change,
      changePct: r.prev ? ((unit - r.prev) / r.prev) * 100 : 0,
      cost: r.purchase_price == null ? null : r.purchase_price * r.quantity,
    };
  });

  const { rows: history } = await db.execute<{ day: string; value: number }>(sql`
    select p.day::text as day, sum(e.quantity * p.market)::float8 as value
    from collection_entries e
    join price_snapshots p on p.card_id = e.card_id and p.variant = e.variant
    where p.market is not null and (${asOf}::date is null or p.day <= ${asOf}::date)
    group by p.day order by p.day`);

  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const totalValue = sum(holdings.map((h) => h.value));
  const dayChange = sum(holdings.map((h) => h.change));
  const priced = holdings.filter((h) => h.cost != null);
  const costBasis = sum(priced.map((h) => h.cost!));
  const pricedValue = sum(priced.map((h) => h.value));

  const bucket = (key: (h: Holding) => string): Bucket[] => {
    const m = new Map<string, Bucket>();
    for (const h of holdings) {
      const b = m.get(key(h)) ?? { label: key(h), value: 0, count: 0 };
      b.value += h.value;
      b.count += h.quantity;
      m.set(key(h), b);
    }
    return [...m.values()].sort((a, b) => b.value - a.value);
  };

  const setMap = new Map<string, SetProgress & { cards: Set<string> }>();
  const totals = new Map(rows.map((r) => [r.set_id, r.printed_total]));
  for (const h of holdings) {
    const s = setMap.get(h.setId) ?? { id: h.setId, name: h.setName, owned: 0, total: totals.get(h.setId) ?? 0, value: 0, cards: new Set() };
    s.cards.add(h.cardId);
    s.value += h.value;
    setMap.set(h.setId, s);
  }
  const setProgress: SetProgress[] = [...setMap.values()]
    .map(({ cards, ...s }) => ({ ...s, owned: cards.size }))
    .sort((a, b) => b.value - a.value);

  const movers = holdings.filter((h) => h.change !== 0).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  const sealed = await getSealed(asOf);
  const rawValuation = rangeOf(totalValue, DEFAULT_SPREAD.raw);
  const combined = {
    value: totalValue + sealed.value,
    valuation: sumRanges([rawValuation, sealed.valuation]),
    ...costBasisOf([...holdings, ...sealed.holdings]),
  };

  return {
    sealed,
    combined,
    rawValuation,
    holdings,
    history,
    totalValue,
    dayChange,
    dayChangePct: totalValue - dayChange > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0,
    totalCopies: sum(holdings.map((h) => h.quantity)),
    uniqueCards: new Set(holdings.map((h) => h.cardId)).size,
    setCount: setMap.size,
    costBasis: priced.length ? costBasis : null,
    gain: priced.length ? pricedValue - costBasis : null,
    gainPct: costBasis > 0 ? ((pricedValue - costBasis) / costBasis) * 100 : null,
    topCards: [...holdings].sort((a, b) => b.value - a.value).slice(0, 10),
    gainers: movers.filter((h) => h.change > 0).slice(0, 5),
    losers: movers.filter((h) => h.change < 0).slice(0, 5),
    byRarity: bucket((h) => h.rarity),
    byCondition: bucket((h) => h.condition),
    setProgress,
    lastUpdated: history.at(-1)?.day ?? null,
  };
}

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
