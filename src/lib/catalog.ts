// Card catalog and prices: TCGdex finds a card, TCGCSV links it to its TCGplayer product and prices it daily.
// Card and set ids stored before TCGdex (Pokémon TCG API ids such as "sv3pt5-199") are kept as our ids, with
// the TCGdex id alongside, so collection entries and price history never move.
import { eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/db";
import { cards, sets } from "@/db/schema";
import { type DexCard, type DexSet, TcgdexClient, dexImages, dexPrices, dexProductIds, toDexSetId } from "./tcgdex";
import { type PriceRow, TcgcsvClient, matchCardProduct, pricesByVariant, rankGroups } from "./tcgcsv";

export type { PriceRow } from "./tcgcsv";

export type CatalogCard = {
  id: string; // our id: the existing one, else the TCGdex id
  tcgdexId: string;
  name: string;
  number: string;
  rarity: string | null;
  supertype: string | null;
  images: { small?: string; large?: string };
  set: {
    id: string; // our set id
    tcgdexId: string;
    name: string;
    series: string;
    total: number;
    printedTotal: number;
    releaseDate: string | null;
    logo: string | null;
    abbreviation: string | null;
  };
  tcgplayerProductId: number | null;
  tcgplayerGroupId: number | null;
  productIds: number[]; // TCGplayer product ids TCGdex knows for the card
  prices: Record<string, PriceRow>; // by variant; TCGdex's until `priceCards` replaces them with TCGCSV's
  priceSource: "tcgcsv" | "tcgdex" | null;
};

/** Shared clients for one sync or import, so every response is fetched once. */
export const newClients = () => ({ dex: new TcgdexClient(), csv: new TcgcsvClient() });
type Clients = ReturnType<typeof newClients>;

// TCGdex says "Pokemon"/"Trainer"/"Energy"; the Pokémon TCG API (and existing rows) say "Pokémon".
const supertype = (category?: string) => (category === "Pokemon" ? "Pokémon" : (category ?? null));

/** Maps TCGdex ids to our stored ids, loading the cards and sets tables once. */
class IdMap {
  private setRows?: Promise<{ id: string; tcgdexId: string | null; name: string }[]>;

  async card(dexId: string): Promise<{ id: string; setId: string } | null> {
    const db = await getDb();
    const [row] = await db.select({ id: cards.id, setId: cards.setId }).from(cards).where(eq(cards.tcgdexId, dexId));
    return row ?? null;
  }

  async set(dex: DexSet): Promise<string> {
    this.setRows ??= getDb().then((db) => db.select({ id: sets.id, tcgdexId: sets.tcgdexId, name: sets.name }).from(sets));
    const rows = await this.setRows;
    return (
      rows.find((r) => r.tcgdexId === dex.id)?.id ??
      rows.find((r) => r.id === dex.id || toDexSetId(r.id) === dex.id)?.id ??
      dex.id
    );
  }
}

async function toCatalog(card: DexCard, dex: TcgdexClient, ids: IdMap, known?: { id: string; setId: string }): Promise<CatalogCard> {
  const set = (await dex.set(card.set.id)) ?? ({ ...card.set, cards: [] } as DexSet);
  const mapped = known ?? (await ids.card(card.id));
  const images = dexImages(card.image);
  return {
    id: mapped?.id ?? card.id,
    tcgdexId: card.id,
    name: card.name,
    number: card.localId,
    rarity: card.rarity ?? null,
    supertype: supertype(card.category),
    images: { small: images.small, large: images.large },
    set: {
      id: mapped?.setId ?? (await ids.set(set)),
      tcgdexId: set.id,
      name: set.name,
      series: set.serie?.name ?? "",
      total: set.cardCount?.total ?? 0,
      printedTotal: set.cardCount?.official ?? set.cardCount?.total ?? 0,
      releaseDate: set.releaseDate ?? null,
      logo: set.logo ? `${set.logo}.png` : null,
      abbreviation: set.abbreviation?.official ?? null,
    },
    tcgplayerProductId: null,
    tcgplayerGroupId: null,
    productIds: dexProductIds(card),
    prices: dexPrices(card),
    priceSource: null,
  };
}

/** Catalog cards for ids, keyed by the id asked for. Ids may be ours, TCGdex's or the Pokémon TCG API's. */
export async function resolveByIds(want: string[], { dex }: Clients): Promise<Map<string, CatalogCard>> {
  const out = new Map<string, CatalogCard>();
  if (!want.length) return out;
  const db = await getDb();
  const rows = await db
    .select({ id: cards.id, setId: cards.setId, tcgdexId: cards.tcgdexId, setName: sets.name })
    .from(cards)
    .innerJoin(sets, eq(sets.id, cards.setId))
    .where(or(inArray(cards.id, want), inArray(cards.tcgdexId, want)));
  const ids = new IdMap();
  await Promise.all(
    want.map(async (id) => {
      const known = rows.find((r) => r.id === id || r.tcgdexId === id);
      const card = known?.tcgdexId ? await dex.card(known.tcgdexId) : await dex.cardByAnyId(id, known?.setName);
      if (card) out.set(id, await toCatalog(card, dex, ids, known));
    }),
  );
  return out;
}

/** Best catalog match for an imported row (set id or name, number, card name), or null when nothing matches. */
export async function resolveCard(
  q: { name?: string; setId?: string; setName?: string; number?: string },
  { dex }: Clients,
): Promise<CatalogCard | null> {
  const ids = new IdMap();
  const set = q.setId || q.setName ? await dex.findSet({ id: q.setId, name: q.setName }) : null;
  let card: DexCard | null = null;
  if (set && q.number) card = await dex.cardInSet(set.id, q.number);
  else if (set && q.name) {
    const brief = (await dex.set(set.id))?.cards.find((c) => c.name.toLowerCase() === q.name!.toLowerCase());
    card = brief ? await dex.card(brief.id) : null;
  } else if (!set && q.name && !q.setId && !q.setName) {
    const named = await dex.cardsNamed(q.name);
    card = (q.number && named.find((c) => c.localId.replace(/^0+/, "") === q.number!.split("/")[0].replace(/^0+/, ""))) || named[0] || null;
  }
  return card ? toCatalog(card, dex, ids) : null;
}

/** Find each card's TCGplayer group and product (mutates the cards). Cards that can't be linked keep nulls. */
export async function linkTcgplayer(list: CatalogCard[], { csv }: Clients) {
  if (!list.length) return;
  let groups;
  try {
    groups = await csv.groups();
  } catch (e) {
    return console.warn("TCGCSV groups failed; cards stay unlinked:", e);
  }
  for (const c of list) {
    const candidates = rankGroups(groups, { name: c.set.name, abbreviation: c.set.abbreviation, releaseDate: c.set.releaseDate });
    for (const g of candidates.slice(0, 3)) {
      const product = matchCardProduct(await csv.products(g.groupId).catch(() => []), c);
      if (product) {
        c.tcgplayerGroupId = g.groupId;
        c.tcgplayerProductId = product.productId;
        break;
      }
    }
  }
}

export type Priceable = Pick<CatalogCard, "id" | "tcgplayerGroupId" | "tcgplayerProductId" | "prices" | "priceSource"> & {
  tcgdexId: string | null;
};

/**
 * Today's prices for each card (mutates the cards): TCGCSV for linked cards, else TCGdex's own TCGplayer
 * prices. One TCGCSV request per set; a TCGCSV outage falls back to TCGdex instead of failing.
 */
export async function priceCards(list: Priceable[], { dex, csv }: Clients) {
  const groupIds = [...new Set(list.map((c) => c.tcgplayerGroupId).filter((g): g is number => g != null))];
  const maps = new Map(await Promise.all(groupIds.map(async (g) => [g, await csv.priceMap(g)] as const)));
  await Promise.all(
    list.map(async (c) => {
      const rows = c.tcgplayerGroupId == null ? undefined : maps.get(c.tcgplayerGroupId)?.get(c.tcgplayerProductId ?? -1);
      if (rows?.length) {
        c.prices = pricesByVariant(rows);
        c.priceSource = "tcgcsv";
        return;
      }
      if (!Object.keys(c.prices).length && c.tcgdexId) {
        const card = await dex.card(c.tcgdexId).catch(() => null);
        c.prices = card ? dexPrices(card) : {};
      }
      c.priceSource = Object.keys(c.prices).length ? "tcgdex" : null;
    }),
  );
}
