import Papa from "papaparse";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { SEALED_PRODUCT_TYPES, type SealedProductType, sealedProducts } from "@/db/schema";

const ALIASES: Record<string, string[]> = {
  name: ["name", "product name", "product", "item"],
  type: ["type", "product type", "category"],
  group: ["set", "set name", "series", "group", "set group", "expansion"],
  sku: ["sku", "upc", "product id"],
  quantity: ["quantity", "qty", "count"],
  price: ["purchase price", "price paid", "cost", "paid", "price"],
  notes: ["notes", "note", "comments"],
};

const TYPES: [RegExp, SealedProductType][] = [
  [/elite|^etb/i, "etb"],
  [/booster\s*box|display/i, "booster_box"],
  [/case/i, "case"],
  [/ultra|^upc|premium/i, "upc"],
  [/bundle/i, "bundle"],
  [/tin/i, "tin"],
];

export function normType(v: string | undefined): SealedProductType | null {
  if (!v) return null;
  const s = v.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if ((SEALED_PRODUCT_TYPES as readonly string[]).includes(s)) return s as SealedProductType;
  return TYPES.find(([re]) => re.test(v))?.[1] ?? null;
}

export type SealedRow = {
  name: string;
  type: SealedProductType;
  group: string | null;
  sku: string | null;
  quantity: number;
  price: number | null;
  notes: string | null;
  /** TCGplayer product and group when the product was picked from the catalog. */
  tcgplayerProductId?: number | null;
  tcgplayerGroupId?: number | null;
};

export type SealedImportResult = {
  imported: number;
  units: number;
  failed: { row: number; reason: string }[];
};

function mapRows(text: string, failed: SealedImportResult["failed"]): { row: number; data: SealedRow }[] {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  const out: { row: number; data: SealedRow }[] = [];
  parsed.data.forEach((raw, i) => {
    const row = i + 2; // header is row 1
    const get = (k: string) => {
      for (const a of ALIASES[k]) if (raw[a]?.trim()) return raw[a].trim();
    };
    const name = get("name");
    if (!name) return void failed.push({ row, reason: "missing name" });
    const rawType = get("type");
    const type = normType(rawType);
    if (!type) return void failed.push({ row, reason: rawType ? `unknown product type "${rawType}"` : "missing product type" });
    const qtyText = get("quantity");
    const quantity = qtyText === undefined ? 1 : parseInt(qtyText, 10);
    if (!Number.isInteger(quantity) || quantity < 1) return void failed.push({ row, reason: `invalid quantity "${qtyText}"` });
    const priceText = get("price");
    const price = priceText === undefined ? null : parseFloat(priceText.replace(/[^0-9.]/g, ""));
    if (price !== null && !Number.isFinite(price)) return void failed.push({ row, reason: `invalid price "${priceText}"` });
    out.push({
      row,
      data: { name, type, group: get("group") ?? null, sku: get("sku") ?? null, quantity, price, notes: get("notes") ?? null },
    });
  });
  return out;
}

export async function importSealedCsv(text: string): Promise<SealedImportResult> {
  const failed: SealedImportResult["failed"] = [];
  const { imported, units } = await saveSealed(mapRows(text, failed).map((r) => r.data));
  return { imported, units, failed: failed.sort((a, b) => a.row - b.row) };
}

/** Add sealed products to the inventory: rows for one product merge, and a product already stored gains the quantity. */
export async function saveSealed(rows: SealedRow[]) {
  // Merge duplicate rows (same product) before writing; the unit price is the quantity-weighted mean.
  const merged = new Map<string, SealedRow & { priced: number }>();
  let units = 0;
  for (const r of rows) {
    const key = r.tcgplayerProductId != null ? `tcg:${r.tcgplayerProductId}` : [r.name, r.type, r.group ?? "", r.sku ?? ""].join("|").toLowerCase();
    units += r.quantity;
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, { ...r, priced: r.price === null ? 0 : r.quantity });
      continue;
    }
    if (r.price !== null) {
      const total = (prev.price ?? 0) * prev.priced + r.price * r.quantity;
      prev.priced += r.quantity;
      prev.price = total / prev.priced;
    }
    prev.quantity += r.quantity;
    prev.notes ??= r.notes;
  }

  const db = await getDb();
  for (const r of merged.values()) {
    const byName = and(
      sql`lower(${sealedProducts.name}) = ${r.name.toLowerCase()}`,
      eq(sealedProducts.productType, r.type),
      r.group === null ? isNull(sealedProducts.setGroup) : eq(sealedProducts.setGroup, r.group),
      r.sku === null ? isNull(sealedProducts.sku) : eq(sealedProducts.sku, r.sku),
    );
    const byProduct = r.tcgplayerProductId == null ? undefined : eq(sealedProducts.tcgplayerProductId, r.tcgplayerProductId);
    const [existing] =
      (byProduct && (await db.select().from(sealedProducts).where(byProduct).limit(1))) ||
      (await db.select().from(sealedProducts).where(byName).limit(1));
    if (existing) {
      await db
        .update(sealedProducts)
        .set({
          quantity: existing.quantity + r.quantity,
          purchasePrice: r.price ?? existing.purchasePrice,
          notes: existing.notes ?? r.notes,
          tcgplayerProductId: existing.tcgplayerProductId ?? r.tcgplayerProductId ?? null,
          tcgplayerGroupId: existing.tcgplayerGroupId ?? r.tcgplayerGroupId ?? null,
        })
        .where(eq(sealedProducts.id, existing.id));
    } else {
      await db.insert(sealedProducts).values({
        name: r.name,
        productType: r.type,
        setGroup: r.group,
        sku: r.sku,
        quantity: r.quantity,
        purchasePrice: r.price,
        notes: r.notes,
        tcgplayerProductId: r.tcgplayerProductId ?? null,
        tcgplayerGroupId: r.tcgplayerGroupId ?? null,
      });
    }
  }
  return { imported: merged.size, units };
}
