/**
 * Illustrative 10-year value scenarios, not a prediction. Year 1 applies a one-off market shift to the
 * starting midpoint; years 2–10 compound at the scenario's annual rate. Nominal values, before fees and taxes.
 */
export type ScenarioInput = {
  id: string;
  label: string;
  year1Shift: number; // e.g. -0.15 for −15 % in year 1
  annualRate: number; // e.g. 0.03 for 3 % a year from year 2
};

export type Scenario = ScenarioInput & {
  /** Value at each year 0…horizon; index = year. */
  values: number[];
  /** Value at each milestone year, in `MILESTONE_YEARS` order (only those within the horizon). */
  milestones: { year: number; value: number }[];
  /** Final value ÷ starting value, e.g. 3.87 for "3.87×"; null when the start is zero. */
  multiplier: number | null;
};

export const PROJECTION_YEARS = 10;
export const MILESTONE_YEARS = [0, 1, 3, 5, 10] as const;

export const DEFAULT_SCENARIOS: readonly ScenarioInput[] = [
  { id: "conservative", label: "Conservative", year1Shift: -0.15, annualRate: 0.03 },
  { id: "moderate", label: "Moderate", year1Shift: -0.05, annualRate: 0.08 },
  { id: "high", label: "High", year1Shift: 0.1, annualRate: 0.15 },
];

/** Value after `year` years from `start`: year 0 is the start, year 1 applies the shift, later years compound. */
export function valueAtYear(start: number, { year1Shift, annualRate }: Pick<ScenarioInput, "year1Shift" | "annualRate">, year: number) {
  if (year <= 0) return start;
  return start * (1 + year1Shift) * (1 + annualRate) ** (year - 1);
}

export function projectScenario(start: number, input: ScenarioInput, horizon = PROJECTION_YEARS): Scenario {
  const values = Array.from({ length: horizon + 1 }, (_, year) => valueAtYear(start, input, year));
  return {
    ...input,
    values,
    milestones: MILESTONE_YEARS.filter((y) => y <= horizon).map((year) => ({ year, value: values[year] })),
    multiplier: start > 0 ? values[horizon] / start : null,
  };
}

/** Project every scenario from the current portfolio midpoint. */
export function projectScenarios(start: number, inputs: readonly ScenarioInput[] = DEFAULT_SCENARIOS, horizon = PROJECTION_YEARS) {
  return inputs.map((input) => projectScenario(start, input, horizon));
}
