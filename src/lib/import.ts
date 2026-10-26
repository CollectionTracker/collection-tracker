import Papa from "papaparse";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { collectionEntries } from "@/db/schema";
import { type CatalogCard, linkTcgplayer, newClients, priceCards, resolveByIds, resolveCard } from "./catalog";
import { snapshotPrices, upsertCards } from "./sync";

const ALIASES: Record<string, string[]> = {
  id: ["id", "card id", "api id"],
  name: ["name", "card name", "product name", "card"],
  setName: ["set", "set name", "edition", "expansion"],
  setId: ["set id", "set code", "setcode"],
  number: ["number", "card number", "collector number", "no", "card #"],
  quantity: ["quantity", "qty", "count", "total quantity", "add to quantity"],
  condition: ["condition"],
  variant: ["variant", "printing", "finish", "foil"],
  price: ["purchase price", "price paid", "cost", "paid", "price"],
};

const CONDITIONS: [RegExp, string][] = [
  [/near|^nm/i, "NM"],
  [/light|^lp|slight/i, "LP"],
  [/moder|^mp/i, "MP"],
  [/heav|^hp/i, "HP"],
  [/damag|^dmg/i, "DMG"],
];

function normVariant(v: string | undefined): string | null {
  if (!v) return null;
  const s = v.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!s || s === "no" || s === "false") return null;
  const first = s.includes("1st") || s.includes("firstedition");
  if (s.includes("reverse")) return "reverseHolofoil";
  if (s.includes("holo") || s === "foil" || s === "yes" || s === "true") return first ? "1stEditionHolofoil" : "holofoil";
  if (s.includes("normal") || s.includes("nonfoil")) return first ? "1stEditionNormal" : "normal";
  return null;
}

type Row = {
  id?: string;
  name?: string;
  setName?: string;
  setId?: string;
  number?: string;
  quantity: number;
  condition: string;
  variant: string | null;
  price: number | null;
};

function mapRows(text: string): Row[] {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  return parsed.data.map((raw) => {
    const get = (k: string) => {
      for (const a of ALIASES[k]) if (raw[a]?.trim()) return raw[a].trim();
    };
    const cond = get("condition") ?? "NM";
    return {
      id: get("id"),
      name: get("name"),
      setName: get("setName"),
      setId: get("setId"),
      number: get("number"),
      quantity: Math.max(1, parseInt(get("quantity") ?? "1", 10) || 1),
      condition: CONDITIONS.find(([re]) => re.test(cond))?.[1] ?? "NM",
      variant: normVariant(get("variant")),
      price: parseFloat((get("price") ?? "").replace(/[^0-9.]/g, "")) || null,
    };
  });
}

export type ImportResult = { imported: number; copies: number; failed: { row: number; reason: string }[] };

export async function importCsv(text: string): Promise<ImportResult> {
  const rows = mapRows(text);
  const failed: ImportResult["failed"] = [];
  const resolved: (CatalogCard | null)[] = new Array(rows.length).fill(null);
  const clients = newClients();

  // Rows that carry a card id (ours, TCGdex's or the Pokémon TCG API's) resolve directly; the rest are searched one by one.
  const ids = [...new Set(rows.map((r) => r.id).filter((x): x is string => !!x))];
  const byId = await resolveByIds(ids, clients);
  const queue: number[] = [];
  rows.forEach((r, i) => {
    if (r.id && byId.has(r.id)) resolved[i] = byId.get(r.id)!;
    else queue.push(i);
  });
  const cache = new Map<string, CatalogCard | null>();
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let i = queue.shift(); i !== undefined; i = queue.shift()) {
        const r = rows[i];
        const key = [r.name, r.setId, r.setName, r.number].join("|").toLowerCase();
        try {
          if (!cache.has(key)) cache.set(key, await resolveCard(r, clients));
          resolved[i] = cache.get(key) ?? null;
        } catch (e) {
          failed.push({ row: i + 2, reason: `lookup failed: ${e}` });
        }
        if (!resolved[i] && !failed.some((f) => f.row === i + 2)) failed.push({ row: i + 2, reason: "no matching card" });
      }
    }),
  );

  const byCard = new Map(resolved.filter((c): c is CatalogCard => !!c).map((c) => [c.id, c]));
  const matched = [...byCard.values()];
  await linkTcgplayer(matched, clients);
  await priceCards(matched, clients);
  await upsertCards(matched);
  await snapshotPrices(matched);

  // Merge duplicate rows (same card/variant/condition) before writing.
  const merged = new Map<string, typeof collectionEntries.$inferInsert>();
  let copies = 0;
  rows.forEach((r, i) => {
    // Rows for one card may hold different lookups of it; only the copy in `byCard` was priced.
    const card = resolved[i] && byCard.get(resolved[i].id);
    if (!card) return;
    const variants = Object.keys(card.prices);
    const variant = r.variant && (!variants.length || variants.includes(r.variant))
      ? r.variant
      : variants.includes("normal") ? "normal" : (variants[0] ?? "normal");
    const key = `${card.id}|${variant}|${r.condition}`;
    const prev = merged.get(key);
    copies += r.quantity;
    if (prev) prev.quantity = (prev.quantity ?? 0) + r.quantity;
    else merged.set(key, { cardId: card.id, variant, condition: r.condition, quantity: r.quantity, purchasePrice: r.price });
  });
  if (merged.size) {
    const db = await getDb();
    await db
      .insert(collectionEntries)
      .values([...merged.values()])
      .onConflictDoUpdate({
        target: [collectionEntries.cardId, collectionEntries.variant, collectionEntries.condition],
        set: {
          quantity: sql`${collectionEntries.quantity} + excluded.quantity`,
          purchasePrice: sql`coalesce(excluded.purchase_price, ${collectionEntries.purchasePrice})`,
        },
      });
  }
  return { imported: merged.size, copies, failed: failed.sort((a, b) => a.row - b.row) };
}
