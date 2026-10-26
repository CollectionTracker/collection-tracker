// Save the add dialog's review list: cards go through the same price-and-store path as the CSV import, sealed products
// through the sealed importer, then the new sealed products are linked and priced right away.
import { z } from "zod";
import { CONDITIONS, type CommitResult, SEALED_TYPES } from "./add-types";
import { newClients, resolveByIds } from "./catalog";
import { type Row, saveCards } from "./import";
import { saveSealed } from "./import-sealed";
import { syncSealedPrices } from "./sync";

const quantity = z.number().int().min(1).max(100_000);
const paid = z.number().finite().min(0).max(10_000_000).nullable();

export const commitInput = z.object({
  items: z
    .array(
      z.discriminatedUnion("kind", [
        z.object({
          kind: z.literal("card"),
          id: z.string().min(1).max(100),
          variant: z.string().max(60).nullable(),
          condition: z.enum(CONDITIONS),
          quantity,
          paid,
        }),
        z.object({
          kind: z.literal("sealed"),
          name: z.string().trim().min(1).max(200),
          type: z.enum(SEALED_TYPES),
          group: z.string().trim().max(200).nullable(),
          productId: z.number().int().positive().nullable(),
          groupId: z.number().int().positive().nullable(),
          quantity,
          paid,
        }),
      ]),
    )
    .min(1)
    .max(500),
});

export type CommitInput = z.infer<typeof commitInput>;

export async function commitItems(input: CommitInput): Promise<CommitResult> {
  const result: CommitResult = { cards: { entries: 0, copies: 0 }, sealed: { products: 0, units: 0 }, failed: [] };

  const cardItems = input.items.flatMap((i) => (i.kind === "card" ? [i] : []));
  if (cardItems.length) {
    const clients = newClients();
    const found = await resolveByIds([...new Set(cardItems.map((c) => c.id))], clients);
    const rows: Row[] = [];
    const resolved = [];
    for (const c of cardItems) {
      const card = found.get(c.id);
      if (!card) {
        result.failed.push(`Card ${c.id} was not found in the catalog`);
        continue;
      }
      rows.push({ id: c.id, quantity: c.quantity, condition: c.condition, variant: c.variant, price: c.paid });
      resolved.push(card);
    }
    if (rows.length) result.cards = await saveCards(rows, resolved, clients).then((r) => ({ entries: r.imported, copies: r.copies }));
  }

  const sealedItems = input.items.flatMap((i) => (i.kind === "sealed" ? [i] : []));
  if (sealedItems.length) {
    const saved = await saveSealed(
      sealedItems.map((s) => ({
        name: s.name,
        type: s.type,
        group: s.group,
        sku: null,
        quantity: s.quantity,
        price: s.paid,
        notes: null,
        tcgplayerProductId: s.productId,
        tcgplayerGroupId: s.groupId,
      })),
    );
    result.sealed = { products: saved.imported, units: saved.units };
    // Link and price the new products now (and fetch their photo) so they show a value without waiting for the daily sync.
    await syncSealedPrices(newClients().csv).catch((e) => console.warn("Sealed price sync after add failed:", e));
  }
  return result;
}
