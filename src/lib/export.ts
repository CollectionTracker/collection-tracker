import { CURRENCY_INFO } from "./currencies";
import type { Money } from "./format";
import type { SealedHolding } from "./sealed-stats";
import type { Holding } from "./stats";
import { DEFAULT_SPREAD, rangeOf } from "./valuation";

/** What an export covers: a whole scope of the portfolio, or one holding. */
export type ExportTarget = { scope: "portfolio" | "raw" | "sealed" } | { raw: number } | { sealed: number };

type Cell = string | number | null;

/**
 * One row per holding. Column names line up with the CSV importers (`id`, `name`, `set`, `number`, `quantity`,
 * `condition`, `variant` for raw cards; `name`, `product type`, `set`, `sku`, `quantity` for sealed), so an export
 * can be imported again. Money columns avoid the importers' purchase-price names, since they are in the display
 * currency rather than USD.
 */
export const EXPORT_COLUMNS = [
  "kind",
  "id",
  "name",
  "set",
  "number",
  "rarity",
  "variant",
  "condition",
  "product type",
  "sku",
  "quantity",
  "currency",
  "market price",
  "value",
  "low",
  "high",
  "unit cost",
  "cost basis",
  "gain",
  "gain %",
  "change since last snapshot",
  "share of portfolio %",
  "as of",
] as const;

type Row = Partial<Record<(typeof EXPORT_COLUMNS)[number], Cell>>;

// Spreadsheets run a cell that starts with one of these as a formula, so text cells (card and product names come
// from imported files) get a leading apostrophe. Numbers are written as numbers and never need it.
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(v: Cell): string {
  if (v == null) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  const s = FORMULA_START.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** RFC 4180 CSV with CRLF line ends and a UTF-8 BOM, so Excel reads accents and currency symbols correctly. */
export function toCsv(rows: readonly (readonly Cell[])[]): string {
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

const round = (n: number, digits: number) => Number(n.toFixed(digits));

/**
 * Header plus one row per holding, raw cards first, each sorted by value. Amounts are converted to the display
 * currency and rounded to its decimals; percentages to two places.
 */
export function holdingRows(raw: Holding[], sealed: SealedHolding[], m: Money, portfolioValue: number, asOf: string): Cell[][] {
  const digits = CURRENCY_INFO[m.currency].decimals;
  const amt = (n: number | null) => (n == null ? null : round(n * m.rate, digits));
  const share = (v: number) => (portfolioValue > 0 ? round((v / portfolioValue) * 100, 2) : null);
  const gainPct = (value: number, cost: number | null) => (cost ? round(((value - cost) / cost) * 100, 2) : null);
  const byValue = <T extends { value: number }>(xs: T[]) => [...xs].sort((a, b) => b.value - a.value);

  const rawRows = byValue(raw).map((h): Row => {
    const r = rangeOf(h.value, DEFAULT_SPREAD.raw);
    return {
      kind: "Raw card",
      id: h.cardId,
      name: h.name,
      set: h.setName,
      number: h.number,
      rarity: h.rarity,
      variant: h.variant,
      condition: h.condition,
      quantity: h.quantity,
      "market price": amt(h.unit),
      value: amt(h.value),
      low: amt(r.low),
      high: amt(r.high),
      "unit cost": amt(h.cost == null ? null : h.cost / h.quantity),
      "cost basis": amt(h.cost),
      gain: amt(h.cost == null ? null : h.value - h.cost),
      "gain %": gainPct(h.value, h.cost),
      "change since last snapshot": amt(h.change),
      "share of portfolio %": share(h.value),
    };
  });
  const sealedRows = byValue(sealed).map(
    (h): Row => ({
      kind: "Sealed",
      name: h.name,
      set: h.setGroup,
      "product type": h.productType,
      sku: h.sku,
      quantity: h.quantity,
      "market price": amt(h.unit),
      value: amt(h.value),
      low: amt(h.valuation.low),
      high: amt(h.valuation.high),
      "unit cost": amt(h.unitCost),
      "cost basis": amt(h.cost),
      gain: amt(h.gain),
      "gain %": h.gainPct == null ? null : round(h.gainPct, 2),
      "share of portfolio %": share(h.value),
    }),
  );
  const line = (r: Row) => EXPORT_COLUMNS.map((c) => r[c] ?? null);
  return [[...EXPORT_COLUMNS], ...[...rawRows, ...sealedRows].map((r) => line({ ...r, currency: m.currency, "as of": asOf }))];
}

/** Parses the export query string; null when it names nothing exportable. */
export function parseExportTarget(params: URLSearchParams): ExportTarget | null {
  const id = (key: string) => {
    const v = params.get(key);
    return v && /^\d+$/.test(v) ? Number(v) : null;
  };
  const raw = id("raw");
  if (raw != null) return { raw };
  const sealed = id("sealed");
  if (sealed != null) return { sealed };
  const scope = params.get("scope") ?? "portfolio";
  return scope === "portfolio" || scope === "raw" || scope === "sealed" ? { scope } : null;
}

/**
 * Query string naming the CSV export of `target` at a snapshot day, or at current prices when `asOf` is null.
 * `ExportLink` builds the file from it in the browser.
 */
export function exportHref(target: ExportTarget, asOf: string | null = null): string {
  const q = new URLSearchParams();
  if ("scope" in target) q.set("scope", target.scope);
  else if ("raw" in target) q.set("raw", String(target.raw));
  else q.set("sealed", String(target.sealed));
  if (asOf) q.set("snapshot", asOf);
  return `?${q}`;
}

/** e.g. `collection-portfolio-2026-10-23-usd.csv`, `collection-holding-umbreon-ex-2026-10-23-jpy.csv`. */
export function exportFilename(what: string, asOf: string, m: Money): string {
  const slug = what
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `collection-${slug || "export"}-${asOf}-${m.currency.toLowerCase()}.csv`;
}
