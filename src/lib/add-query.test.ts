import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultVariant, inferSealedType, parseCardQuery, pickPrice, sealedGroupsFor, sealedScore, sealedTokens } from "./add-query";
import type { Group } from "./tcgcsv";

const group = (groupId: number, name: string, publishedOn: string, isSupplemental = false): Group => ({
  groupId,
  name,
  abbreviation: null,
  publishedOn: `${publishedOn}T00:00:00`,
  isSupplemental,
});

test("parseCardQuery splits a trailing collector number off the name", () => {
  assert.deepEqual(parseCardQuery("Mega Gengar 284"), { name: "mega gengar", number: "284" });
  assert.deepEqual(parseCardQuery("charizard 4/102"), { name: "charizard", number: "4" });
  assert.deepEqual(parseCardQuery("mega ge"), { name: "mega ge", number: null });
});

test("parseCardQuery keeps a lone number in the name", () => {
  assert.deepEqual(parseCardQuery("151"), { name: "151", number: null });
});

test("parseCardQuery ignores accents and punctuation", () => {
  assert.deepEqual(parseCardQuery("Pokémon  Mew-ex"), { name: "pokemon mew ex", number: null });
});

test("sealedTokens spells out abbreviations", () => {
  assert.deepEqual(sealedTokens("151 etb"), ["151", "elite", "trainer", "box"]);
  assert.deepEqual(sealedTokens("pris evo bb"), ["pris", "evo", "booster", "bundle"]);
});

test("sealedScore needs every word to start a word of the product", () => {
  const t = sealedTokens("pris evo bb");
  assert.ok(sealedScore(t, "Prismatic Evolutions Booster Bundle")! > 0);
  assert.equal(sealedScore(t, "Prismatic Evolutions Elite Trainer Box"), null);
  assert.equal(sealedScore([], "anything"), null);
});

test("sealedScore prefers the shorter name", () => {
  const t = sealedTokens("151 etb");
  assert.ok(sealedScore(t, "151 Elite Trainer Box")! > sealedScore(t, "151 Pokemon Center Elite Trainer Box")!);
});

test("sealedGroupsFor picks sets that share a word with the query, newest first", () => {
  const groups = [
    group(1, "SV: Scarlet & Violet 151", "2023-09-22"),
    group(2, "SV08: Surging Sparks", "2024-11-08"),
    group(3, "SV08.5: Prismatic Evolutions", "2025-01-17"),
  ];
  assert.deepEqual(sealedGroupsFor(groups, sealedTokens("151 etb")).map((g) => g.groupId), [1]);
  assert.deepEqual(sealedGroupsFor(groups, sealedTokens("surging booster")).map((g) => g.groupId), [2]);
});

test("sealedGroupsFor falls back to the newest main sets when no title matches", () => {
  const groups = [group(1, "Base Set", "1999-01-09"), group(2, "SV08: Surging Sparks", "2024-11-08"), group(3, "Promo Pack", "2025-02-01", true)];
  assert.deepEqual(sealedGroupsFor(groups, ["elite"], 1).map((g) => g.groupId), [2, 1]);
});

test("inferSealedType reads the product type from a name", () => {
  assert.equal(inferSealedType("Surging Sparks Elite Trainer Box"), "etb");
  assert.equal(inferSealedType("Surging Sparks Booster Box Case"), "case");
  assert.equal(inferSealedType("Surging Sparks Booster Box"), "booster_box");
  assert.equal(inferSealedType("Prismatic Evolutions Booster Bundle"), "bundle");
  assert.equal(inferSealedType("Ultra-Premium Collection"), "upc");
  assert.equal(inferSealedType("Pikachu Poster"), "other");
});

test("defaultVariant and pickPrice choose the usual printing", () => {
  assert.equal(defaultVariant(["holofoil", "normal"]), "normal");
  assert.equal(defaultVariant(["holofoil"]), "holofoil");
  assert.equal(defaultVariant([]), "normal");
  assert.equal(pickPrice({ holofoil: { market: 9 }, normal: { market: 1 } }), 1);
  assert.equal(pickPrice({ holofoil: { market: 9 } }), 9);
  assert.equal(pickPrice({}), null);
});
