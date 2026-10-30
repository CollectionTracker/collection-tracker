import assert from "node:assert/strict";
import { test } from "node:test";
import { fadedRate, PROJECTION_YEARS, SEGMENT_GROWTH } from "./scenarios";
import { bandsOnBasis, chanceBelow, herfindahl, simulate, stationaryRegimes } from "./simulation";

const START = { raw: 12_000, sealed: 8_000 };
const SPREAD_OUT = { raw: 0.01, sealed: 0.02 };
const GROSS = { afterFees: false, real: false };

test("the same inputs give the same simulation", () => {
  const a = simulate(START, SPREAD_OUT, 500);
  const b = simulate(START, SPREAD_OUT, 500);
  assert.deepEqual(a.bands, b.bands);
  assert.equal(a.drawdownChance, b.drawdownChance);
});

test("bands start at the midpoint, stay ordered and widen over time", () => {
  const { bands, finals } = simulate(START, SPREAD_OUT);
  assert.equal(bands.length, PROJECTION_YEARS + 1);
  assert.ok(bands.slice(1).every((b) => b.p10 <= b.p25 && b.p25 <= b.p50 && b.p50 <= b.p75 && b.p75 <= b.p90));
  assert.equal(bands[0].p50, 20_000);
  assert.ok(bands[10].p90 - bands[10].p10 > bands[1].p90 - bands[1].p10);
  assert.equal(finals.length, 5000);
  assert.ok(finals[0] <= finals[4999]);
});

test("the median stays near the growth-only path", () => {
  const grown = (start: number, rate: number) => {
    let v = start;
    for (let y = 1; y <= 10; y++) v *= 1 + fadedRate(rate, y);
    return v;
  };
  const expected = grown(START.raw, SEGMENT_GROWTH.raw) + grown(START.sealed, SEGMENT_GROWTH.sealed);
  const { p50 } = simulate(START, SPREAD_OUT).bands[10];
  assert.ok(Math.abs(p50 / expected - 1) < 0.1, `${p50} vs ${expected}`);
});

test("a concentrated collection has a wider range", () => {
  const width = (concentration: typeof START) => {
    const { p10, p90 } = simulate(START, concentration).bands[10];
    return p90 - p10;
  };
  assert.ok(width({ raw: 1, sealed: 1 }) > width(SPREAD_OUT));
});

test("an empty segment and an empty portfolio are safe", () => {
  assert.ok(simulate({ raw: 100, sealed: 0 }, { raw: 1, sealed: 0 }, 200).bands[10].p50 > 0);
  const none = simulate({ raw: 0, sealed: 0 }, { raw: 0, sealed: 0 }, 200);
  assert.ok(none.bands.every((b) => b.p90 === 0));
  assert.equal(none.drawdownChance, 0);
});

test("basis scales the bands and the chances", () => {
  const sim = simulate(START, SPREAD_OUT);
  const net = bandsOnBasis(sim.bands, { afterFees: true, real: false });
  assert.ok(Math.abs(net[0].p50 - 17_400) < 1e-9);
  assert.equal(chanceBelow(sim, 0, GROSS), 0);
  assert.equal(chanceBelow(sim, Infinity, GROSS), 1);
  assert.ok(chanceBelow(sim, 20_000, { afterFees: true, real: true }) > chanceBelow(sim, 20_000, GROSS));
});

test("herfindahl measures concentration", () => {
  assert.equal(herfindahl([]), 0);
  assert.equal(herfindahl([50]), 1);
  assert.equal(herfindahl([25, 25, 25, 25]), 0.25);
});

test("regime shares add up to one", () => {
  const share = stationaryRegimes();
  assert.ok(Math.abs(share.reduce((a, s) => a + s, 0) - 1) < 1e-9);
});
