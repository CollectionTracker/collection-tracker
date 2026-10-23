import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SCENARIOS, projectScenario, projectScenarios, valueAtYear } from "./scenarios";

// Starting midpoint and milestone values from the Stitch render (.renders/pokevault_portfolio_marketing_intelligence_dashboard),
// which shows whole dollars rounded inconsistently (High Y5 is $1.57 low), so values are compared to within $2.
const START = 19_080.22;
const EXPECTED = {
  conservative: { 1: 16_218, 3: 17_206, 5: 18_253, 10: 21_161, multiplier: 1.11 },
  moderate: { 1: 18_126, 3: 21_142, 5: 24_660, 10: 36_234, multiplier: 1.9 },
  high: { 1: 20_988, 3: 27_756, 5: 36_707, 10: 73_834, multiplier: 3.87 },
} as const;

test("default scenarios match the render's milestone values and multipliers", () => {
  const scenarios = projectScenarios(START);
  assert.deepEqual(scenarios.map((s) => s.id), ["conservative", "moderate", "high"]);
  for (const s of scenarios) {
    const want = EXPECTED[s.id as keyof typeof EXPECTED];
    assert.deepEqual(s.milestones.map((m) => m.year), [0, 1, 3, 5, 10]);
    assert.equal(s.milestones[0].value, START);
    for (const { year, value } of s.milestones.slice(1)) {
      const expected = want[year as 1 | 3 | 5 | 10];
      assert.ok(Math.abs(value - expected) < 2, `${s.id} Y${year}: ${value} vs ${expected}`);
    }
    assert.equal(Number(s.multiplier!.toFixed(2)), want.multiplier, `${s.id} multiplier`);
  }
});

test("year 1 applies the shift, later years compound at the rate", () => {
  const input = { year1Shift: -0.1, annualRate: 0.1 };
  assert.equal(valueAtYear(100, input, 0), 100);
  assert.equal(valueAtYear(100, input, 1), 90);
  assert.ok(Math.abs(valueAtYear(100, input, 2) - 99) < 1e-9);
  assert.ok(Math.abs(valueAtYear(100, input, 3) - 108.9) < 1e-9);
});

test("configurable inputs and horizon", () => {
  const s = projectScenario(1000, { id: "flat", label: "Flat", year1Shift: 0, annualRate: 0 }, 4);
  assert.deepEqual(s.values, [1000, 1000, 1000, 1000, 1000]);
  assert.deepEqual(s.milestones.map((m) => m.year), [0, 1, 3]);
  assert.equal(s.multiplier, 1);

  const custom = projectScenarios(500, [{ ...DEFAULT_SCENARIOS[2], annualRate: 0.2 }]);
  assert.equal(custom.length, 1);
  assert.ok(Math.abs(custom[0].values[10] - 500 * 1.1 * 1.2 ** 9) < 1e-9);
});

test("zero start gives zero values and no multiplier", () => {
  const [s] = projectScenarios(0);
  assert.ok(s.values.every((v) => v === 0));
  assert.equal(s.multiplier, null);
});
