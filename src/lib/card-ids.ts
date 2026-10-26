// Which stored card row a TCGdex card is. Rows stored before TCGdex keep their Pokémon TCG API ids ("sv3pt5-151")
// and get their TCGdex id ("sv03.5-151") only on the next sync, so until then they are found by set and number.
import { normNumber } from "./tcgcsv";
import { toDexSetId } from "./tcgdex";

export type StoredCard = { id: string; setId: string; number: string; tcgdexId: string | null };
export type StoredSet = { id: string; tcgdexId: string | null };

/** Our row for a TCGdex card: the one linked to it, else an unlinked row with the same set and collector number. */
export function matchStoredCard(
  dex: { id: string; localId: string; set: { id: string } },
  cards: StoredCard[],
  sets: StoredSet[],
): StoredCard | null {
  const linked = cards.find((c) => c.tcgdexId === dex.id);
  if (linked) return linked;
  const setIds = new Set(
    sets
      .filter((s) => (s.tcgdexId ? s.tcgdexId === dex.set.id : s.id === dex.set.id || toDexSetId(s.id) === dex.set.id))
      .map((s) => s.id),
  );
  const n = normNumber(dex.localId);
  return cards.find((c) => c.tcgdexId == null && setIds.has(c.setId) && normNumber(c.number) === n) ?? null;
}
