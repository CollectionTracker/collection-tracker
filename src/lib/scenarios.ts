import { SELLING_FEE_PCT } from "./valuation";

/**
 * Illustrative 10-year value scenarios, not a prediction. Raw cards and sealed products are projected separately and
 * added together: year 1 applies a one-off market shift, then the annual rate compounds and fades towards
 * `LONG_RUN_RATE`. See docs/scenarios.md.
 */
export type SegmentId = "raw" | "sealed";
export type SegmentValues = Record<SegmentId, number>;

export type SegmentAssumption = {
  year1Shift: number; // e.g. -0.15 for −15 % in year 1
  annualRate: number; // e.g. 0.03 for 3 % a year from year 2, before it fades
};

export type ScenarioInput = {
  id: string;
  label: string;
  segments: Record<SegmentId, SegmentAssumption>;
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

/** Typical annual growth from year 2: the Moderate scenario, and the central case of the simulation. */
export const SEGMENT_GROWTH: SegmentValues = { raw: 0.06, sealed: 0.09 };

export const DEFAULT_SCENARIOS: readonly ScenarioInput[] = [
  {
    id: "conservative",
    label: "Conservative",
    segments: { raw: { year1Shift: -0.15, annualRate: 0.02 }, sealed: { year1Shift: -0.2, annualRate: 0.04 } },
  },
  {
    id: "moderate",
    label: "Moderate",
    segments: { raw: { year1Shift: -0.05, annualRate: SEGMENT_GROWTH.raw }, sealed: { year1Shift: -0.05, annualRate: SEGMENT_GROWTH.sealed } },
  },
  {
    id: "high",
    label: "High",
    segments: { raw: { year1Shift: 0.1, annualRate: 0.12 }, sealed: { year1Shift: 0.1, annualRate: 0.16 } },
  },
];

/** Colour per scenario id; matches the render (amber conservative, mint moderate, violet high). */
export const SCENARIO_COLORS: Record<string, string> = { conservative: "#f59e0b", moderate: "#2dd4bf", high: "#a855f7" };
export const scenarioColor = (id: string) => SCENARIO_COLORS[id] ?? "#94a3b8";

/** The rate applied in `year`: the full rate through year 2, then fading towards the long-run rate. */
export function fadedRate(rate: number, year: number) {
  return LONG_RUN_RATE + (rate - LONG_RUN_RATE) * 0.5 ** (Math.max(0, year - 2) / FADE_HALF_LIFE_YEARS);
}

/** Value after `year` years from `start`: year 0 is the start, year 1 applies the shift, later years compound. */
export function valueAtYear(start: number, { year1Shift, annualRate }: SegmentAssumption, year: number) {
  if (year <= 0) return start;
  let value = start * (1 + year1Shift);
  for (let y = 2; y <= year; y++) value *= 1 + fadedRate(annualRate, y);
  return value;
}

export const totalOf = (start: SegmentValues) => start.raw + start.sealed;

export function projectScenario(start: SegmentValues, input: ScenarioInput, horizon = PROJECTION_YEARS): Scenario {
  const values = Array.from(
    { length: horizon + 1 },
    (_, year) => valueAtYear(start.raw, input.segments.raw, year) + valueAtYear(start.sealed, input.segments.sealed, year),
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

/** Project every scenario from the current raw and sealed midpoints. */
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

const pctText = (n: number, signed: boolean) =>
  `${signed ? (n > 0 ? "+" : n < 0 ? "−" : "") : n < 0 ? "−" : ""}${Number((Math.abs(n) * 100).toFixed(1))}%`;

/** Plain-language assumptions, e.g. "Y1 −15%, then 3% annually". */
export function assumptionText({ year1Shift, annualRate }: SegmentAssumption) {
  return `Y1 ${pctText(year1Shift, true)}, then ${pctText(annualRate, false)} annually`;
}

/** Multiplier badge text, e.g. "3.87×"; null when there is no multiplier. */
export const multiplierText = (m: number | null) => (m === null ? null : `${m.toFixed(2)}×`);
