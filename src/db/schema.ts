import {
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const sets = pgTable("sets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  series: text("series").notNull(),
  total: integer("total").notNull(),
  printedTotal: integer("printed_total").notNull(),
  releaseDate: text("release_date"),
  logo: text("logo"),
  // TCGdex set id ("sv03.5"); null until a sync maps it. Ids stored before TCGdex are Pokémon TCG API ids ("sv3pt5").
  tcgdexId: text("tcgdex_id"),
});

export const cards = pgTable(
  "cards",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    setId: text("set_id")
      .notNull()
      .references(() => sets.id),
    number: text("number").notNull(),
    rarity: text("rarity"),
    supertype: text("supertype"),
    imageSmall: text("image_small"),
    imageLarge: text("image_large"),
    // Catalog and price links, filled by the sync: TCGdex card id and the TCGplayer product and group (TCGCSV) it is priced from.
    tcgdexId: text("tcgdex_id"),
    tcgplayerProductId: integer("tcgplayer_product_id"),
    tcgplayerGroupId: integer("tcgplayer_group_id"),
  },
  (t) => [index("cards_set_idx").on(t.setId), uniqueIndex("cards_tcgdex_idx").on(t.tcgdexId)],
);

export const collectionEntries = pgTable(
  "collection_entries",
  {
    id: serial("id").primaryKey(),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id),
    // TCGplayer price variant: normal, holofoil, reverseHolofoil, 1stEditionHolofoil, ...
    variant: text("variant").notNull().default("normal"),
    condition: text("condition").notNull().default("NM"),
    quantity: integer("quantity").notNull().default(1),
    purchasePrice: doublePrecision("purchase_price"), // per copy
    acquiredAt: date("acquired_at", { mode: "string" }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("entry_unique").on(t.cardId, t.variant, t.condition)],
);

export const priceSnapshots = pgTable(
  "price_snapshots",
  {
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id),
    variant: text("variant").notNull(),
    day: date("day", { mode: "string" }).notNull(),
    market: doublePrecision("market"),
    low: doublePrecision("low"),
    mid: doublePrecision("mid"),
    high: doublePrecision("high"),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.variant, t.day] })],
);

export const SEALED_PRODUCT_TYPES = [
  "etb",
  "case",
  "booster_box",
  "upc",
  "bundle",
  "tin",
  "other",
] as const;
export type SealedProductType = (typeof SEALED_PRODUCT_TYPES)[number];

export const sealedProducts = pgTable(
  "sealed_products",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    productType: text("product_type", { enum: SEALED_PRODUCT_TYPES }).notNull(),
    // Set or series the product belongs to; free text, sealed products rarely map 1:1 to a set.
    setGroup: text("set_group"),
    sku: text("sku"),
    quantity: integer("quantity").notNull().default(1),
    purchasePrice: doublePrecision("purchase_price"), // per unit
    notes: text("notes"),
    // TCGplayer product and group (TCGCSV) the daily sync prices this from; null until matched by set and name.
    tcgplayerProductId: integer("tcgplayer_product_id"),
    tcgplayerGroupId: integer("tcgplayer_group_id"),
    // TCGplayer product photo (200px wide), stored when the product is linked; null shows a placeholder for its type.
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("sealed_products_type_idx").on(t.productType),
    index("sealed_products_set_idx").on(t.setGroup),
  ],
);

export const sealedPriceSnapshots = pgTable(
  "sealed_price_snapshots",
  {
    sealedProductId: integer("sealed_product_id")
      .notNull()
      .references(() => sealedProducts.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    market: doublePrecision("market"),
    low: doublePrecision("low"),
    mid: doublePrecision("mid"),
    high: doublePrecision("high"),
    // Where the price came from: "manual" for hand-entered values, "tcgcsv" for the daily TCGplayer price.
    priceSource: text("price_source").notNull().default("manual"),
  },
  (t) => [primaryKey({ columns: [t.sealedProductId, t.day] })],
);

// A daily snapshot is the set of prices stored for a day; this table holds the optional label for that day.
export const snapshotLabels = pgTable("snapshot_labels", {
  day: date("day", { mode: "string" }).primaryKey(),
  label: text("label").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Exchange rates as units of `currency` per 1 USD (all prices are stored in USD), one row per rate day and currency.
// `day` is the publication date of the rates (ECB skips weekends), `fetched_at` when we last stored them.
export const fxRates = pgTable(
  "fx_rates",
  {
    day: date("day", { mode: "string" }).notNull(),
    currency: text("currency").notNull(),
    rate: doublePrecision("rate").notNull(),
    source: text("source").notNull(),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.day, t.currency] })],
);

// One row per price sync (Sync prices button, or automatic when the app is opened), so the header can show the last sync and whether it failed.
export const syncRuns = pgTable("sync_runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  status: text("status", { enum: ["running", "success", "failed"] }).notNull().default("running"),
  cards: integer("cards"),
  prices: integer("prices"),
  error: text("error"),
});
