import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_SCENARIOS,
  LONG_RUN_RATE,
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
const flat = { year1Shift: 0, annualRate: 0 };

test("scenarios project raw and sealed separately and add them up", () => {
  const scenarios = projectScenarios(START);
  assert.deepEqual(scenarios.map((s) => s.id), ["conservative", "moderate", "high"]);
  for (const s of scenarios) {
    assert.deepEqual(s.milestones.map((m) => m.year), [0, 1, 3, 5, 10]);
    assert.equal(s.values[0], 20_000);
    for (const year of [1, 5, 10]) {
      const expected = valueAtYear(START.raw, s.segments.raw, year) + valueAtYear(START.sealed, s.segments.sealed, year);
      assert.ok(Math.abs(s.values[year] - expected) < 1e-9);
    }
  }
  const finals = scenarios.map((s) => s.values[10]);
  assert.ok(finals[0] < finals[1] && finals[1] < finals[2]);
});

test("a segment's mix changes the result", () => {
  const input = { id: "x", label: "X", segments: { raw: flat, sealed: { year1Shift: 0.5, annualRate: 0 } } };
  assert.ok(projectScenario({ raw: 0, sealed: 100 }, input).values[1] > projectScenario({ raw: 100, sealed: 0 }, input).values[1]);
});

test("rates hold through year 2, then fade towards the long-run rate from either side", () => {
  assert.equal(fadedRate(0.15, 2), 0.15);
  assert.ok(Math.abs(fadedRate(0.15, 5) - (LONG_RUN_RATE + (0.15 - LONG_RUN_RATE) / 2)) < 1e-12);
  assert.ok(fadedRate(0.15, 10) > LONG_RUN_RATE && fadedRate(0.15, 10) < fadedRate(0.15, 5));
  assert.ok(fadedRate(0, 10) < LONG_RUN_RATE && fadedRate(0, 10) > 0);
  assert.equal(fadedRate(LONG_RUN_RATE, 10), LONG_RUN_RATE);
});

test("year 1 applies the shift, later years compound the faded rate", () => {
  const input = { year1Shift: -0.1, annualRate: 0.1 };
  assert.equal(valueAtYear(100, input, 0), 100);
  assert.equal(valueAtYear(100, input, 1), 90);
  assert.ok(Math.abs(valueAtYear(100, input, 2) - 99) < 1e-9);
  assert.ok(Math.abs(valueAtYear(100, input, 3) - 99 * (1 + fadedRate(0.1, 3))) < 1e-9);
});

test("configurable inputs and horizon", () => {
  const steady = { year1Shift: 0, annualRate: LONG_RUN_RATE };
  const s = projectScenario({ raw: 1000, sealed: 0 }, { id: "steady", label: "Steady", segments: { raw: steady, sealed: steady } }, 4);
  assert.equal(s.values.length, 5);
  assert.deepEqual(s.milestones.map((m) => m.year), [0, 1, 3]);
  assert.ok(Math.abs(s.values[4] - 1000 * (1 + LONG_RUN_RATE) ** 3) < 1e-9);

  const custom = projectScenarios(START, [DEFAULT_SCENARIOS[2]]);
  assert.equal(custom.length, 1);
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
  assert.equal(assumptionText(DEFAULT_SCENARIOS[0].segments.raw), "Y1 −15%, then 2% annually");
  assert.equal(assumptionText({ year1Shift: 0, annualRate: 0.025 }), "Y1 0%, then 2.5% annually");
  assert.equal(assumptionText({ year1Shift: 0.07, annualRate: -0.02 }), "Y1 +7%, then −2% annually");
  assert.equal(multiplierText(3.8698), "3.87×");
  assert.equal(multiplierText(null), null);
});
