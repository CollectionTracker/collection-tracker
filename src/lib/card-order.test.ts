import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyVisibleOrder,
  isDefaultOrder,
  moveCard,
  parseOrder,
  resolveHidden,
  resolveOrder,
  setHidden,
  shiftCard,
  visibleOrder,
} from "./card-order";

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

test("visibleOrder drops hidden cards", () => {
  assert.deepEqual(visibleOrder(defaults, ["b", "x"]), ["a", "c", "d"]);
  assert.deepEqual(visibleOrder(defaults, []), defaults);
});

test("applyVisibleOrder keeps hidden cards in their slots", () => {
  assert.deepEqual(applyVisibleOrder(defaults, ["b"], ["d", "c", "a"]), ["d", "b", "c", "a"]);
  assert.deepEqual(applyVisibleOrder(defaults, [], ["d", "c", "b", "a"]), ["d", "c", "b", "a"]);
});

test("resolveHidden keeps only known ids once", () => {
  assert.deepEqual(resolveHidden(defaults, ["c", "x", "c", "a"]), ["c", "a"]);
  assert.deepEqual(resolveHidden(defaults, null), []);
});

test("setHidden hides and shows without duplicates", () => {
  assert.deepEqual(setHidden([], "a", false), ["a"]);
  assert.deepEqual(setHidden(["a"], "a", false), ["a"]);
  assert.deepEqual(setHidden(["a", "b"], "a", true), ["b"]);
});
