import assert from "node:assert/strict";
import { test } from "node:test";
import { lineKind, readLines } from "./add-parse";

test("lineKind uses the kind column first, then product type, card-only columns and the name", () => {
  assert.equal(lineKind({ kind: "Sealed", number: "12" }), "sealed");
  assert.equal(lineKind({ kind: "card", type: "etb" }), "card");
  assert.equal(lineKind({ type: "Elite Trainer Box" }), "sealed");
  assert.equal(lineKind({ number: "284", name: "Mega Gengar ex" }), "card");
  assert.equal(lineKind({ name: "Surging Sparks Booster Bundle" }), "sealed");
  assert.equal(lineKind({ name: "Pikachu" }), "card");
});

test("readLines reads every dialog field from a file and applies defaults", () => {
  const rows = readLines(
    [
      "kind,name,set,number,type,quantity,condition,variant,price paid",
      "card,Pikachu ex,Ascended Heroes,276,,2,Lightly Played,Holofoil,$410.50",
      "sealed,151 Elite Trainer Box,Scarlet & Violet 151,,etb,,,,60",
    ].join("\n"),
  );
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    kind: "card",
    id: undefined,
    name: "Pikachu ex",
    group: "Ascended Heroes",
    setId: undefined,
    number: "276",
    type: undefined,
    sku: undefined,
    quantity: 2,
    condition: "LP",
    variant: "holofoil",
    paid: 410.5,
  });
  assert.equal(rows[1].kind, "sealed");
  assert.equal(rows[1].quantity, 1);
  assert.equal(rows[1].paid, 60);
});

test("readLines skips rows without a name or id and understands alternate headers", () => {
  const rows = readLines("Card Name,Qty,Cost\nCharizard,3,90\n,1,5\n");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "Charizard");
  assert.equal(rows[0].quantity, 3);
  assert.equal(rows[0].paid, 90);
});
