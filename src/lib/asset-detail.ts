import { exportHref } from "./export";
import { sealedTypeLabel } from "./sealed-breakdown";
import { productImageAt } from "./tcgcsv";
import type { SealedHolding } from "./sealed-stats";
import type { Holding } from "./stats";
import { DEFAULT_SPREAD, type Range, rangeOf } from "./valuation";

/**
 * One holding (a whole stack) as shown in the asset detail sheet. Amounts are USD and formatted on the client with
 * the display currency, so this stays plain, serializable data.
 */
export type AssetDetail = {
  kind: "Raw card" | "Sealed";
  name: string;
  /** Identifying details, e.g. set, number, rarity, variant and condition. */
  meta: string[];
  image: string | null;
  /** Sealed product type, drawn as a placeholder when there is no image. */
  productType: string | null;
  quantity: number;
  unit: number;
  range: Range;
  cost: number | null;
  gain: number | null;
  gainPct: number | null;
  /** Change since the previous price; null when there is no earlier price. */
  change: number | null;
  changePct: number | null;
  /** Share of the whole portfolio's value, null when the portfolio has no value. */
  sharePct: number | null;
  /** CSV export of this one holding. */
  exportHref: string;
};

const share = (value: number, total: number) => (total > 0 ? (value / total) * 100 : null);
const gainOf = (value: number, cost: number | null) => (cost == null ? null : value - cost);
const gainPctOf = (value: number, cost: number | null) => (cost ? ((value - cost) / cost) * 100 : null);

/** `asOf` is the snapshot day being shown, null for current prices. */
export function rawAsset(h: Holding, portfolioValue: number, asOf: string | null = null): AssetDetail {
  return {
    kind: "Raw card",
    name: h.name,
    meta: [h.setName, `#${h.number}`, h.rarity, h.variant, h.condition],
    image: h.imageLarge ?? h.image,
    productType: null,
    quantity: h.quantity,
    unit: h.unit,
    range: rangeOf(h.value, DEFAULT_SPREAD.raw),
    cost: h.cost,
    gain: gainOf(h.value, h.cost),
    gainPct: gainPctOf(h.value, h.cost),
    change: h.change,
    changePct: h.changePct,
    sharePct: share(h.value, portfolioValue),
    exportHref: exportHref({ raw: h.id }, asOf),
  };
}

export function sealedAsset(h: SealedHolding, portfolioValue: number, asOf: string | null = null): AssetDetail {
  return {
    kind: "Sealed",
    name: h.name,
    meta: [sealedTypeLabel(h.productType), h.setGroup, h.sku && `SKU ${h.sku}`].filter((x): x is string => !!x),
    image: h.image && productImageAt(h.image, "400w"),
    productType: h.productType,
    quantity: h.quantity,
    unit: h.unit,
    range: h.valuation,
    cost: h.cost,
    gain: h.gain,
    gainPct: h.gainPct,
    change: h.change,
    changePct: h.changePct,
    sharePct: share(h.value, portfolioValue),
    exportHref: exportHref({ sealed: h.id }, asOf),
  };
}
