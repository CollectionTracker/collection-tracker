import { type PgDatabase, type PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

// Demo data for `npm run dev`: a fully populated collection (cards, sealed, ~14 months of prices,
// snapshot labels, sync history) so every view can be checked as it looks when full.
// Card ids and image URLs are real Pokémon TCG API ids, so a price sync refreshes them in place.
type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const SETS = [
  { id: "base1", name: "Base", series: "Base", total: 102, printedTotal: 102, releaseDate: "1999/01/09" },
  { id: "base2", name: "Jungle", series: "Base", total: 64, printedTotal: 64, releaseDate: "1999/06/16" },
  { id: "neo1", name: "Neo Genesis", series: "Neo", total: 111, printedTotal: 111, releaseDate: "2000/12/16" },
  { id: "ex7", name: "Team Rocket Returns", series: "EX", total: 111, printedTotal: 109, releaseDate: "2004/11/08" },
  { id: "swsh7", name: "Evolving Skies", series: "Sword & Shield", total: 237, printedTotal: 203, releaseDate: "2021/08/27" },
  { id: "swsh12pt5", name: "Crown Zenith", series: "Sword & Shield", total: 160, printedTotal: 159, releaseDate: "2023/01/20" },
  { id: "sv3", name: "Obsidian Flames", series: "Scarlet & Violet", total: 230, printedTotal: 197, releaseDate: "2023/08/11" },
  { id: "sv3pt5", name: "151", series: "Scarlet & Violet", total: 207, printedTotal: 165, releaseDate: "2023/09/22" },
  { id: "sv4pt5", name: "Paldean Fates", series: "Scarlet & Violet", total: 245, printedTotal: 91, releaseDate: "2024/01/26" },
  { id: "sv8", name: "Surging Sparks", series: "Scarlet & Violet", total: 252, printedTotal: 191, releaseDate: "2024/11/08" },
  { id: "sv8pt5", name: "Prismatic Evolutions", series: "Scarlet & Violet", total: 180, printedTotal: 131, releaseDate: "2025/01/17" },
];

// [set, number, name, rarity, supertype, variants, base market price, copies, purchase price, condition]
type CardSeed = [string, string, string, string, string, Record<string, number>, number, number, number, string];
const CARDS: CardSeed[] = [
  ["base1", "4", "Charizard", "Rare Holo", "Pokémon", { holofoil: 420 }, 420, 1, 180, "LP"],
  ["base1", "2", "Blastoise", "Rare Holo", "Pokémon", { holofoil: 145 }, 145, 1, 60, "NM"],
  ["base1", "15", "Venusaur", "Rare Holo", "Pokémon", { holofoil: 110 }, 110, 1, 45, "NM"],
  ["base1", "58", "Pikachu", "Common", "Pokémon", { normal: 14 }, 14, 3, 5, "NM"],
  ["base2", "3", "Flareon", "Rare Holo", "Pokémon", { holofoil: 38 }, 38, 1, 20, "NM"],
  ["base2", "1", "Clefable", "Rare Holo", "Pokémon", { holofoil: 24 }, 24, 2, 10, "NM"],
  ["neo1", "9", "Lugia", "Rare Holo", "Pokémon", { holofoil: 260 }, 260, 1, 150, "MP"],
  ["neo1", "1", "Ampharos", "Rare Holo", "Pokémon", { holofoil: 32 }, 32, 1, 18, "NM"],
  ["ex7", "100", "Rocket's Mewtwo ex", "Rare Holo EX", "Pokémon", { holofoil: 95 }, 95, 1, 70, "NM"],
  ["swsh7", "215", "Umbreon VMAX", "Rare Secret", "Pokémon", { holofoil: 640 }, 640, 1, 480, "NM"],
  ["swsh7", "218", "Rayquaza VMAX", "Rare Secret", "Pokémon", { holofoil: 145 }, 145, 1, 110, "NM"],
  ["swsh7", "95", "Sylveon VMAX", "Rare Holo VMAX", "Pokémon", { holofoil: 28 }, 28, 2, 15, "NM"],
  ["swsh7", "167", "Espeon V", "Rare Holo V", "Pokémon", { holofoil: 22 }, 22, 2, 12, "NM"],
  ["swsh7", "160", "Leafeon VMAX", "Rare Holo VMAX", "Pokémon", { holofoil: 18 }, 18, 1, 10, "NM"],
  ["swsh12pt5", "GG69", "Pikachu VMAX", "Rare Ultra", "Pokémon", { holofoil: 85 }, 85, 1, 60, "NM"],
  ["swsh12pt5", "GG35", "Mewtwo VSTAR", "Rare Ultra", "Pokémon", { holofoil: 34 }, 34, 1, 25, "NM"],
  ["sv3", "223", "Charizard ex", "Special Illustration Rare", "Pokémon", { holofoil: 78 }, 78, 3, 55, "NM"],
  ["sv3", "125", "Charizard ex", "Double Rare", "Pokémon", { holofoil: 9 }, 9, 4, 4, "NM"],
  ["sv3", "133", "Tyranitar ex", "Double Rare", "Pokémon", { holofoil: 4 }, 4, 3, 2, "NM"],
  ["sv3pt5", "199", "Charizard ex", "Special Illustration Rare", "Pokémon", { holofoil: 135 }, 135, 2, 90, "NM"],
  ["sv3pt5", "198", "Alakazam ex", "Special Illustration Rare", "Pokémon", { holofoil: 46 }, 46, 2, 30, "NM"],
  ["sv3pt5", "200", "Erika's Invitation", "Special Illustration Rare", "Trainer", { holofoil: 62 }, 62, 1, 40, "NM"],
  ["sv3pt5", "151", "Mew ex", "Double Rare", "Pokémon", { holofoil: 7 }, 7, 4, 3, "NM"],
  ["sv3pt5", "6", "Charizard", "Rare Holo", "Pokémon", { holofoil: 5, reverseHolofoil: 3 }, 5, 3, 2, "NM"],
  ["sv3pt5", "25", "Pikachu", "Common", "Pokémon", { normal: 0.4, reverseHolofoil: 1.2 }, 0.4, 8, 0.25, "NM"],
  ["sv3pt5", "133", "Eevee", "Common", "Pokémon", { normal: 0.3, reverseHolofoil: 0.9 }, 0.3, 10, 0.25, "NM"],
  ["sv3pt5", "63", "Abra", "Common", "Pokémon", { normal: 0.2, reverseHolofoil: 0.7 }, 0.2, 12, 0.2, "NM"],
  ["sv4pt5", "234", "Charizard ex", "Shiny Rare", "Pokémon", { holofoil: 52 }, 52, 2, 35, "NM"],
  ["sv4pt5", "232", "Mew ex", "Shiny Rare", "Pokémon", { holofoil: 27 }, 27, 2, 18, "NM"],
  ["sv4pt5", "245", "Iono", "Special Illustration Rare", "Trainer", { holofoil: 24 }, 24, 1, 20, "NM"],
  ["sv4pt5", "80", "Gardevoir ex", "Double Rare", "Pokémon", { holofoil: 3 }, 3, 3, 2, "NM"],
  ["sv8", "238", "Pikachu ex", "Special Illustration Rare", "Pokémon", { holofoil: 95 }, 95, 2, 70, "NM"],
  ["sv8", "247", "Milotic ex", "Special Illustration Rare", "Pokémon", { holofoil: 15 }, 15, 2, 10, "NM"],
  ["sv8", "57", "Pikachu ex", "Double Rare", "Pokémon", { holofoil: 8 }, 8, 3, 4, "NM"],
  ["sv8", "117", "Ceruledge ex", "Double Rare", "Pokémon", { holofoil: 2.5 }, 2.5, 4, 1.5, "NM"],
  ["sv8pt5", "161", "Umbreon ex", "Special Illustration Rare", "Pokémon", { holofoil: 1050 }, 1050, 1, 650, "NM"],
  ["sv8pt5", "155", "Sylveon ex", "Special Illustration Rare", "Pokémon", { holofoil: 260 }, 260, 1, 170, "NM"],
  ["sv8pt5", "156", "Leafeon ex", "Special Illustration Rare", "Pokémon", { holofoil: 105 }, 105, 1, 80, "NM"],
  ["sv8pt5", "153", "Espeon ex", "Special Illustration Rare", "Pokémon", { holofoil: 125 }, 125, 1, 85, "NM"],
  ["sv8pt5", "28", "Eevee ex", "Double Rare", "Pokémon", { holofoil: 6 }, 6, 4, 3, "NM"],
  ["sv8pt5", "75", "Flareon ex", "Double Rare", "Pokémon", { holofoil: 4 }, 4, 3, 2, "LP"],
  ["sv8pt5", "56", "Eevee", "Common", "Pokémon", { normal: 0.35, reverseHolofoil: 1.5 }, 0.35, 10, 0.3, "NM"],
];

// [name, type, set group, sku, quantity, purchase price, current market, notes]
type SealedSeed = [string, schema.SealedProductType, string, string | null, number, number, number, string | null];
const SEALED: SealedSeed[] = [
  ["Prismatic Evolutions Elite Trainer Box", "etb", "Prismatic Evolutions", "196214", 6, 59.99, 118, null],
  ["Prismatic Evolutions Booster Bundle", "bundle", "Prismatic Evolutions", null, 4, 27, 44, null],
  ["Surging Sparks Booster Box", "booster_box", "Surging Sparks", null, 2, 143.5, 215, "Sealed display"],
  ["Surging Sparks Elite Trainer Box", "etb", "Surging Sparks", null, 3, 49.99, 78, null],
  ["Paldean Fates Elite Trainer Box", "etb", "Paldean Fates", null, 2, 54.99, 95, null],
  ["151 Ultra Premium Collection", "upc", "151", null, 1, 119.99, 260, null],
  ["151 Booster Bundle", "bundle", "151", null, 6, 24, 42, null],
  ["Evolving Skies Booster Box", "booster_box", "Evolving Skies", null, 1, 105, 520, "Bought at MSRP"],
  ["Crown Zenith Elite Trainer Box", "etb", "Crown Zenith", null, 2, 49.99, 88, null],
  ["Charizard Ultra Premium Collection", "upc", "Scarlet & Violet", null, 1, 119.99, 135, null],
  ["Obsidian Flames Booster Box Case", "case", "Obsidian Flames", null, 1, 520, 640, "6 displays"],
  ["Paldea Evolved Tin", "tin", "Paldea Evolved", null, 5, 24.99, 31, null],
  ["Pikachu Collector Chest", "other", "Promo", null, 2, 24.99, 36, null],
];

// Deterministic PRNG so every fresh dev database looks identical.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const round = (n: number) => Math.round(n * 100) / 100;

/** Days to snapshot, oldest first: weekly for the past ~14 months, daily for the most recent 60 days. */
function snapshotDays(now: Date): Date[] {
  const days: Date[] = [];
  for (let back = 425; back > 60; back -= 7) days.push(new Date(now.getTime() - back * DAY));
  for (let back = 60; back >= 0; back--) days.push(new Date(now.getTime() - back * DAY));
  return days;
}

/** A price path ending at `end`, drifting upward overall with noise; shared by every variant of a product. */
function path(count: number, end: number, rand: () => number, growth: number): number[] {
  const out = new Array<number>(count);
  let level = end / (1 + growth);
  for (let i = 0; i < count; i++) {
    const trend = (1 + growth) ** (1 / count);
    level *= trend * (1 + (rand() - 0.5) * 0.05);
    out[i] = level;
  }
  const scale = end / out[count - 1];
  return out.map((v) => v * scale);
}

async function insertChunked<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>, size = 500) {
  for (let i = 0; i < rows.length; i += size) await insert(rows.slice(i, i + size));
}

export async function seedDevData(db: Db) {
  const rand = rng(1999);
  const now = new Date();
  const days = snapshotDays(now);

  await db.insert(schema.sets).values(SETS);
  const cardRows = CARDS.map(([setId, number, name, rarity, supertype]) => ({
    id: `${setId}-${number}`,
    name,
    setId,
    number,
    rarity,
    supertype,
    imageSmall: `https://images.pokemontcg.io/${setId}/${number}.png`,
    imageLarge: `https://images.pokemontcg.io/${setId}/${number}_hires.png`,
  }));
  await insertChunked(cardRows, (c) => db.insert(schema.cards).values(c));

  // Holdings: each variant owned is its own entry; singles are mostly Near Mint with a few worn copies.
  const entries: (typeof schema.collectionEntries.$inferInsert)[] = [];
  const prices: (typeof schema.priceSnapshots.$inferInsert)[] = [];
  CARDS.forEach(([setId, number, , , , variants, , copies, paid, condition], idx) => {
    const cardId = `${setId}-${number}`;
    Object.entries(variants).forEach(([variant, end], vi) => {
      entries.push({
        cardId,
        variant,
        condition: vi === 0 ? condition : "NM",
        quantity: vi === 0 ? copies : Math.max(1, Math.ceil(copies / 2)),
        purchasePrice: round(vi === 0 ? paid : paid * 0.6),
        acquiredAt: iso(new Date(now.getTime() - (30 + ((idx * 37) % 380)) * DAY)),
      });
      // Older cards and chase cards climb faster; bulk stays flat.
      const growth = end >= 100 ? 0.25 + rand() * 0.3 : end >= 10 ? 0.1 + rand() * 0.25 : (rand() - 0.4) * 0.3;
      const series = path(days.length, end, rand, growth);
      days.forEach((d, i) => {
        const market = round(series[i]);
        prices.push({
          cardId,
          variant,
          day: iso(d),
          market,
          low: round(market * 0.82),
          mid: round(market * 1.04),
          high: round(market * 1.4),
        });
      });
    });
  });
  await insertChunked(entries, (c) => db.insert(schema.collectionEntries).values(c));
  await insertChunked(prices, (c) => db.insert(schema.priceSnapshots).values(c));

  const products = await db
    .insert(schema.sealedProducts)
    .values(
      SEALED.map(([name, productType, setGroup, sku, quantity, purchasePrice, , notes]) => ({
        name,
        productType,
        setGroup,
        sku,
        quantity,
        purchasePrice,
        notes,
      })),
    )
    .returning({ id: schema.sealedProducts.id });
  const sealedPrices: (typeof schema.sealedPriceSnapshots.$inferInsert)[] = [];
  products.forEach(({ id }, i) => {
    const [, , , , , paid, end] = SEALED[i];
    const series = path(days.length, end, rand, Math.max(0.02, end / paid - 1) * 0.8);
    days.forEach((d, j) => {
      // Hand-entered prices are sparser than card syncs: weekly across the whole range.
      if (j < days.length - 61 || (days.length - 1 - j) % 7 === 0 || j === days.length - 1) {
        const market = round(series[j]);
        sealedPrices.push({
          sealedProductId: id,
          day: iso(d),
          market,
          low: round(market * 0.9),
          high: round(market * 1.15),
          priceSource: "manual",
        });
      }
    });
  });
  await insertChunked(sealedPrices, (c) => db.insert(schema.sealedPriceSnapshots).values(c));

  const stamp = (back: number) => iso(new Date(now.getTime() - back * DAY));
  const monthEnd = (back: number) => days.reduce((best, d) => (Math.abs(d.getTime() - (now.getTime() - back * DAY)) < Math.abs(best.getTime() - (now.getTime() - back * DAY)) ? d : best));
  await db.insert(schema.snapshotLabels).values([
    { day: iso(monthEnd(365)), label: "One year ago" },
    { day: iso(monthEnd(180)), label: "Before Prismatic Evolutions hype" },
    { day: iso(monthEnd(90)), label: "Quarter checkpoint" },
    { day: stamp(0), label: "Today" },
  ]);

  const finished = new Date(now.getTime() - 20 * 60_000);
  await db.insert(schema.syncRuns).values([
    { startedAt: new Date(now.getTime() - 2 * DAY), finishedAt: new Date(now.getTime() - 2 * DAY + 4000), status: "success", cards: CARDS.length, prices: prices.length / days.length | 0 },
    { startedAt: new Date(finished.getTime() - 5000), finishedAt: finished, status: "success", cards: CARDS.length, prices: prices.length / days.length | 0 },
  ]);
}
