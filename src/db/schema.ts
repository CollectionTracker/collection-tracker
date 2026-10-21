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
  },
  (t) => [index("cards_set_idx").on(t.setId)],
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
