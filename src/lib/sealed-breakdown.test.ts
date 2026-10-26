import assert from "node:assert/strict";
import { test } from "node:test";
import { byType, bySetGroup, priceCoverage, returnsByType, sealedMovers, sealedTypeLabel } from "./sealed-breakdown";
import type { SealedHolding } from "./sealed-stats";

const h = (id: number, over: Partial<SealedHolding>): SealedHolding => ({
  id,
  name: `Product ${id}`,
  productType: "etb",
  setGroup: "151",
  sku: null,
  quantity: 1,
  unit: 100,
  value: 100,
  unitCost: null,
  cost: null,
  gain: null,
  gainPct: null,
  valuation: { low: 85, mid: 100, high: 115 },
  change: null,
  changePct: null,
  priceDay: "2026-10-26",
  priceSource: "tcgcsv",
  linked: true,
  ...over,
});

const HOLDINGS = [
  h(1, { quantity: 2, value: 240, cost: 120 }),
  h(2, { productType: "booster_box", setGroup: "Surging Sparks", value: 300, cost: 280, change: -12 }),
  h(3, { productType: "etb", setGroup: null, value: 80, change: 6, priceSource: "manual", linked: false, priceDay: "2026-10-01" }),
  h(4, { productType: "tin", value: 0, priceSource: null, priceDay: null, linked: false }),
];

test("product types have display names", () => {
  assert.equal(sealedTypeLabel("booster_box"), "Booster Box");
  assert.equal(sealedTypeLabel("upc"), "Ultra Premium Collection");
  assert.equal(sealedTypeLabel("Mystery"), "Mystery");
});

test("value by type and by set group, largest first", () => {
  assert.deepEqual(byType(HOLDINGS), [
    { label: "Elite Trainer Box", value: 320, units: 3, products: 2 },
    { label: "Booster Box", value: 300, units: 1, products: 1 },
    { label: "Tin", value: 0, units: 1, products: 1 },
  ]);
  assert.deepEqual(
    bySetGroup(HOLDINGS).map((b) => [b.label, b.value]),
    [["Surging Sparks", 300], ["151", 240], ["No set", 80]],
  );
});

test("returns by type only count products with a known cost", () => {
  const r = returnsByType(HOLDINGS);
  assert.deepEqual(r.map((t) => [t.label, t.cost, t.gain, t.gainPct]), [
    ["Elite Trainer Box", 120, 120, 100],
    ["Booster Box", 280, 20, (20 / 280) * 100],
    ["Tin", null, null, null],
  ]);
});

test("price coverage counts sources and flags week-old prices", () => {
  const c = priceCoverage(HOLDINGS, "2026-10-26");
  assert.equal(c.tcgcsv, 2);
  assert.equal(c.manual, 1);
  assert.equal(c.unpriced, 1);
  assert.equal(c.linked, 2);
  assert.deepEqual(c.stale.map((x) => x.id), [3]);
});

test("movers are gainers then losers by size of move", () => {
  assert.deepEqual(sealedMovers(HOLDINGS).map((x) => x.id), [3, 2]);
});
