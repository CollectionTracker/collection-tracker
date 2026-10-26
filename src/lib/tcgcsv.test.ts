import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type Group,
  type Product,
  groupTitle,
  matchCardProduct,
  matchSealedProduct,
  normNumber,
  pricesByVariant,
  productImage,
  productImageAt,
  rankGroups,
  sealedGroup,
  variantKey,
} from "./tcgcsv";
import { dexPrices, dexProductIds, toDexSetId } from "./tcgdex";
import { sealedPreview } from "./card-preview";

const group = (groupId: number, name: string, abbreviation: string, publishedOn: string, isSupplemental = false): Group => ({
  groupId,
  name,
  abbreviation,
  publishedOn: `${publishedOn}T00:00:00`,
  isSupplemental,
});

// Real TCGCSV groups (category 3), trimmed.
const GROUPS = [
  group(604, "Base Set", "BS", "1999-01-09"),
  group(1663, "Base Set (Shadowless)", "BSS", "1999-01-09"),
  group(605, "Base Set 2", "BS2", "2000-02-24"),
  group(1428, "EX Team Rocket Returns", "RR", "2004-11-01"),
  group(17688, "SWSH: Crown Zenith", "CRZ", "2023-01-20"),
  group(17689, "SWSH: Crown Zenith: Galarian Gallery", "CRZ:GG", "2023-01-20"),
  group(22873, "SV01: Scarlet & Violet Base Set", "SVI", "2023-03-31"),
  group(23237, "SV: Scarlet & Violet 151", "MEW", "2023-09-22"),
  group(23651, "SV08: Surging Sparks", "SSP", "2024-11-08"),
  group(23821, "SV: Prismatic Evolutions", "PRE", "2025-01-17"),
];

const card = (productId: number, name: string, number?: string): Product => ({
  productId,
  groupId: 1,
  name,
  extendedData: number ? [{ name: "Number", value: number }, { name: "Rarity", value: "Rare" }] : [],
});
const sealed = (productId: number, name: string): Product => ({ productId, groupId: 1, name, extendedData: [] });

test("variant keys match the Pokémon TCG API's", () => {
  assert.equal(variantKey("Normal"), "normal");
  assert.equal(variantKey("Reverse Holofoil"), "reverseHolofoil");
  assert.equal(variantKey("1st Edition Holofoil"), "1stEditionHolofoil");
  assert.equal(variantKey("reverse-holofoil"), "reverseHolofoil");
  assert.equal(variantKey("1st-edition-normal"), "1stEditionNormal");
});

test("collector numbers compare without totals, zeros or case", () => {
  assert.equal(normNumber("006/165"), "6");
  assert.equal(normNumber("199"), "199");
  assert.equal(normNumber("GG69/GG70"), "GG69");
  assert.equal(normNumber("tg05"), "TG5");
  assert.equal(normNumber("0"), "0");
});

test("Pokémon TCG API set ids map to TCGdex ids", () => {
  assert.equal(toDexSetId("sv3pt5"), "sv03.5");
  assert.equal(toDexSetId("sv8"), "sv08");
  assert.equal(toDexSetId("sv10"), "sv10");
  assert.equal(toDexSetId("swsh12pt5gg"), "swsh12.5gg");
  assert.equal(toDexSetId("me1"), "me01");
  assert.equal(toDexSetId("base1"), "base1");
  assert.equal(toDexSetId("swsh7"), "swsh7");
});

test("group titles drop the series prefix", () => {
  assert.equal(groupTitle("SV08: Surging Sparks"), "surging sparks");
  assert.equal(groupTitle("SWSH: Crown Zenith: Galarian Gallery"), "crown zenith galarian gallery");
  assert.equal(groupTitle("EX Team Rocket Returns"), "ex team rocket returns");
});

test("sets find their TCGCSV group", () => {
  const best = (name: string, abbreviation?: string, releaseDate?: string) => rankGroups(GROUPS, { name, abbreviation, releaseDate })[0]?.groupId;
  assert.equal(best("Base Set", "BS", "1999-01-09"), 604);
  assert.equal(best("151", "MEW", "2023-09-22"), 23237);
  assert.equal(best("Surging Sparks", "SSP", "2024-11-08"), 23651);
  assert.equal(best("Crown Zenith", "CRZ", "2023-01-20"), 17688);
  assert.equal(best("Crown Zenith Galarian Gallery", undefined, "2023-01-20"), 17689);
  assert.equal(best("Team Rocket Returns", undefined, "2004-11-08"), 1428);
  assert.equal(best("Scarlet & Violet", "SVI"), 22873);
  assert.equal(best("Paldea Evolved", "PAL"), undefined);
});

test("cards match by product id, else by number", () => {
  const products = [card(1, "Charizard ex - 199/165", "199/165"), card(2, "Venusaur ex - 003/165", "003/165"), sealed(3, "151 Booster Pack")];
  assert.equal(matchCardProduct(products, { name: "Venusaur ex", number: "3", productIds: [2] })?.productId, 2);
  assert.equal(matchCardProduct(products, { name: "Charizard ex", number: "199" })?.productId, 1);
  assert.equal(matchCardProduct(products, { name: "Venusaur ex", number: "003" })?.productId, 2);
  assert.equal(matchCardProduct(products, { name: "Mew ex", number: "151" }), null);
});

const SEALED_151 = [
  sealed(10, "151 Pokemon Center Elite Trainer Box (Exclusive)"),
  sealed(11, "151 Booster Bundle"),
  sealed(12, "151 Ultra-Premium Collection"),
  sealed(13, "151 Elite Trainer Box"),
  sealed(14, "151 Elite Trainer Box Case"),
  sealed(15, "151 Booster Bundle Display"),
  sealed(16, "151 Ultra-Premium Collection Case"),
  card(17, "Mew ex - 151/165", "151/165"),
];

test("sealed products match by name, not cases, displays or exclusives", () => {
  const match = (name: string, productType: string) => matchSealedProduct(SEALED_151, { name, productType })?.productId;
  assert.equal(match("151 Elite Trainer Box", "etb"), 13);
  assert.equal(match("151 Booster Bundle", "bundle"), 11);
  assert.equal(match("151 Ultra Premium Collection", "upc"), 12);
  assert.equal(match("151 Elite Trainer Box Case", "case"), 14);
  assert.equal(match("151 Pokémon Center Elite Trainer Box", "etb"), 10);
  assert.equal(match("Charizard Ultra Premium Collection", "upc"), undefined);
});

test("sealed products find their group from the set group or the name", () => {
  assert.equal(sealedGroup(GROUPS, { name: "151 Booster Bundle", setGroup: "151" })?.groupId, 23237);
  assert.equal(sealedGroup(GROUPS, { name: "Prismatic Evolutions Booster Bundle", setGroup: "Prismatic Evolutions" })?.groupId, 23821);
  assert.equal(sealedGroup(GROUPS, { name: "Surging Sparks Booster Box", setGroup: null })?.groupId, 23651);
  assert.equal(sealedGroup(GROUPS, { name: "Pikachu Collector Chest", setGroup: "Promo" }), null);
});

test("TCGCSV prices by variant, market falling back to the median listing", () => {
  const p = (subTypeName: string, marketPrice: number | null) => ({ productId: 1, subTypeName, lowPrice: 1, midPrice: 2, highPrice: 9, marketPrice });
  assert.deepEqual(pricesByVariant([p("Normal", 1.5), p("Reverse Holofoil", null)]), {
    normal: { market: 1.5, low: 1, mid: 2, high: 9 },
    reverseHolofoil: { market: 2, low: 1, mid: 2, high: 9 },
  });
});

test("TCGdex prices and product ids", () => {
  const dex = {
    id: "sv08.5-161",
    localId: "161",
    name: "Umbreon ex",
    set: { id: "sv08.5", name: "Prismatic Evolutions" },
    variants_detailed: [{ type: "holo", thirdParty: { tcgplayer: 610516 } }],
    pricing: {
      tcgplayer: {
        unit: "USD",
        updated: "2026-10-14T22:55:11.659Z",
        holofoil: { productId: 610516, lowPrice: 1149.97, midPrice: 1379.99, highPrice: 26533.73, marketPrice: 1269.69 },
      },
    },
  };
  assert.deepEqual(dexPrices(dex), { holofoil: { market: 1269.69, low: 1149.97, mid: 1379.99, high: 26533.73 } });
  assert.deepEqual(dexProductIds(dex), [610516]);
});

test("product photos skip TCGplayer's stock image and resize by name", () => {
  const url = "https://tcgplayer-cdn.tcgplayer.com/product/502005_200w.jpg";
  assert.equal(productImage({ ...sealed(1, "151 UPC"), imageUrl: url, imageCount: 1 }), url);
  assert.equal(productImage({ ...sealed(1, "151 UPC"), imageUrl: url, imageCount: 0 }), null);
  assert.equal(productImage(sealed(1, "151 UPC")), null);
  assert.equal(productImageAt(url, "400w"), "https://tcgplayer-cdn.tcgplayer.com/product/502005_400w.jpg");
  assert.equal(productImageAt(url, "in_1000x1000"), "https://tcgplayer-cdn.tcgplayer.com/product/502005_in_1000x1000.jpg");
});

test("sealed hover previews use the large square photo, and none without a photo", () => {
  assert.deepEqual(sealedPreview({ image: "https://tcgplayer-cdn.tcgplayer.com/product/593355_200w.jpg" }), {
    "data-card-preview": "https://tcgplayer-cdn.tcgplayer.com/product/593355_in_1000x1000.jpg",
    "data-card-preview-shape": "square",
  });
  assert.deepEqual(sealedPreview({ image: null }), {});
});
