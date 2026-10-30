import { SELLING_FEE_PCT } from "./valuation";

/**
 * Illustrative 10-year stress tests, not predictions. Raw cards and sealed products are projected separately and added
 * together: both follow the central growth path, which fades towards `LONG_RUN_RATE`, and each stress test adds one-off
 * market moves in chosen years. See docs/scenarios.md.
 */
export type SegmentId = "raw" | "sealed";
export type SegmentValues = Record<SegmentId, number>;

/** One-off market moves by year on top of growth, e.g. { 2: -0.3 } for −30 % in year 2. */
export type Shocks = Record<number, number>;

export type ScenarioInput = {
  id: string;
  label: string;
  description: string;
  shocks: Record<SegmentId, Shocks>;
};

export type Scenario = ScenarioInput & {
  /** Value at each year 0…horizon; index = year. */
  values: number[];
  /** Value at each milestone year, in `MILESTONE_YEARS` order (only those within the horizon). */
  milestones: { year: number; value: number }[];
  /** Final value ÷ starting value, e.g. 3.87 for "3.87×"; null when the start is zero. */
  multiplier: number | null;
};

/** How a projected value is shown: net of selling fees, and in today's money. */
export type Basis = { afterFees: boolean; real: boolean };

export const PROJECTION_YEARS = 10;
export const MILESTONE_YEARS = [0, 1, 3, 5, 10] as const;
export const DEFAULT_BASIS: Basis = { afterFees: true, real: false };

/** Annual rate every segment drifts towards; the gap to it halves every `FADE_HALF_LIFE_YEARS`. */
export const LONG_RUN_RATE = 0.035;
export const FADE_HALF_LIFE_YEARS = 3;
export const INFLATION_RATE = 0.025;

/** Typical annual growth before it fades: the central path of the stress tests and the simulation. */
export const SEGMENT_GROWTH: SegmentValues = { raw: 0.06, sealed: 0.09 };

export const DEFAULT_SCENARIOS: readonly ScenarioInput[] = [
  {
    id: "correction",
    label: "Market correction",
    description: "A two-year slide with a partial rebound",
    shocks: { raw: { 2: -0.3, 3: -0.1, 5: 0.15 }, sealed: { 2: -0.35, 3: -0.1, 5: 0.2 } },
  },
  {
    id: "reprint",
    label: "Reprint wave",
    description: "Heavy reprints hit sealed far harder than cards",
    shocks: { raw: { 1: -0.05 }, sealed: { 1: -0.25, 2: -0.1 } },
  },
  {
    id: "boom-bust",
    label: "Boom then bust",
    description: "A hype spike that gives its gains back",
    shocks: { raw: { 1: 0.25, 2: 0.15, 4: -0.3, 5: -0.15 }, sealed: { 1: 0.3, 2: 0.2, 4: -0.35, 5: -0.15 } },
  },
];

/** Colour per scenario id. */
export const SCENARIO_COLORS: Record<string, string> = { correction: "#f59e0b", reprint: "#2dd4bf", "boom-bust": "#a855f7" };
export const scenarioColor = (id: string) => SCENARIO_COLORS[id] ?? "#94a3b8";

/** The rate applied in `year`: the full rate through year 2, then fading towards the long-run rate. */
export function fadedRate(rate: number, year: number) {
  return LONG_RUN_RATE + (rate - LONG_RUN_RATE) * 0.5 ** (Math.max(0, year - 2) / FADE_HALF_LIFE_YEARS);
}

/** Value after `year` years from `start`: growth compounds each year, and that year's shock applies on top. */
export function valueAtYear(start: number, growth: number, shocks: Shocks, year: number) {
  let value = start;
  for (let y = 1; y <= year; y++) value *= (1 + fadedRate(growth, y)) * (1 + (shocks[y] ?? 0));
  return value;
}

export const totalOf = (start: SegmentValues) => start.raw + start.sealed;

export function projectScenario(start: SegmentValues, input: ScenarioInput, horizon = PROJECTION_YEARS): Scenario {
  const values = Array.from(
    { length: horizon + 1 },
    (_, year) => valueAtYear(start.raw, SEGMENT_GROWTH.raw, input.shocks.raw, year) + valueAtYear(start.sealed, SEGMENT_GROWTH.sealed, input.shocks.sealed, year),
  );
  return withValues(input, values, totalOf(start));
}

function withValues(input: ScenarioInput, values: number[], start: number): Scenario {
  const horizon = values.length - 1;
  return {
    ...input,
    values,
    milestones: MILESTONE_YEARS.filter((y) => y <= horizon).map((year) => ({ year, value: values[year] })),
    multiplier: start > 0 ? values[horizon] / start : null,
  };
}

/** Project every stress test from the current raw and sealed midpoints. */
export function projectScenarios(start: SegmentValues, inputs: readonly ScenarioInput[] = DEFAULT_SCENARIOS, horizon = PROJECTION_YEARS) {
  return inputs.map((input) => projectScenario(start, input, horizon));
}

/** What 1 of market value in `year` is worth on this basis. Fees apply from year 0: selling today costs them too. */
export function basisFactor(year: number, { afterFees, real }: Basis) {
  return (afterFees ? 1 - SELLING_FEE_PCT / 100 : 1) / (real ? (1 + INFLATION_RATE) ** year : 1);
}

/** A scenario restated on `basis`; its multiplier stays against the full starting midpoint. */
export function scenarioOnBasis(scenario: Scenario, start: number, basis: Basis) {
  return withValues(scenario, scenario.values.map((v, year) => v * basisFactor(year, basis)), start);
}

/** Plain-language basis, e.g. "after 13% selling fees, in future dollars". */
export function basisText({ afterFees, real }: Basis) {
  return `${afterFees ? `after ${SELLING_FEE_PCT}% selling fees` : "before selling fees"}, ${real ? "in today's money" : "not adjusted for inflation"}`;
}

const pctText = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Number((Math.abs(n) * 100).toFixed(1))}%`;

/** Plain-language shocks, e.g. "Y2 −30%, Y3 −10%". */
export function assumptionText(shocks: Shocks) {
  return Object.entries(shocks)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, shock]) => `Y${year} ${pctText(shock)}`)
    .join(", ");
}

/** Multiplier badge text, e.g. "3.87×"; null when there is no multiplier. */
export const multiplierText = (m: number | null) => (m === null ? null : `${m.toFixed(2)}×`);
