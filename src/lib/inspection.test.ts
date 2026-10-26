import assert from "node:assert/strict";
import { test } from "node:test";
import { liquidation, volatility } from "./inspection";

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);

test("volatility needs at least two moves", () => {
  assert.equal(volatility([]), null);
  assert.equal(volatility([{ day: "2026-01-01", value: 100 }, { day: "2026-01-02", value: 110 }]), null);
  assert.equal(volatility([{ day: "a", value: 0 }, { day: "b", value: 0 }, { day: "c", value: 10 }]), null);
});

test("volatility of a series", () => {
  const v = volatility([
    { day: "d1", value: 100 },
    { day: "d2", value: 110 }, // +10 %
    { day: "d3", value: 99 }, // −10 %
    { day: "d4", value: 120 },
  ])!;
  assert.equal(v.from, "d1");
  assert.equal(v.to, "d4");
  assert.equal(v.snapshots, 4);
  assert.equal(v.change, 20);
  close(v.changePct!, 20);
  assert.equal(v.best.day, "d4");
  close(v.best.pct, (120 / 99 - 1) * 100);
  assert.deepEqual(v.worst, { day: "d3", pct: v.worst.pct });
  close(v.worst.pct, -10);
  close(v.maxDrawdownPct, -10); // 110 → 99
  const moves = [10, -10, (120 / 99 - 1) * 100];
  const mean = moves.reduce((a, b) => a + b) / 3;
  close(v.stdDevPct, Math.sqrt(moves.reduce((a, m) => a + (m - mean) ** 2, 0) / 2));
});

test("a rising series has no drawdown", () => {
  const v = volatility([1, 2, 3].map((value, i) => ({ day: `d${i}`, value })))!;
  assert.equal(v.maxDrawdownPct, 0);
});

test("liquidation nets fees off each point of the range", () => {
  const l = liquidation({ low: 900, mid: 1000, high: 1100 }, 700, 10);
  close(l.quick, 810);
  close(l.fair, 900);
  close(l.patient, 990);
  close(l.fairVsCost!, 200);
  assert.equal(liquidation({ low: 0, mid: 0, high: 0 }, null).fairVsCost, null);
  assert.equal(liquidation({ low: 0, mid: 0, high: 0 }, null).feePct, 13);
});
