import { and, inArray, isNotNull, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import type * as schema from "@/db/schema";
import { cards, collectionEntries, priceSnapshots, sealedPriceSnapshots, sealedProducts, sets, syncRuns } from "@/db/schema";
import { type CatalogCard, type Priceable, linkTcgplayer, newClients, priceCards, resolveByIds } from "./catalog";
import { refreshFxRates } from "./forex";
import { type TcgcsvClient, matchSealedProduct, productImage, sealedGroup } from "./tcgcsv";

export const today = () => new Date().toISOString().slice(0, 10);

/** Insert/refresh catalog rows for cards (and their sets), including their TCGdex and TCGplayer links. */
export async function upsertCards(list: CatalogCard[]) {
  if (!list.length) return;
  const db = await getDb();
  const setRows = new Map(
    list.map((c) => [
      c.set.id,
      {
        id: c.set.id,
        name: c.set.name,
        series: c.set.series,
        total: c.set.total,
        printedTotal: c.set.printedTotal,
        releaseDate: c.set.releaseDate,
        logo: c.set.logo,
        tcgdexId: c.set.tcgdexId,
      },
    ]),
  );
  // Names, series and release dates of existing sets are kept so the Pokémon TCG API's wording doesn't change under the user.
  await db
    .insert(sets)
    .values([...setRows.values()])
    .onConflictDoUpdate({
      target: sets.id,
      set: {
        total: sql`excluded.total`,
        printedTotal: sql`excluded.printed_total`,
        logo: sql`coalesce(excluded.logo, ${sets.logo})`,
        tcgdexId: sql`excluded.tcgdex_id`,
      },
    });
  // A TCGdex id already held by another row means the card was stored twice (a legacy-id row and a TCGdex-id row,
  // from a quick-add before the legacy row was linked). That row is merged into this one once it is stored;
  // until then this one is stored without the TCGdex id so the unique index holds.
  const holders = await db
    .select({ id: cards.id, tcgdexId: cards.tcgdexId })
    .from(cards)
    .where(and(isNotNull(cards.tcgdexId), inArray(cards.tcgdexId, list.map((c) => c.tcgdexId))));
  const duplicates = list.flatMap((c) => {
    const dup = holders.find((h) => h.tcgdexId === c.tcgdexId && h.id !== c.id);
    return dup ? [{ keep: c, dup: dup.id }] : [];
  });
  await db
    .insert(cards)
    .values(
      list.map((c) => ({
        id: c.id,
        name: c.name,
        setId: c.set.id,
        number: c.number,
        rarity: c.rarity,
        supertype: c.supertype,
        imageSmall: c.images.small ?? null,
        imageLarge: c.images.large ?? null,
        tcgdexId: duplicates.some((d) => d.keep === c) ? null : c.tcgdexId,
        tcgplayerProductId: c.tcgplayerProductId,
        tcgplayerGroupId: c.tcgplayerGroupId,
      })),
    )
    .onConflictDoUpdate({
      target: cards.id,
      // Rarity wording differs between catalogs ("Rare Holo" vs "Rare"), so an existing rarity is kept.
      set: {
        rarity: sql`coalesce(${cards.rarity}, excluded.rarity)`,
        imageSmall: sql`coalesce(excluded.image_small, ${cards.imageSmall})`,
        imageLarge: sql`coalesce(excluded.image_large, ${cards.imageLarge})`,
        tcgdexId: sql`excluded.tcgdex_id`,
        tcgplayerProductId: sql`coalesce(excluded.tcgplayer_product_id, ${cards.tcgplayerProductId})`,
        tcgplayerGroupId: sql`coalesce(excluded.tcgplayer_group_id, ${cards.tcgplayerGroupId})`,
      },
    });
  for (const { keep, dup } of duplicates) {
    await db.transaction(async (tx) => {
      await mergeCard(tx, keep.id, dup);
      await tx.update(cards).set({ tcgdexId: keep.tcgdexId }).where(sql`${cards.id} = ${keep.id}`);
    });
  }
}

/**
 * Fold card `dup` into card `keep`: its collection entries add to `keep`'s (keeping `keep`'s purchase price when
 * it has one), its price history fills days `keep` lacks, and the `dup` row is deleted.
 */
export async function mergeCard(db: PgDatabase<PgQueryResultHKT, typeof schema>, keep: string, dup: string) {
  await db.execute(sql`
    insert into collection_entries (card_id, variant, condition, quantity, purchase_price, acquired_at, notes, created_at)
    select ${keep}, variant, condition, quantity, purchase_price, acquired_at, notes, created_at
    from collection_entries where card_id = ${dup}
    on conflict (card_id, variant, condition) do update set
      quantity = collection_entries.quantity + excluded.quantity,
      purchase_price = coalesce(collection_entries.purchase_price, excluded.purchase_price)`);
  await db.delete(collectionEntries).where(sql`${collectionEntries.cardId} = ${dup}`);
  await db.execute(sql`
    insert into price_snapshots (card_id, variant, day, market, low, mid, high)
    select ${keep}, variant, day, market, low, mid, high from price_snapshots where card_id = ${dup}
    on conflict do nothing`);
  await db.delete(priceSnapshots).where(sql`${priceSnapshots.cardId} = ${dup}`);
  await db.delete(cards).where(sql`${cards.id} = ${dup}`);
}

/** Store today's price for every variant of the given cards. */
export async function snapshotPrices(list: Pick<CatalogCard, "id" | "prices">[]) {
  const day = today();
  const rows = list.flatMap((c) =>
    Object.entries(c.prices).map(([variant, p]) => ({
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

/**
 * Link sealed products to their TCGplayer product (by set group and name, or a numeric SKU that is a
 * TCGplayer product id), store its photo, and store today's TCGCSV price for every linked one. A price
 * entered by hand for the same day is never overwritten. Returns the number of products priced.
 */
export async function syncSealedPrices(csv: TcgcsvClient) {
  const db = await getDb();
  const products = await db.select().from(sealedProducts);
  const unlinked = products.filter((p) => p.tcgplayerProductId == null);
  if (unlinked.length) {
    const groups = await csv.groups();
    for (const p of unlinked) {
      const g = sealedGroup(groups, p);
      if (!g) continue;
      const items = await csv.products(g.groupId);
      const match = items.find((i) => p.sku && String(i.productId) === p.sku.trim()) ?? matchSealedProduct(items, p);
      if (!match) continue;
      p.tcgplayerProductId = match.productId;
      p.tcgplayerGroupId = g.groupId;
      p.imageUrl = productImage(match);
      await db
        .update(sealedProducts)
        .set({ tcgplayerProductId: match.productId, tcgplayerGroupId: g.groupId, imageUrl: p.imageUrl })
        .where(sql`${sealedProducts.id} = ${p.id}`);
    }
  }

  // Products linked before photos were stored (or whose photo TCGplayer added later) get one now.
  for (const p of products.filter((x) => x.tcgplayerProductId != null && x.tcgplayerGroupId != null && !x.imageUrl)) {
    const match = (await csv.products(p.tcgplayerGroupId!)).find((i) => i.productId === p.tcgplayerProductId);
    const url = match && productImage(match);
    if (url) await db.update(sealedProducts).set({ imageUrl: url }).where(sql`${sealedProducts.id} = ${p.id}`);
  }

  const linked = products.filter((p) => p.tcgplayerProductId != null && p.tcgplayerGroupId != null);
  const maps = new Map<number, Awaited<ReturnType<TcgcsvClient["priceMap"]>>>();
  for (const g of new Set(linked.map((p) => p.tcgplayerGroupId!))) maps.set(g, await csv.priceMap(g));
  const day = today();
  const rows = linked.flatMap((p) => {
    // Sealed products have one printing; take the first row that has a price.
    const r = maps.get(p.tcgplayerGroupId!)?.get(p.tcgplayerProductId!)?.find((x) => (x.marketPrice ?? x.midPrice) != null);
    if (!r) return [];
    return [{ sealedProductId: p.id, day, market: r.marketPrice ?? r.midPrice, low: r.lowPrice, mid: r.midPrice, high: r.highPrice, priceSource: "tcgcsv" }];
  });
  if (rows.length) {
    await db
      .insert(sealedPriceSnapshots)
      .values(rows)
      .onConflictDoUpdate({
        target: [sealedPriceSnapshots.sealedProductId, sealedPriceSnapshots.day],
        set: { market: sql`excluded.market`, low: sql`excluded.low`, mid: sql`excluded.mid`, high: sql`excluded.high`, priceSource: sql`excluded.price_source` },
        setWhere: sql`${sealedPriceSnapshots.priceSource} <> 'manual'`,
      });
  }
  return rows.length;
}

/** Browser lock held while a sync runs, so two tabs never sync at once. */
export const SYNC_LOCK = "price-sync";

/** `syncCollectionPrices`, after any sync already running in another tab has finished. */
export function syncPricesWhenFree() {
  return navigator.locks.request(SYNC_LOCK, () => syncCollectionPrices());
}

/**
 * Refresh prices for every card and sealed product in the collection, recording the outcome in sync_runs.
 * Cards not yet linked to TCGdex/TCGplayer are looked up first; linked cards cost one TCGCSV request per set.
 * Exchange rates and sealed prices are refreshed too; a failure in either is logged and never fails the card sync.
 */
export async function syncCollectionPrices() {
  await refreshFxRates().catch((e) => console.warn("Exchange rate refresh failed:", e));
  const db = await getDb();
  const [run] = await db.insert(syncRuns).values({ status: "running" }).returning();
  try {
    const clients = newClients();
    const ownedIds = (await db.selectDistinct({ id: collectionEntries.cardId }).from(collectionEntries)).map((o) => o.id);
    const owned = ownedIds.length
      ? await db
          .select({ id: cards.id, tcgdexId: cards.tcgdexId, tcgplayerGroupId: cards.tcgplayerGroupId, tcgplayerProductId: cards.tcgplayerProductId })
          .from(cards)
          .where(inArray(cards.id, ownedIds))
      : [];

    const toLink = owned.filter((c) => c.tcgdexId == null || c.tcgplayerProductId == null).map((c) => c.id);
    const fresh = await resolveByIds(toLink, clients);
    await linkTcgplayer([...fresh.values()], clients);
    await upsertCards([...fresh.values()]);

    const targets: Priceable[] = owned.map((c) => fresh.get(c.id) ?? { ...c, prices: {}, priceSource: null });
    await priceCards(targets, clients);
    const priced = targets.filter((c) => c.priceSource);
    const snapshots = await snapshotPrices(priced);
    const sealed = await syncSealedPrices(clients.csv).catch((e) => {
      console.warn("Sealed price sync failed:", e);
      return 0;
    });

    await db
      .update(syncRuns)
      .set({ status: "success", finishedAt: new Date(), cards: priced.length, prices: snapshots + sealed })
      .where(sql`${syncRuns.id} = ${run.id}`);
    return {
      cards: priced.length,
      snapshots,
      sealed,
      fromTcgcsv: priced.filter((c) => c.priceSource === "tcgcsv").length,
      fromTcgdex: priced.filter((c) => c.priceSource === "tcgdex").length,
      unpriced: owned.length - priced.length,
    };
  } catch (e) {
    await db
      .update(syncRuns)
      .set({ status: "failed", finishedAt: new Date(), error: e instanceof Error ? e.message : String(e) })
      .where(sql`${syncRuns.id} = ${run.id}`);
    throw e;
  }
}

