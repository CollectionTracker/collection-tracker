import assert from "node:assert/strict";
import { test } from "node:test";
import { type StoredCard, type StoredSet, matchStoredCard } from "./card-ids";

const mew = { id: "sv03.5-151", localId: "151", set: { id: "sv03.5" } };
const card = (id: string, setId: string, number: string, tcgdexId: string | null = null): StoredCard => ({ id, setId, number, tcgdexId });

test("matchStoredCard prefers the row linked to the TCGdex id", () => {
  const cards = [card("sv3pt5-151", "sv3pt5", "151"), card("other", "sv3pt5", "999", "sv03.5-151")];
  assert.equal(matchStoredCard(mew, cards, [{ id: "sv3pt5", tcgdexId: null }])?.id, "other");
});

test("matchStoredCard finds an unlinked legacy row by set and number", () => {
  const sets: StoredSet[] = [{ id: "sv3pt5", tcgdexId: null }];
  assert.equal(matchStoredCard(mew, [card("sv3pt5-151", "sv3pt5", "151")], sets)?.id, "sv3pt5-151");
  // The set may already be linked, and numbers may be zero-padded or carry the set size.
  assert.equal(matchStoredCard(mew, [card("sv3pt5-151", "sv3pt5", "151/165")], [{ id: "sv3pt5", tcgdexId: "sv03.5" }])?.id, "sv3pt5-151");
  const base = { id: "base1-4", localId: "4", set: { id: "base1" } };
  assert.equal(matchStoredCard(base, [card("base1-4", "base1", "004")], [{ id: "base1", tcgdexId: null }])?.id, "base1-4");
});

test("matchStoredCard ignores other sets, numbers and rows linked to another card", () => {
  const sets: StoredSet[] = [
    { id: "sv3pt5", tcgdexId: null },
    { id: "sv3", tcgdexId: null },
    { id: "x", tcgdexId: "sv04" },
  ];
  assert.equal(matchStoredCard(mew, [card("sv3-151", "sv3", "151"), card("sv3pt5-150", "sv3pt5", "150")], sets), null);
  assert.equal(matchStoredCard(mew, [card("sv3pt5-151", "sv3pt5", "151", "sv03.5-151a")], sets), null);
  // A set linked to a different TCGdex set doesn't match by its own id.
  assert.equal(matchStoredCard(mew, [card("a", "x", "151")], [{ id: "x", tcgdexId: "sv04" }]), null);
});
