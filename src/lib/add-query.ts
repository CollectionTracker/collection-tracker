// Pure helpers for the add dialog's search: how a typed query is read, and how sealed products are matched to it.
import type { SealedProductType } from "@/db/schema";
import { type Group, groupTitle } from "./tcgcsv";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9/]+/g, " ")
    .trim();

/** "mega gengar 284" → name "mega gengar", number "284". A lone number is part of the name ("151"). */
export function parseCardQuery(q: string): { name: string; number: string | null } {
  const words = norm(q).split(" ").filter(Boolean);
  const isNumber = (w: string) => /^\d{1,3}(\/\d{1,3})?$/.test(w);
  const last = words[words.length - 1];
  if (words.length > 1 && last && isNumber(last)) return { name: words.slice(0, -1).join(" "), number: last.split("/")[0] };
  return { name: words.join(" "), number: null };
}

/** Short names collectors type for sealed products. */
const SYNONYMS: Record<string, string[]> = {
  etb: ["elite", "trainer", "box"],
  bb: ["booster", "bundle"],
  upc: ["ultra", "premium"],
  bbox: ["booster", "box"],
};

/** Query words, with abbreviations spelled out ("pris evo bb" → pris, evo, booster, bundle). */
export function sealedTokens(q: string): string[] {
  return norm(q)
    .split(" ")
    .filter(Boolean)
    .flatMap((w) => SYNONYMS[w] ?? [w]);
}

const wordsOf = (s: string) => norm(s).split(" ").filter(Boolean);

/** Every query word must start a word of the product; the shorter the name, the better the match. Null when one is missing. */
export function sealedScore(tokens: string[], haystack: string): number | null {
  if (!tokens.length) return null;
  const words = wordsOf(haystack);
  for (const t of tokens) if (!words.some((w) => w.startsWith(t))) return null;
  return tokens.length / words.length;
}

/** Groups (sets) worth searching for a query: those whose title shares a word with it, newest first; else the newest sets. */
export function sealedGroupsFor(groups: Group[], tokens: string[], limit = 4): Group[] {
  const byDate = (a: Group, b: Group) => b.publishedOn.localeCompare(a.publishedOn);
  const hits = groups
    .map((g) => ({ g, n: tokens.filter((t) => wordsOf(groupTitle(g.name)).some((w) => w.startsWith(t))).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || byDate(a.g, b.g))
    .map((x) => x.g);
  if (hits.length) return hits.slice(0, limit);
  return groups.filter((g) => !g.isSupplemental).sort(byDate).slice(0, limit + 2);
}

/** The sealed product type a name describes ("Surging Sparks Elite Trainer Box" → etb). */
export function inferSealedType(name: string): SealedProductType {
  if (/\bcase\b/i.test(name)) return "case";
  if (/elite trainer|\betb\b/i.test(name)) return "etb";
  if (/booster (box|display)|\bdisplay\b/i.test(name)) return "booster_box";
  if (/ultra[- ]premium|\bupc\b/i.test(name)) return "upc";
  if (/bundle/i.test(name)) return "bundle";
  if (/\btin\b/i.test(name)) return "tin";
  return "other";
}

/** The printing a card is usually owned in: normal when it has one, else the first priced, else normal. */
export const defaultVariant = (variants: string[]) => (variants.includes("normal") || !variants.length ? "normal" : variants[0]);

/** Best market price among a card's printings, preferring the default one. */
export function pickPrice(prices: Record<string, { market?: number | null }>): number | null {
  const v = defaultVariant(Object.keys(prices));
  return prices[v]?.market ?? Object.values(prices).find((p) => p.market != null)?.market ?? null;
}
