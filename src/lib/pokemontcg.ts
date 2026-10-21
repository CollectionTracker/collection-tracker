const BASE = "https://api.pokemontcg.io/v2";
const FIELDS = "id,name,number,rarity,supertype,images,set,tcgplayer";

export type PriceRow = {
  low?: number | null;
  mid?: number | null;
  high?: number | null;
  market?: number | null;
};

export type ApiCard = {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  supertype?: string;
  images?: { small?: string; large?: string };
  set: {
    id: string;
    name: string;
    series: string;
    total: number;
    printedTotal: number;
    releaseDate?: string;
    images?: { logo?: string };
  };
  tcgplayer?: { updatedAt?: string; prices?: Record<string, PriceRow> };
};

async function api<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${BASE}${path}?${new URLSearchParams(params)}`;
  const headers: Record<string, string> = {};
  if (process.env.POKEMONTCG_API_KEY) headers["X-Api-Key"] = process.env.POKEMONTCG_API_KEY;

  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(45_000), cache: "no-store" });
      if (res.ok) return (await res.json()) as T;
      lastErr = new Error(`pokemontcg.io ${res.status}`);
      if (res.status < 500 && res.status !== 429) break;
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }
  throw lastErr;
}

export async function fetchCardsByIds(ids: string[]): Promise<ApiCard[]> {
  const out: ApiCard[] = [];
  for (let i = 0; i < ids.length; i += 40) {
    const batch = ids.slice(i, i + 40);
    const q = batch.map((id) => `id:"${id}"`).join(" OR ");
    const res = await api<{ data: ApiCard[] }>("/cards", { q, pageSize: "250", select: FIELDS });
    out.push(...res.data);
  }
  return out;
}

const esc = (s: string) => s.replace(/["\\]/g, "");

/** Find the best match for an imported row. Returns null when nothing matches. */
export async function resolveCard(q: {
  name?: string;
  setId?: string;
  setName?: string;
  number?: string;
}): Promise<ApiCard | null> {
  const number = q.number?.split("/")[0].trim().replace(/^0+(?=\d)/, "");
  const parts: string[] = [];
  if (q.setId) parts.push(`set.id:"${esc(q.setId)}"`);
  else if (q.setName) parts.push(`set.name:"${esc(q.setName)}"`);
  if (number) parts.push(`number:"${esc(number)}"`);
  if (q.name && !(number && (q.setId || q.setName))) parts.push(`name:"${esc(q.name)}"`);
  if (!parts.length) return null;
  const res = await api<{ data: ApiCard[] }>("/cards", { q: parts.join(" "), pageSize: "10", select: FIELDS });
  if (!res.data.length) return null;
  const wanted = q.name?.toLowerCase();
  const setWanted = q.setName?.toLowerCase();
  // Prefer the exact card name, then the exact set name ("Base" → "Base Set" before "Base Set 2").
  const score = (c: ApiCard) => {
    const set = c.set.name.toLowerCase();
    return (wanted && c.name.toLowerCase() === wanted ? 4 : 0) +
      (setWanted && set === setWanted ? 2 : 0) +
      (setWanted && set === `${setWanted} set` ? 1 : 0);
  };
  return [...res.data].sort((a, b) => score(b) - score(a))[0];
}
