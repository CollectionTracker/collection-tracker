import { z } from "zod";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { sealedPriceSnapshots, sealedProducts } from "@/db/schema";

const money = z.number().finite().positive();

export const sealedPriceInput = z
  .object({
    sealedProductId: z.number().int().positive(),
    market: money,
    low: money.nullish(),
    high: money.nullish(),
    // Defaults to today; pass a date to back-fill or correct an earlier day.
    day: z.iso.date().optional(),
  })
  .refine((v) => v.low == null || v.low <= v.market, { message: "low must not exceed the current value", path: ["low"] })
  .refine((v) => v.high == null || v.high >= v.market, { message: "high must not be below the current value", path: ["high"] });

export type SealedPriceInput = z.input<typeof sealedPriceInput>;

/** Enter or edit the manual price of a sealed product for a day (default today). */
export async function setSealedPrice(input: SealedPriceInput) {
  const v = sealedPriceInput.parse(input);
  const db = await getDb();
  const [product] = await db
    .select({ id: sealedProducts.id })
    .from(sealedProducts)
    .where(sql`${sealedProducts.id} = ${v.sealedProductId}`);
  if (!product) throw new Error(`Sealed product ${v.sealedProductId} not found`);
  const row = {
    sealedProductId: v.sealedProductId,
    day: v.day ?? new Date().toISOString().slice(0, 10),
    market: v.market,
    low: v.low ?? null,
    high: v.high ?? null,
    priceSource: "manual",
  };
  await db
    .insert(sealedPriceSnapshots)
    .values(row)
    .onConflictDoUpdate({
      target: [sealedPriceSnapshots.sealedProductId, sealedPriceSnapshots.day],
      set: { market: row.market, low: row.low, high: row.high, priceSource: row.priceSource },
    });
  return row;
}
