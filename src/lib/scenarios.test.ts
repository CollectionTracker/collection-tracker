import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_SCENARIOS,
  LONG_RUN_RATE,
  SEGMENT_GROWTH,
  assumptionText,
  basisFactor,
  basisText,
  fadedRate,
  multiplierText,
  projectScenario,
  projectScenarios,
  scenarioOnBasis,
  valueAtYear,
} from "./scenarios";

const START = { raw: 12_000, sealed: 8_000 };
const central = (year: number) => valueAtYear(START.raw, SEGMENT_GROWTH.raw, {}, year) + valueAtYear(START.sealed, SEGMENT_GROWTH.sealed, {}, year);

test("stress tests project raw and sealed separately and add them up", () => {
  const scenarios = projectScenarios(START);
  assert.deepEqual(scenarios.map((s) => s.id), ["correction", "reprint", "boom-bust"]);
  for (const s of scenarios) {
    assert.deepEqual(s.milestones.map((m) => m.year), [0, 1, 3, 5, 10]);
    assert.equal(s.values[0], 20_000);
    const expected = valueAtYear(START.raw, SEGMENT_GROWTH.raw, s.shocks.raw, 10) + valueAtYear(START.sealed, SEGMENT_GROWTH.sealed, s.shocks.sealed, 10);
    assert.ok(Math.abs(s.values[10] - expected) < 1e-9);
  }
});

test("every stress test ends below the central path", () => {
  for (const s of projectScenarios(START)) assert.ok(s.values[10] < central(10), s.id);
});

test("a reprint wave hurts sealed more than raw", () => {
  const reprint = DEFAULT_SCENARIOS.find((s) => s.id === "reprint")!;
  const sealedOnly = projectScenario({ raw: 0, sealed: 100 }, reprint).multiplier!;
  const rawOnly = projectScenario({ raw: 100, sealed: 0 }, reprint).multiplier!;
  const gap = (1 + SEGMENT_GROWTH.sealed) / (1 + SEGMENT_GROWTH.raw);
  assert.ok(sealedOnly / rawOnly < gap);
});

test("rates hold through year 2, then fade towards the long-run rate from either side", () => {
  assert.equal(fadedRate(0.15, 2), 0.15);
  assert.ok(Math.abs(fadedRate(0.15, 5) - (LONG_RUN_RATE + (0.15 - LONG_RUN_RATE) / 2)) < 1e-12);
  assert.ok(fadedRate(0.15, 10) > LONG_RUN_RATE && fadedRate(0.15, 10) < fadedRate(0.15, 5));
  assert.ok(fadedRate(0, 10) < LONG_RUN_RATE && fadedRate(0, 10) > 0);
  assert.equal(fadedRate(LONG_RUN_RATE, 10), LONG_RUN_RATE);
});

test("growth compounds each year and a shock applies on top in its year", () => {
  assert.equal(valueAtYear(100, 0.1, { 2: -0.5 }, 0), 100);
  assert.ok(Math.abs(valueAtYear(100, 0.1, { 2: -0.5 }, 1) - 110) < 1e-9);
  assert.ok(Math.abs(valueAtYear(100, 0.1, { 2: -0.5 }, 2) - 60.5) < 1e-9);
  assert.ok(Math.abs(valueAtYear(100, 0.1, { 2: -0.5 }, 3) - 60.5 * (1 + fadedRate(0.1, 3))) < 1e-9);
});

test("configurable inputs and horizon", () => {
  const s = projectScenario({ raw: 1000, sealed: 0 }, { id: "flat", label: "Flat", description: "", shocks: { raw: {}, sealed: {} } }, 4);
  assert.equal(s.values.length, 5);
  assert.deepEqual(s.milestones.map((m) => m.year), [0, 1, 3]);
  assert.equal(projectScenarios(START, [DEFAULT_SCENARIOS[2]]).length, 1);
});

test("zero start gives zero values and no multiplier", () => {
  const [s] = projectScenarios({ raw: 0, sealed: 0 });
  assert.ok(s.values.every((v) => v === 0));
  assert.equal(s.multiplier, null);
});

test("basis takes fees off every year and deflates by year", () => {
  assert.equal(basisFactor(5, { afterFees: false, real: false }), 1);
  assert.ok(Math.abs(basisFactor(0, { afterFees: true, real: false }) - 0.87) < 1e-12);
  assert.ok(Math.abs(basisFactor(2, { afterFees: false, real: true }) - 1 / 1.025 ** 2) < 1e-12);

  const [s] = projectScenarios(START);
  const net = scenarioOnBasis(s, 20_000, { afterFees: true, real: false });
  assert.ok(Math.abs(net.values[0] - 17_400) < 1e-9);
  assert.ok(Math.abs(net.multiplier! - s.multiplier! * 0.87) < 1e-12);
  assert.equal(net.milestones[0].value, net.values[0]);
  assert.equal(basisText({ afterFees: true, real: false }), "after 13% selling fees, not adjusted for inflation");
  assert.equal(basisText({ afterFees: false, real: true }), "before selling fees, in today's money");
});

test("assumption and multiplier text", () => {
  assert.equal(assumptionText(DEFAULT_SCENARIOS[0].shocks.raw), "Y2 −30%, Y3 −10%, Y5 +15%");
  assert.equal(assumptionText({ 10: 0.025, 2: -0.5 }), "Y2 −50%, Y10 +2.5%");
  assert.equal(multiplierText(3.8698), "3.87×");
  assert.equal(multiplierText(null), null);
});
