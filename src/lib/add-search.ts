// Autocomplete for the add dialog: cards from TCGdex, sealed products from TCGCSV, with copies already owned.
import { desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { cards, collectionEntries, sealedProducts, sets } from "@/db/schema";
import { type CardSuggestion, type SealedSuggestion, type Suggestion, type SuggestionKind } from "./add-types";
import { inferSealedType, parseCardQuery, pickPrice, sealedGroupsFor, sealedScore, sealedTokens } from "./add-query";
import { matchStoredCard } from "./card-ids";
import { newClients } from "./catalog";
import { type DexCard, type TcgdexClient, dexImages, dexPrices } from "./tcgdex";
import { type Group, type Product, type TcgcsvClient, groupTitle, isSingleCard, normNumber, productImage } from "./tcgcsv";

const SHARED_TTL = 60 * 60 * 1000;
let shared: { clients: ReturnType<typeof newClients>; at: number } | undefined;

/** Clients that outlive one request, so typing re-uses the set, group and product lists already fetched. */
export function sharedClients() {
  if (!shared || Date.now() - shared.at > SHARED_TTL) shared = { clients: newClients(), at: Date.now() };
  return shared.clients;
}

const LIMIT = 8;

export function cardSuggestion(card: DexCard, owned = 0): CardSuggestion {
  const prices = dexPrices(card);
  const total = card.set.cardCount?.official ?? card.set.cardCount?.total;
  return {
    kind: "card",
    id: card.id,
    name: card.name,
    setName: card.set.name,
    number: total ? `${card.localId}/${total}` : card.localId,
    rarity: card.rarity ?? null,
    image: dexImages(card.image).small ?? null,
    price: pickPrice(prices),
    variants: Object.keys(prices),
    owned,
  };
}

/** Cards matching a typed query, best name matches first. */
export async function searchCards(q: string, dex: TcgdexClient, limit = LIMIT): Promise<CardSuggestion[]> {
  const { name, number } = parseCardQuery(q);
  if (name.length < 2) return [];
  let briefs: Awaited<ReturnType<TcgdexClient["searchCards"]>> = [];
  if (number) {
    // A number narrows a common name ("pikachu 276") far below the 40 cards a plain search returns.
    briefs = (await dex.searchCards(name, 100, number)).filter((b) => normNumber(b.localId) === normNumber(number));
  }
  if (!briefs.length) briefs = await dex.searchCards(name);
  // TCG Pocket (the phone game) cards are in TCGdex too; they are not physical cards.
  briefs = briefs.filter((b) => !b.image?.includes("/tcgp/"));
  const rank = (n: string) => (n.toLowerCase().startsWith(name) ? 0 : 1);
  briefs = [...briefs].sort((a, b) => rank(a.name) - rank(b.name)).slice(0, limit);
  const details = await Promise.all(briefs.map((b) => dex.card(b.id).catch(() => null)));
  return details.filter((c): c is DexCard => !!c).map((c) => cardSuggestion(c));
}

export function sealedSuggestion(p: Product, group: Pick<Group, "groupId" | "name">, price: number | null, owned = 0): SealedSuggestion {
  return {
    kind: "sealed",
    productId: p.productId,
    groupId: group.groupId,
    name: p.name,
    group: group.name.replace(/^[A-Z]{1,4}\d*[a-z]?:\s*/, ""),
    type: inferSealedType(p.name),
    image: productImage(p),
    price,
    owned,
  };
}

const isSealed = (p: Product) => !isSingleCard(p) && !/code card/i.test(p.name);

/** Sealed products matching a typed query: the sets it names (or the newest ones) are searched for products with every word in their name. */
export async function searchSealed(q: string, csv: TcgcsvClient, limit = LIMIT): Promise<SealedSuggestion[]> {
  const tokens = sealedTokens(q);
  if (!tokens.join("").length || (tokens.length === 1 && tokens[0].length < 2)) return [];
  const groups = sealedGroupsFor(await csv.groups(), tokens);
  const found = (
    await Promise.all(
      groups.map(async (g) => {
        const products = await csv.products(g.groupId).catch(() => [] as Product[]);
        return products.filter(isSealed).flatMap((p) => {
          const score = sealedScore(tokens, `${groupTitle(g.name)} ${p.name}`);
          return score === null ? [] : [{ p, g, score }];
        });
      }),
    )
  )
    .flat()
    .sort((a, b) => b.score - a.score || b.g.publishedOn.localeCompare(a.g.publishedOn))
    .slice(0, limit);
  const maps = new Map(await Promise.all([...new Set(found.map((f) => f.g.groupId))].map(async (id) => [id, await csv.priceMap(id)] as const)));
  return found.map(({ p, g }) => {
    const r = maps.get(g.groupId)?.get(p.productId)?.find((x) => (x.marketPrice ?? x.midPrice) != null);
    return sealedSuggestion(p, g, r ? (r.marketPrice ?? r.midPrice) : null);
  });
}

/** Fill in how many copies of each suggestion the collection already holds. */
export async function withOwned(list: Suggestion[]): Promise<Suggestion[]> {
  const db = await getDb();
  const cardIds = list.flatMap((s) => (s.kind === "card" ? [s.id] : []));
  const productIds = list.flatMap((s) => (s.kind === "sealed" && s.productId != null ? [s.productId] : []));
  const [cardRows, sealedRows] = await Promise.all([
    // Every owned card, so ones stored under a legacy id the sync hasn't linked yet are found by set and number.
    cardIds.length
      ? db
          .select({
            id: cards.id,
            setId: cards.setId,
            number: cards.number,
            tcgdexId: cards.tcgdexId,
            qty: sql<number>`sum(${collectionEntries.quantity})::int`,
          })
          .from(collectionEntries)
          .innerJoin(cards, eq(cards.id, collectionEntries.cardId))
          .groupBy(cards.id)
      : [],
    productIds.length
      ? db.select({ id: sealedProducts.tcgplayerProductId, qty: sealedProducts.quantity }).from(sealedProducts).where(inArray(sealedProducts.tcgplayerProductId, productIds))
      : [],
  ]);
  const setRows = cardIds.length ? await db.select({ id: sets.id, tcgdexId: sets.tcgdexId }).from(sets) : [];
  return list.map((s) => {
    if (s.kind === "card") {
      // Card suggestion ids are TCGdex ids, "<set>-<number>".
      const [, set, localId] = s.id.match(/^(.+)-([^-]+)$/) ?? [];
      const legacy = set ? matchStoredCard({ id: s.id, localId, set: { id: set } }, cardRows, setRows) : null;
      return { ...s, owned: cardRows.filter((r) => r.tcgdexId === s.id || r.id === s.id || r === legacy).reduce((n, r) => n + r.qty, 0) };
    }
    return { ...s, owned: sealedRows.filter((r) => r.id === s.productId).reduce((n, r) => n + r.qty, 0) };
  });
}

/** Autocomplete for the dialog: cards and/or sealed products for a query. */
export async function suggest(q: string, kind: SuggestionKind): Promise<Suggestion[]> {
  const { dex, csv } = sharedClients();
  const [c, s] = await Promise.all([
    kind === "sealed" ? [] : searchCards(q, dex, kind === "card" ? LIMIT : 5).catch(() => []),
    kind === "card" ? [] : searchSealed(q, csv, kind === "sealed" ? LIMIT : 4).catch(() => []),
  ]);
  return withOwned([...c, ...s]);
}

/** The last items added, for an empty search box. */
export async function recentAdds(limit = 5): Promise<Suggestion[]> {
  const db = await getDb();
  const [cardRows, sealedRows] = await Promise.all([
    db
      .select({
        id: cards.id,
        tcgdexId: cards.tcgdexId,
        name: cards.name,
        number: cards.number,
        rarity: cards.rarity,
        image: cards.imageSmall,
        setName: sets.name,
        qty: sql<number>`sum(${collectionEntries.quantity})::int`,
        at: sql<Date>`max(${collectionEntries.createdAt})`,
      })
      .from(collectionEntries)
      .innerJoin(cards, eq(cards.id, collectionEntries.cardId))
      .innerJoin(sets, eq(sets.id, cards.setId))
      .groupBy(cards.id, sets.name)
      .orderBy(desc(sql`max(${collectionEntries.createdAt})`))
      .limit(limit),
    db.select().from(sealedProducts).orderBy(desc(sealedProducts.createdAt)).limit(limit),
  ]);
  const all: { at: number; s: Suggestion }[] = [
    ...cardRows.map((r) => ({
      at: +new Date(r.at),
      s: {
        kind: "card" as const,
        id: r.tcgdexId ?? r.id,
        name: r.name,
        setName: r.setName,
        number: r.number,
        rarity: r.rarity,
        image: r.image,
        price: null,
        variants: [],
        owned: r.qty,
      },
    })),
    ...sealedRows.map((r) => ({
      at: +r.createdAt,
      s: {
        kind: "sealed" as const,
        productId: r.tcgplayerProductId,
        groupId: r.tcgplayerGroupId,
        name: r.name,
        group: r.setGroup,
        type: r.productType,
        image: r.imageUrl,
        price: null,
        owned: r.quantity,
      },
    })),
  ];
  return all.sort((a, b) => b.at - a.at).slice(0, limit).map((x) => x.s);
}
