import assert from "node:assert/strict";
import { test } from "node:test";
import { isDefaultOrder, moveCard, parseOrder, resolveOrder, shiftCard } from "./card-order";

const defaults = ["a", "b", "c", "d"];

test("no saved order gives the default", () => {
  assert.deepEqual(resolveOrder(defaults, null), defaults);
});

test("saved order is kept, unknown and duplicate ids dropped", () => {
  assert.deepEqual(resolveOrder(defaults, ["d", "x", "c", "b", "a", "d"]), ["d", "c", "b", "a"]);
});

test("cards missing from the saved order go back to their default position", () => {
  assert.deepEqual(resolveOrder(defaults, ["c", "a"]), ["c", "b", "a", "d"]);
  assert.deepEqual(resolveOrder(defaults, []), defaults);
});

test("moveCard moves to an index and clamps", () => {
  assert.deepEqual(moveCard(defaults, "a", 2), ["b", "c", "a", "d"]);
  assert.deepEqual(moveCard(defaults, "d", 0), ["d", "a", "b", "c"]);
  assert.deepEqual(moveCard(defaults, "b", 99), ["a", "c", "d", "b"]);
  assert.deepEqual(moveCard(defaults, "x", 0), defaults);
});

test("shiftCard moves one place and stops at the edges", () => {
  assert.deepEqual(shiftCard(defaults, "b", -1), ["b", "a", "c", "d"]);
  assert.deepEqual(shiftCard(defaults, "b", 1), ["a", "c", "b", "d"]);
  assert.deepEqual(shiftCard(defaults, "a", -1), defaults);
  assert.deepEqual(shiftCard(defaults, "d", 1), defaults);
});

test("parseOrder accepts only a list of strings", () => {
  assert.deepEqual(parseOrder('["b","a"]'), ["b", "a"]);
  assert.equal(parseOrder(null), null);
  assert.equal(parseOrder("not json"), null);
  assert.equal(parseOrder('{"a":1}'), null);
  assert.equal(parseOrder("[1,2]"), null);
});

test("isDefaultOrder", () => {
  assert.equal(isDefaultOrder(defaults, [...defaults]), true);
  assert.equal(isDefaultOrder(defaults, ["b", "a", "c", "d"]), false);
});
