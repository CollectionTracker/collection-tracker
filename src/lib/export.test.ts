import assert from "node:assert/strict";
import { test } from "node:test";
import Papa from "papaparse";
import { EXPORT_COLUMNS, exportFilename, exportHref, holdingRows, parseExportTarget, toCsv } from "./export";
import type { SealedHolding } from "./sealed-stats";
import type { Holding } from "./stats";

const card = (over: Partial<Holding> = {}): Holding => ({
  id: 1,
  cardId: "sv1-1",
  name: "Pikachu ex",
  number: "1",
  rarity: "Rare",
  image: null,
  imageLarge: null,
  setId: "sv1",
  setName: "Scarlet & Violet",
  variant: "holofoil",
  condition: "NM",
  quantity: 2,
  unit: 50,
  value: 100,
  change: 10,
  changePct: 11.1,
  cost: 80,
  ...over,
});

const box: SealedHolding = {
  id: 3,
  name: "151 ETB",
  productType: "etb",
  setGroup: "151",
  sku: null,
  quantity: 4,
  unit: 100,
  value: 400,
  unitCost: 50,
  cost: 200,
  gain: 200,
  gainPct: 100,
  valuation: { low: 350, mid: 400, high: 500 },
  change: null,
  changePct: null,
  priceDay: "2026-10-26",
  priceSource: "manual",
  linked: false,
};

/** Parses the CSV back as the importers do, keyed by lower-case header. */
const parse = (csv: string) =>
  Papa.parse<Record<string, string>>(csv.trim(), { header: true, transformHeader: (h) => h.trim().toLowerCase() }).data;

test("toCsv quotes commas, quotes and newlines, and adds a BOM and CRLF", () => {
  const csv = toCsv([
    ["a", "b"],
    ['Say "hi", ok', "two\nlines"],
  ]);
  assert.equal(csv, '﻿a,b\r\n"Say ""hi"", ok","two\nlines"\r\n');
});

test("toCsv defuses spreadsheet formulas in text but not in numbers", () => {
  assert.equal(toCsv([["=HYPERLINK(1)", "@x", "+1", "-1", -1, 0, null]]), "﻿'=HYPERLINK(1),'@x,'+1,'-1,-1,0,\r\n");
});

test("holdingRows: raw before sealed, by value, converted and rounded to the currency's decimals", () => {
  const rows = holdingRows([card({ id: 2, value: 10, unit: 5 }), card()], [box], { currency: "JPY", rate: 150.123 }, 1000, "2026-10-23");
  assert.deepEqual(rows[0], [...EXPORT_COLUMNS]);
  const data = parse(toCsv(rows));
  assert.equal(data.length, 3);
  const [top, , sealed] = data;
  assert.equal(top.kind, "Raw card");
  assert.equal(top.value, "15012"); // 100 × 150.123, no decimals for JPY
  assert.equal(top["unit cost"], "6005"); // 40 a card
  assert.equal(top.gain, "3002");
  assert.equal(top["gain %"], "25");
  assert.equal(top["share of portfolio %"], "10");
  assert.equal(top.currency, "JPY");
  assert.equal(top["as of"], "2026-10-23");
  assert.equal(data[1].value, "1501");
  assert.equal(sealed.kind, "Sealed");
  assert.equal(sealed["product type"], "etb");
  assert.equal(sealed.set, "151");
  assert.equal(sealed.id, "");
  assert.equal(sealed["change since last snapshot"], "");
});

test("holdingRows leaves unknown cost and share empty", () => {
  const [row] = parse(toCsv(holdingRows([card({ cost: null })], [], { currency: "USD", rate: 1 }, 0, "2026-10-23")));
  assert.equal(row["cost basis"], "");
  assert.equal(row.gain, "");
  assert.equal(row["share of portfolio %"], "");
});

test("raw rows carry the columns the card importer reads", () => {
  const [row] = parse(toCsv(holdingRows([card()], [], { currency: "USD", rate: 1 }, 100, "2026-10-23")));
  assert.equal(row.id, "sv1-1");
  assert.equal(row.set, "Scarlet & Violet");
  assert.equal(row.number, "1");
  assert.equal(row.quantity, "2");
  assert.equal(row.condition, "NM");
  assert.equal(row.variant, "holofoil");
  // No column the importer would take as a USD purchase price.
  for (const alias of ["purchase price", "price paid", "cost", "paid", "price"]) assert.equal(row[alias], undefined);
});

test("export targets round-trip through the URL", () => {
  const back = (href: string) => parseExportTarget(new URL(href, "http://x").searchParams);
  assert.deepEqual(back(exportHref({ scope: "sealed" }, "2026-01-02")), { scope: "sealed" });
  assert.equal(new URL(exportHref({ raw: 7 }, "2026-01-02"), "http://x").searchParams.get("snapshot"), "2026-01-02");
  assert.deepEqual(back(exportHref({ raw: 7 })), { raw: 7 });
  assert.deepEqual(back(exportHref({ sealed: 3 })), { sealed: 3 });
  assert.deepEqual(parseExportTarget(new URLSearchParams()), { scope: "portfolio" });
  assert.equal(parseExportTarget(new URLSearchParams("scope=all")), null);
  assert.deepEqual(parseExportTarget(new URLSearchParams("raw=abc")), { scope: "portfolio" });
});

test("exportFilename slugs the name", () => {
  assert.equal(exportFilename("holding-Pokémon Center ETB (151)", "2026-10-23", { currency: "EUR", rate: 1 }), "collection-holding-pokemon-center-etb-151-2026-10-23-eur.csv");
  assert.equal(exportFilename("!!!", "2026-10-23", { currency: "USD", rate: 1 }), "collection-export-2026-10-23-usd.csv");
});
