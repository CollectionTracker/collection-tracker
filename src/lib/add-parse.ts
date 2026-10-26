// Bulk add: read a CSV into review rows, matching each line to the catalog and reading every field the dialog has
// (quantity, condition, printing, price paid, product type), so the user only fixes what is wrong.
import Papa from "papaparse";
import { normCondition, normVariant } from "./import";
import { normType } from "./import-sealed";
import { type CardSuggestion, type DraftRow, type SealedSuggestion } from "./add-types";
import { searchCards, searchSealed, sealedSuggestion } from "./add-search";
import { inferSealedType, pickPrice } from "./add-query";
import { type CatalogCard, newClients, resolveByIds, resolveCard } from "./catalog";
import { matchSealedProduct, sealedGroup } from "./tcgcsv";

const ALIASES: Record<string, string[]> = {
  kind: ["kind", "item type", "card or sealed"],
  id: ["id", "card id", "api id"],
  name: ["name", "card name", "product name", "card", "product", "item"],
  group: ["set", "set name", "edition", "expansion", "series", "group", "set group"],
  setId: ["set id", "set code", "setcode"],
  number: ["number", "card number", "collector number", "no", "card #"],
  type: ["type", "product type", "category"],
  sku: ["sku", "upc", "product id"],
  quantity: ["quantity", "qty", "count", "total quantity", "add to quantity"],
  condition: ["condition"],
  variant: ["variant", "printing", "finish", "foil"],
  price: ["purchase price", "price paid", "cost", "paid", "price"],
};

type Line = {
  kind: "card" | "sealed";
  id?: string;
  name?: string;
  group?: string;
  setId?: string;
  number?: string;
  type?: string;
  sku?: string;
  quantity: number;
  condition: DraftRow["condition"];
  variant: string | null;
  paid: number | null;
};

/** Which kind a line is: the file's own kind column, else a sealed product type, else card-only columns, else the name. */
export function lineKind(raw: { kind?: string; type?: string; number?: string; id?: string; setId?: string; name?: string }): "card" | "sealed" {
  if (raw.kind) {
    if (/seal|product|box|case/i.test(raw.kind)) return "sealed";
    if (/card|single/i.test(raw.kind)) return "card";
  }
  if (raw.type && normType(raw.type)) return "sealed";
  if (raw.number || raw.id || raw.setId) return "card";
  return raw.name && inferSealedType(raw.name) !== "other" ? "sealed" : "card";
}

export function readLines(text: string): Line[] {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  return parsed.data.flatMap((raw) => {
    const get = (k: string) => {
      for (const a of ALIASES[k]) if (raw[a]?.trim()) return raw[a].trim();
    };
    const f = { kind: get("kind"), id: get("id"), name: get("name"), group: get("group"), setId: get("setId"), number: get("number"), type: get("type"), sku: get("sku") };
    if (!f.name && !f.id) return [];
    const paid = parseFloat((get("price") ?? "").replace(/[^0-9.]/g, ""));
    return [
      {
        ...f,
        kind: lineKind(f),
        quantity: Math.max(1, parseInt(get("quantity") ?? "1", 10) || 1),
        condition: normCondition(get("condition")),
        variant: normVariant(get("variant")),
        paid: Number.isFinite(paid) && paid > 0 ? paid : null,
      },
    ];
  });
}

const MAX_LINES = 500;
let counter = 0;
const uid = () => `r${Date.now().toString(36)}${(counter++).toString(36)}`;

const suggestionOf = (c: CatalogCard): CardSuggestion => ({
  kind: "card",
  id: c.tcgdexId,
  name: c.name,
  setName: c.set.name,
  number: c.set.printedTotal ? `${c.number}/${c.set.printedTotal}` : c.number,
  rarity: c.rarity,
  image: c.images.small ?? null,
  price: pickPrice(c.prices),
  variants: Object.keys(c.prices),
  owned: 0,
});

/** Parse CSV text into review rows. Cards and sealed products are matched against TCGdex and TCGCSV; rows that can't be are left for the user. */
export async function parseImport(text: string): Promise<{ rows: DraftRow[]; skipped: number }> {
  const all = readLines(text);
  const lines = all.slice(0, MAX_LINES);
  const clients = newClients();
  const out: DraftRow[] = new Array(lines.length);

  const ids = [...new Set(lines.flatMap((l) => (l.kind === "card" && l.id ? [l.id] : [])))];
  const byId = await resolveByIds(ids, clients).catch(() => new Map<string, CatalogCard>());

  const base = (l: Line, query: string): DraftRow => ({
    uid: uid(),
    item: null,
    query,
    candidates: [],
    quantity: l.quantity,
    condition: l.condition,
    variant: l.variant,
    paid: l.paid,
  });

  const doCard = async (l: Line): Promise<DraftRow> => {
    const row = base(l, [l.name, l.group, l.number].filter(Boolean).join(" · ") || l.id || "");
    const hit = l.id ? byId.get(l.id) : undefined;
    if (hit) return { ...row, item: suggestionOf(hit) };
    // A name alone fits many cards: show the choices instead of guessing the first.
    if (!l.group && !l.setId && !l.number && l.name) {
      const found = await searchCards(l.name, clients.dex, 6);
      const exact = found.filter((c) => c.name.toLowerCase() === l.name!.toLowerCase());
      if (exact.length === 1) return { ...row, item: exact[0] };
      return { ...row, candidates: found, note: found.length ? "Pick the card" : "No matching card" };
    }
    const card = await resolveCard({ name: l.name, setId: l.setId, setName: l.group, number: l.number }, clients);
    if (card) return { ...row, item: suggestionOf(card) };
    const found = l.name ? await searchCards(l.name, clients.dex, 6) : [];
    return { ...row, candidates: found, note: found.length ? "No exact match; pick the card" : "No matching card" };
  };

  const doSealed = async (l: Line): Promise<DraftRow> => {
    const name = l.name ?? "";
    const type = (l.type && normType(l.type)) || inferSealedType(name);
    const row = base(l, name);
    const custom = (note: string, candidates: SealedSuggestion[] = []): DraftRow => ({
      ...row,
      item: { kind: "sealed", productId: null, groupId: null, name, group: l.group ?? null, type, image: null, price: null, owned: 0 },
      candidates,
      note,
    });
    try {
      const groups = await clients.csv.groups();
      const g = sealedGroup(groups, { name, setGroup: l.group ?? null });
      if (g) {
        const items = await clients.csv.products(g.groupId);
        const match = items.find((i) => l.sku && String(i.productId) === l.sku.trim()) ?? matchSealedProduct(items, { name, productType: type });
        if (match) {
          const r = (await clients.csv.priceMap(g.groupId))?.get(match.productId)?.find((x) => (x.marketPrice ?? x.midPrice) != null);
          return { ...row, item: { ...sealedSuggestion(match, g, r ? (r.marketPrice ?? r.midPrice) : null), type } };
        }
      }
      const found = await searchSealed([l.group, name].filter(Boolean).join(" "), clients.csv, 5);
      return custom(found.length ? "Not matched; pick a product or keep it as typed" : "Not in the catalog; added as typed, price by hand", found);
    } catch {
      return custom("Catalog unavailable; added as typed");
    }
  };

  const queue = lines.map((_, i) => i);
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let i = queue.shift(); i !== undefined; i = queue.shift()) {
        const l = lines[i];
        out[i] = await (l.kind === "card" ? doCard(l) : doSealed(l)).catch((e) => ({ ...base(l, l.name ?? ""), note: `Lookup failed: ${e instanceof Error ? e.message : e}` }));
      }
    }),
  );
  return { rows: out, skipped: all.length - lines.length };
}

