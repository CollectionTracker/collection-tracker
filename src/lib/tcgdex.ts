// TCGdex (tcgdex.dev): open-source Pokémon TCG catalog, no key needed. Used for card names, numbers, rarity,
// images, sets and each card's TCGplayer product id. Its own TCGplayer prices lag by days, so prices come from
// TCGCSV and TCGdex's are only a fallback.
import { normNumber, type PriceRow, variantKey } from "./tcgcsv";

const BASE = "https://api.tcgdex.net/v2/en";

export type DexSetBrief = { id: string; name: string; cardCount?: { total?: number; official?: number } };
export type DexSet = DexSetBrief & {
  serie?: { id: string; name: string };
  releaseDate?: string;
  logo?: string;
  abbreviation?: { official?: string };
  cards: { id: string; localId: string; name: string }[];
};
type DexPrice = { productId?: number; lowPrice?: number | null; midPrice?: number | null; highPrice?: number | null; marketPrice?: number | null };
export type DexCard = {
  id: string;
  localId: string;
  name: string;
  category?: string;
  rarity?: string;
  image?: string;
  set: DexSetBrief & { logo?: string };
  variants_detailed?: { type: string; thirdParty?: { tcgplayer?: number } }[];
  pricing?: { tcgplayer?: Record<string, DexPrice | string | undefined> | null };
};

/**
 * Pokémon TCG API set id → TCGdex set id: "sv3pt5" → "sv03.5", "sv8" → "sv08", "swsh12pt5gg" → "swsh12.5gg".
 * Older ids ("base1", "swsh7", "ex7") are the same in both.
 */
export function toDexSetId(legacy: string): string {
  return legacy.replace(/pt5/, ".5").replace(/^(sv|me)(\d)(?!\d)/, (_, era, n) => `${era}0${n}`);
}

/** TCGdex card art in the two sizes we store; assets are `<image>/<quality>.<ext>`. */
export const dexImages = (image?: string) => ({
  small: image ? `${image}/low.webp` : undefined,
  large: image ? `${image}/high.webp` : undefined,
});

/** TCGdex's (lagging) TCGplayer prices by our variant key, for when TCGCSV has none. */
export function dexPrices(card: DexCard): Record<string, PriceRow> {
  const out: Record<string, PriceRow> = {};
  for (const [k, v] of Object.entries(card.pricing?.tcgplayer ?? {})) {
    if (!v || typeof v !== "object") continue;
    out[variantKey(k)] = { market: v.marketPrice ?? v.midPrice ?? null, low: v.lowPrice ?? null, mid: v.midPrice ?? null, high: v.highPrice ?? null };
  }
  return out;
}

/** Every TCGplayer product id TCGdex knows for a card. */
export function dexProductIds(card: DexCard): number[] {
  const ids = new Set<number>();
  for (const v of card.variants_detailed ?? []) if (v.thirdParty?.tcgplayer) ids.add(v.thirdParty.tcgplayer);
  for (const v of Object.values(card.pricing?.tcgplayer ?? {})) if (v && typeof v === "object" && v.productId) ids.add(v.productId);
  return [...ids];
}

const lower = (s: string) => s.trim().toLowerCase();

/** One client per sync or import: caches responses and runs at most a few requests at once. */
export class TcgdexClient {
  private cache = new Map<string, Promise<unknown>>();
  private active = 0;
  private waiting: (() => void)[] = [];

  private async slot<T>(fn: () => Promise<T>): Promise<T> {
    while (this.active >= 4) await new Promise<void>((r) => this.waiting.push(r));
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      this.waiting.shift()?.();
    }
  }

  /** GET a path; resolves to null on 404. */
  private get<T>(path: string): Promise<T | null> {
    let hit = this.cache.get(path) as Promise<T | null> | undefined;
    if (!hit) {
      hit = this.slot(() => this.fetchRetry<T>(path));
      hit.catch(() => this.cache.delete(path));
      this.cache.set(path, hit);
    }
    return hit;
  }

  private async fetchRetry<T>(path: string): Promise<T | null> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(30_000), cache: "no-store" });
        if (res.ok) return (await res.json()) as T;
        if (res.status === 404) return null;
        lastErr = new Error(`tcgdex ${path} ${res.status}`);
        if (res.status < 500 && res.status !== 429) break;
      } catch (e) {
        lastErr = e;
      }
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
    throw lastErr;
  }

  card = (id: string) => this.get<DexCard>(`/cards/${encodeURIComponent(id)}`);
  set = (id: string) => this.get<DexSet>(`/sets/${encodeURIComponent(id)}`);
  sets = async () => (await this.get<DexSetBrief[]>("/sets")) ?? [];

  /** A TCGdex set from a TCGdex or Pokémon TCG API id, or from its name ("Base" also finds "Base Set"). */
  async findSet(q: { id?: string; name?: string }): Promise<DexSetBrief | null> {
    const all = await this.sets();
    if (q.id) {
      const ids = [q.id, toDexSetId(q.id)].map(lower);
      const hit = all.find((s) => ids.includes(lower(s.id)));
      if (hit) return hit;
    }
    if (q.name) {
      const name = lower(q.name);
      return all.find((s) => lower(s.name) === name) ?? all.find((s) => lower(s.name) === `${name} set`) ?? null;
    }
    return null;
  }

  /** The card at a collector number in a set ("6" finds "006"). */
  async cardInSet(setId: string, number: string): Promise<DexCard | null> {
    const set = await this.set(setId);
    const n = normNumber(number);
    const brief = set?.cards.find((c) => normNumber(c.localId) === n);
    return brief ? this.card(brief.id) : null;
  }

  /** A card from a TCGdex id ("sv03.5-199") or a Pokémon TCG API id ("sv3pt5-199"). */
  async cardByAnyId(id: string, setName?: string): Promise<DexCard | null> {
    const direct = await this.card(id);
    if (direct) return direct;
    const m = id.match(/^(.+)-([^-]+)$/);
    if (!m) return null;
    const set = await this.findSet({ id: m[1], name: setName });
    return set ? this.cardInSet(set.id, m[2]) : null;
  }

  /** Cards whose name contains `name` (TCGdex matches partial, case-insensitive text), as briefs without set or prices. */
  async searchCards(name: string, limit = 40, localId?: string): Promise<{ id: string; localId: string; name: string; image?: string }[]> {
    const q = `name=${encodeURIComponent(name)}${localId ? `&localId=${encodeURIComponent(localId)}` : ""}&pagination:page=1&pagination:itemsPerPage=${limit}`;
    return (await this.get<{ id: string; localId: string; name: string; image?: string }[]>(`/cards?${q}`)) ?? [];
  }

  /** Cards whose name is exactly `name` (case-insensitive), newest set last as TCGdex lists them. */
  async cardsNamed(name: string): Promise<DexCard[]> {
    const briefs = (await this.get<{ id: string; name: string }[]>(`/cards?name=${encodeURIComponent(`eq:${name}`)}`)) ?? [];
    const cards = await Promise.all(briefs.slice(0, 10).map((b) => this.card(b.id)));
    return cards.filter((c): c is DexCard => !!c);
  }
}
