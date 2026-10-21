import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { cards, collectionEntries, priceSnapshots, sets } from "@/db/schema";
import { type ApiCard, fetchCardsByIds } from "./pokemontcg";

export const today = () => new Date().toISOString().slice(0, 10);

/** Insert/refresh catalog rows for cards (and their sets). */
export async function upsertCards(apiCards: ApiCard[]) {
  if (!apiCards.length) return;
  const db = await getDb();
  const setRows = new Map(
    apiCards.map((c) => [
      c.set.id,
      {
        id: c.set.id,
        name: c.set.name,
        series: c.set.series,
        total: c.set.total,
        printedTotal: c.set.printedTotal,
        releaseDate: c.set.releaseDate ?? null,
        logo: c.set.images?.logo ?? null,
      },
    ]),
  );
  await db
    .insert(sets)
    .values([...setRows.values()])
    .onConflictDoUpdate({
      target: sets.id,
      set: {
        name: sql`excluded.name`,
        total: sql`excluded.total`,
        printedTotal: sql`excluded.printed_total`,
        logo: sql`excluded.logo`,
      },
    });
  await db
    .insert(cards)
    .values(
      apiCards.map((c) => ({
        id: c.id,
        name: c.name,
        setId: c.set.id,
        number: c.number,
        rarity: c.rarity ?? null,
        supertype: c.supertype ?? null,
        imageSmall: c.images?.small ?? null,
        imageLarge: c.images?.large ?? null,
      })),
    )
    .onConflictDoUpdate({
      target: cards.id,
      set: { rarity: sql`excluded.rarity`, imageSmall: sql`excluded.image_small`, imageLarge: sql`excluded.image_large` },
    });
}

/** Store today's price for every variant of the given cards. */
export async function snapshotPrices(apiCards: ApiCard[]) {
  const day = today();
  const rows = apiCards.flatMap((c) =>
    Object.entries(c.tcgplayer?.prices ?? {}).map(([variant, p]) => ({
      cardId: c.id,
      variant,
      day,
      market: p.market ?? null,
      low: p.low ?? null,
      mid: p.mid ?? null,
      high: p.high ?? null,
    })),
  );
  if (!rows.length) return 0;
  const db = await getDb();
  for (let i = 0; i < rows.length; i += 500) {
    await db
      .insert(priceSnapshots)
      .values(rows.slice(i, i + 500))
      .onConflictDoUpdate({
        target: [priceSnapshots.cardId, priceSnapshots.variant, priceSnapshots.day],
        set: {
          market: sql`excluded.market`,
          low: sql`excluded.low`,
          mid: sql`excluded.mid`,
          high: sql`excluded.high`,
        },
      });
  }
  return rows.length;
}

/** Daily job: refresh prices for every card currently in the collection. */
export async function syncCollectionPrices() {
  const db = await getDb();
  const owned = await db.selectDistinct({ id: collectionEntries.cardId }).from(collectionEntries);
  const fetched = await fetchCardsByIds(owned.map((o) => o.id));
  await upsertCards(fetched);
  const snapshots = await snapshotPrices(fetched);
  return { cards: fetched.length, snapshots };
}
