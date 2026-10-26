// TCGCSV (tcgcsv.com) mirrors TCGplayer's catalog and prices once a day (around 20:00 UTC), no key needed.
// Pokémon is category 3; a "group" is a set, its products are cards and sealed products, prices join on productId.
// Usage rules: server-side only, a descriptive User-Agent, a pause between requests, well under 10k requests a day.
const BASE = "https://tcgcsv.com/tcgplayer/3";
const USER_AGENT = "collection-tracker (+https://github.com/JakeDeFord/collection-tracker)";
const GAP_MS = 150;

export type Group = { groupId: number; name: string; abbreviation: string | null; isSupplemental: boolean; publishedOn: string };
export type Product = {
  productId: number;
  groupId: number;
  name: string;
  imageUrl?: string;
  imageCount?: number;
  extendedData?: { name: string; value: string }[];
};

/** A product's photo, or null when TCGplayer has none (its `imageUrl` then points at a stock "no image" picture). */
export const productImage = (p: Product) => (p.imageUrl && p.imageCount !== 0 ? p.imageUrl : null);

/** The same TCGplayer photo at another size: `_200w`, `_400w` or `_in_1000x1000`. */
export const productImageAt = (url: string, size: "200w" | "400w" | "in_1000x1000") => url.replace(/_(200w|400w|in_1000x1000)\.jpg$/, `_${size}.jpg`);
export type CsvPrice = {
  productId: number;
  subTypeName: string;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
};

export type PriceRow = { low?: number | null; mid?: number | null; high?: number | null; market?: number | null };

/** TCGplayer printing ("Reverse Holofoil", "1st Edition Holofoil", TCGdex's "reverse-holofoil") → our variant key ("reverseHolofoil"). */
export function variantKey(name: string): string {
  const [first, ...rest] = name.trim().split(/[\s-]+/);
  return first.toLowerCase() + rest.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
}

/** Collector number without its "/total" part, leading zeros or case: "006/165" → "6", "gg05" → "GG5". */
export function normNumber(n: string): string {
  return n.split("/")[0].trim().toUpperCase().replace(/^([A-Z]*)0+(?=\d)/, "$1");
}

const words = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Group name without its series prefix: "SV08: Surging Sparks" → "surging sparks", "SWSH: Crown Zenith: Galarian Gallery" → "crown zenith galarian gallery". */
export function groupTitle(name: string): string {
  return words(name.replace(/^[A-Z]{1,4}\d*[a-z]?:\s*/, ""));
}

/** How well a TCGCSV group matches a set (0 = not at all). Name carries most weight, then abbreviation and release day. */
export function scoreGroup(g: Group, set: { name: string; abbreviation?: string | null; releaseDate?: string | null }): number {
  const title = groupTitle(g.name);
  const wanted = words(set.name);
  if (!wanted) return 0;
  let score = 0;
  if (title === wanted) score += 3;
  else if (title.endsWith(` ${wanted}`) || wanted.endsWith(` ${title}`)) score += 2;
  if (set.abbreviation && g.abbreviation?.toUpperCase() === set.abbreviation.toUpperCase()) score += 3;
  const day = set.releaseDate?.replaceAll("/", "-").slice(0, 10);
  if (day && g.publishedOn.slice(0, 10) === day) score += 2;
  else if (day && Math.abs(Date.parse(g.publishedOn.slice(0, 10)) - Date.parse(day)) <= 14 * 86_400_000) score += 1;
  return score;
}

/** Best-matching groups for a set, best first; only those scoring at least `min` (default: a name or abbreviation match). */
export function rankGroups(groups: Group[], set: Parameters<typeof scoreGroup>[1], min = 3): Group[] {
  return groups
    .map((g) => ({ g, s: scoreGroup(g, set) }))
    .filter((x) => x.s >= min)
    .sort((a, b) => b.s - a.s || Number(a.g.isSupplemental) - Number(b.g.isSupplemental))
    .map((x) => x.g);
}

const ext = (p: Product, name: string) => p.extendedData?.find((e) => e.name === name)?.value;

/** Singles carry a collector number or rarity; sealed products, code cards and accessories do not. */
export const isSingleCard = (p: Product) => ext(p, "Number") !== undefined || ext(p, "Rarity") !== undefined;

/** The TCGplayer product for a card: by product id when known, else by collector number (name breaks ties). */
export function matchCardProduct(products: Product[], card: { name: string; number: string; productIds?: number[] }): Product | null {
  const byId = products.find((p) => card.productIds?.includes(p.productId));
  if (byId) return byId;
  const num = normNumber(card.number);
  const same = products.filter((p) => {
    const n = ext(p, "Number");
    return n !== undefined && normNumber(n) === num;
  });
  const name = words(card.name);
  return same.find((p) => words(p.name).startsWith(name)) ?? same[0] ?? null;
}

const STOP = new Set(["pokemon", "tcg", "the", "and", "of"]);
const tokens = (s: string) => new Set(words(s).split(" ").filter((w) => w && !STOP.has(w)));

/** Words that mark a different product form; a product with one only matches a name that has it too. */
const FORM_WORDS = ["case", "display", "center"];

/**
 * The TCGplayer sealed product for one of ours, by name similarity (Dice over words), or null when no
 * candidate is close enough or two are equally close. Cases, displays and Pokémon Center products
 * only match names that say so.
 */
export function matchSealedProduct(products: Product[], ours: { name: string; productType: string }): Product | null {
  const want = tokens(ours.name);
  if (ours.productType === "case") want.add("case");
  const scored = products
    .filter((p) => !isSingleCard(p) && !/code card/i.test(p.name))
    .map((p) => {
      const have = tokens(p.name);
      if (FORM_WORDS.some((w) => have.has(w) && !want.has(w))) return { p, s: 0 };
      let shared = 0;
      for (const w of want) if (have.has(w)) shared++;
      return { p, s: (2 * shared) / (want.size + have.size) };
    })
    .sort((a, b) => b.s - a.s);
  const [best, next] = scored;
  if (!best || best.s < 0.8 || (next && next.s === best.s)) return null;
  return best.p;
}

/** Group that a sealed product belongs to, from its set group ("Surging Sparks") or else from its name. */
export function sealedGroup(groups: Group[], ours: { name: string; setGroup: string | null }): Group | null {
  if (ours.setGroup) {
    // A set group is only a name, so a partial match ("151" → "SV: Scarlet & Violet 151") is enough.
    const [g] = rankGroups(groups, { name: ours.setGroup }, 2);
    if (g) return g;
  }
  // "Surging Sparks Booster Box" → the group whose title is the longest prefix of the name.
  const name = words(ours.name);
  return (
    groups
      .filter((g) => !g.isSupplemental && groupTitle(g.name) && name.startsWith(`${groupTitle(g.name)} `))
      .sort((a, b) => groupTitle(b.name).length - groupTitle(a.name).length)[0] ?? null
  );
}

/** A product's prices by variant. Market falls back to the median listing when there are too few sales for one. */
export function pricesByVariant(rows: CsvPrice[]): Record<string, PriceRow> {
  return Object.fromEntries(
    rows.map((r) => [
      variantKey(r.subTypeName),
      { market: r.marketPrice ?? r.midPrice, low: r.lowPrice, mid: r.midPrice, high: r.highPrice },
    ]),
  );
}

/** One client per sync or import: it caches every response and spaces requests out. */
export class TcgcsvClient {
  private last = 0;
  private chain: Promise<unknown> = Promise.resolve();
  private cache = new Map<string, Promise<unknown>>();

  private get<T>(path: string): Promise<T> {
    let hit = this.cache.get(path) as Promise<T> | undefined;
    if (!hit) {
      hit = this.chain.then(() => this.fetchSpaced<T>(path));
      this.chain = hit.catch(() => {});
      hit.catch(() => this.cache.delete(path));
      this.cache.set(path, hit);
    }
    return hit;
  }

  private async fetchSpaced<T>(path: string): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      const wait = this.last + GAP_MS - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.last = Date.now();
      try {
        const res = await fetch(`${BASE}${path}`, {
          headers: { "User-Agent": USER_AGENT },
          signal: AbortSignal.timeout(30_000),
          cache: "no-store",
        });
        if (res.ok) {
          const body = (await res.json()) as { success?: boolean; results: T; errors?: string[] };
          if (body.success === false) throw new Error(`tcgcsv ${path}: ${body.errors?.join(", ")}`);
          return body.results;
        }
        lastErr = new Error(`tcgcsv ${path} ${res.status}`);
        if (res.status < 500 && res.status !== 429) break;
      } catch (e) {
        lastErr = e;
      }
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
    throw lastErr;
  }

  groups = () => this.get<Group[]>("/groups");
  products = (groupId: number) => this.get<Product[]>(`/${groupId}/products`);
  prices = (groupId: number) => this.get<CsvPrice[]>(`/${groupId}/prices`);

  /** Prices for a group keyed by product id, or null when TCGCSV can't be reached. */
  async priceMap(groupId: number): Promise<Map<number, CsvPrice[]> | null> {
    try {
      const m = new Map<number, CsvPrice[]>();
      for (const r of await this.prices(groupId)) m.set(r.productId, [...(m.get(r.productId) ?? []), r]);
      return m;
    } catch (e) {
      console.warn(`TCGCSV prices for group ${groupId} failed:`, e);
      return null;
    }
  }
}
