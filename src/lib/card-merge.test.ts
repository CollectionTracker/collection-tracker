// The quick-add and sync paths against an in-memory database, for cards stored under legacy (Pokémon TCG API) ids.
import assert from "node:assert/strict";
import path from "node:path";
import { before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { cards, collectionEntries, priceSnapshots, sets } from "@/db/schema";
import { type CatalogCard, newClients, resolveByIds } from "./catalog";
import { upsertCards } from "./sync";
import type { DexCard } from "./tcgdex";

const db = drizzle({ client: new PGlite(), schema });
(globalThis as unknown as { __db: Promise<typeof db> }).__db = Promise.resolve(db);

const MEW: DexCard = { id: "sv03.5-151", localId: "151", name: "Mew ex", category: "Pokemon", set: { id: "sv03.5", name: "151" } } as DexCard;
const dex = {
  card: async (id: string) => (id === MEW.id ? MEW : null),
  cardByAnyId: async (id: string) => (id === MEW.id || id === "sv3pt5-151" ? MEW : null),
  set: async () => ({ ...MEW.set, cards: [] }),
} as unknown as ReturnType<typeof newClients>["dex"];

before(async () => {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
});

async function seedLegacyMew() {
  await db.delete(priceSnapshots);
  await db.delete(collectionEntries);
  await db.delete(cards);
  await db.delete(sets);
  await db.insert(sets).values({ id: "sv3pt5", name: "151", series: "Scarlet & Violet", total: 207, printedTotal: 165 });
  await db.insert(cards).values({ id: "sv3pt5-151", name: "Mew ex", setId: "sv3pt5", number: "151" });
  await db.insert(collectionEntries).values({ cardId: "sv3pt5-151", variant: "holofoil", condition: "NM", quantity: 4, purchasePrice: 3 });
}

const catalog = (id: string, setId: string): CatalogCard => ({
  id,
  tcgdexId: MEW.id,
  name: "Mew ex",
  number: "151",
  rarity: null,
  supertype: "Pokémon",
  images: {},
  set: { id: setId, tcgdexId: "sv03.5", name: "151", series: "Scarlet & Violet", total: 207, printedTotal: 165, releaseDate: null, logo: null, abbreviation: null },
  tcgplayerProductId: null,
  tcgplayerGroupId: null,
  productIds: [],
  prices: {},
  priceSource: null,
});

test("a TCGdex id resolves to the unlinked legacy row with the same set and number", async () => {
  await seedLegacyMew();
  const found = await resolveByIds([MEW.id], { dex, csv: newClients().csv });
  assert.equal(found.get(MEW.id)?.id, "sv3pt5-151");
  assert.equal(found.get(MEW.id)?.set.id, "sv3pt5");
});

test("upsertCards merges a duplicate that already holds the TCGdex id into the legacy row", async () => {
  await seedLegacyMew();
  // The duplicate a quick-add used to create: its own set and card rows under TCGdex ids.
  await upsertCards([catalog(MEW.id, "sv03.5")]);
  await db.insert(collectionEntries).values([
    { cardId: MEW.id, variant: "holofoil", condition: "NM", quantity: 1, purchasePrice: 5 },
    { cardId: MEW.id, variant: "holofoil", condition: "LP", quantity: 2 },
  ]);
  await db.insert(priceSnapshots).values({ cardId: MEW.id, variant: "holofoil", day: "2026-10-01", market: 7 });

  // The sync links the legacy row to the same TCGdex id.
  await upsertCards([catalog("sv3pt5-151", "sv3pt5")]);

  const rows = await db.select({ id: cards.id, tcgdexId: cards.tcgdexId }).from(cards);
  assert.deepEqual(rows, [{ id: "sv3pt5-151", tcgdexId: MEW.id }]);
  const entries = await db
    .select({ condition: collectionEntries.condition, quantity: collectionEntries.quantity, paid: collectionEntries.purchasePrice })
    .from(collectionEntries)
    .where(eq(collectionEntries.cardId, "sv3pt5-151"))
    .orderBy(collectionEntries.condition);
  assert.deepEqual(entries, [
    { condition: "LP", quantity: 2, paid: null },
    { condition: "NM", quantity: 5, paid: 3 },
  ]);
  assert.equal((await db.select().from(priceSnapshots).where(eq(priceSnapshots.cardId, "sv3pt5-151"))).length, 1);
});
