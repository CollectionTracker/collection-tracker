import assert from "node:assert/strict";
import { test } from "node:test";
import { rawAsset, sealedAsset } from "./asset-detail";
import type { SealedHolding } from "./sealed-stats";
import type { Holding } from "./stats";
import { DEFAULT_SPREAD, rangeOf } from "./valuation";

const card: Holding = {
  id: 1,
  cardId: "sv1-1",
  name: "Pikachu ex",
  number: "1",
  rarity: "Special Illustration Rare",
  image: "small.png",
  imageLarge: "large.png",
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
};

test("raw asset: range from the default spread, gain on cost and share of the portfolio", () => {
  const a = rawAsset(card, 400);
  assert.equal(a.kind, "Raw card");
  assert.deepEqual(a.meta, ["Scarlet & Violet", "#1", "Special Illustration Rare", "holofoil", "NM"]);
  assert.equal(a.image, "large.png");
  assert.deepEqual(a.range, rangeOf(100, DEFAULT_SPREAD.raw));
  assert.equal(a.gain, 20);
  assert.equal(a.gainPct, 25);
  assert.equal(a.change, 10);
  assert.equal(a.sharePct, 25);
});

test("raw asset without a purchase price or portfolio value", () => {
  const a = rawAsset({ ...card, cost: null, imageLarge: null }, 0);
  assert.equal(a.image, "small.png");
  assert.equal(a.gain, null);
  assert.equal(a.gainPct, null);
  assert.equal(a.sharePct, null);
});

test("sealed asset keeps its entered range and skips missing details", () => {
  const h: SealedHolding = {
    id: 3,
    name: "151 ETB",
    productType: "Elite Trainer Box",
    setGroup: null,
    sku: "ABC",
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
  const a = sealedAsset(h, 1000);
  assert.equal(a.kind, "Sealed");
  assert.deepEqual(a.meta, ["Elite Trainer Box", "SKU ABC"]);
  assert.deepEqual(a.range, h.valuation);
  assert.equal(a.change, null);
  assert.equal(a.sharePct, 40);
});
