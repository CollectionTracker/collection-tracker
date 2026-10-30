import { type Basis, basisFactor, fadedRate, PROJECTION_YEARS, SEGMENT_GROWTH, type SegmentId, type SegmentValues } from "./scenarios";

/**
 * Monte Carlo projection of the portfolio, illustrative and not a prediction. Each year the market is in a boom, flat
 * or bust regime, and every segment's log return is:
 *
 *   growth + beta × market move + segment noise + holding noise × √(concentration)
 *
 * Every parameter below is hand-set and has not been fitted to price history. See docs/scenarios.md.
 */
export const REGIMES = [
  { id: "boom", mean: 0.2, vol: 0.12 },
  { id: "flat", mean: 0, vol: 0.08 },
  { id: "bust", mean: -0.25, vol: 0.12 },
] as const;

/** Chance of moving to each regime next year, by current regime (same order as `REGIMES`). */
export const REGIME_TRANSITIONS = [
  [0.5, 0.35, 0.15],
  [0.2, 0.6, 0.2],
  [0.25, 0.5, 0.25],
] as const;

export const SEGMENT_RISK: Record<SegmentId, { beta: number; noise: number; holdingNoise: number }> = {
  raw: { beta: 1, noise: 0.08, holdingNoise: 0.4 },
  sealed: { beta: 1.2, noise: 0.1, holdingNoise: 0.25 },
};

export const SIMULATION_PATHS = 5000;
export const DRAWDOWN_THRESHOLD = 0.4;
const SEGMENTS: SegmentId[] = ["raw", "sealed"];
const SEED = 20240208;

export type Band = { year: number; p10: number; p25: number; p50: number; p75: number; p90: number };

export type Simulation = {
  /** Percentiles at each year 0…horizon, in market value. */
  bands: Band[];
  /** Every path's final market value, ascending. */
  finals: Float64Array;
  /** Share of paths that fall at least `DRAWDOWN_THRESHOLD` below an earlier peak. */
  drawdownChance: number;
};

/** Sum of squared shares: 1 for a single holding, 1/n for n equal holdings, 0 for none. */
export function herfindahl(values: number[]) {
  const total = values.reduce((a, v) => a + v, 0);
  return total > 0 ? values.reduce((a, v) => a + (v / total) ** 2, 0) : 0;
}

/** Seeded generator (mulberry32), so the fan chart doesn't change between renders. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal draw (Box–Muller). */
function normal(rand: () => number) {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
}

/** Long-run share of years in each regime. */
export function stationaryRegimes() {
  let share: number[] = REGIMES.map(() => 1 / REGIMES.length);
  for (let i = 0; i < 200; i++) {
    share = share.map((_, to) => share.reduce((a, s, from) => a + s * REGIME_TRANSITIONS[from][to], 0));
  }
  return share;
}

function pick(shares: readonly number[], rand: () => number) {
  let r = rand();
  for (let i = 0; i < shares.length - 1; i++) {
    r -= shares[i];
    if (r < 0) return i;
  }
  return shares.length - 1;
}

const percentile = (sorted: Float64Array, p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];

/** Simulate from the raw and sealed midpoints; `concentration` is each segment's Herfindahl index. */
export function simulate(start: SegmentValues, concentration: SegmentValues, paths = SIMULATION_PATHS, horizon = PROJECTION_YEARS): Simulation {
  const rand = random(SEED);
  const stationary = stationaryRegimes();
  // Centred on zero, so a typical path grows at the segment's growth rate rather than the regimes' average.
  const meanMove = REGIMES.reduce((a, r, i) => a + r.mean * stationary[i], 0);
  const byYear = Array.from({ length: horizon + 1 }, () => new Float64Array(paths));
  let drawdowns = 0;

  for (let path = 0; path < paths; path++) {
    const value = { ...start };
    let total = value.raw + value.sealed;
    let peak = total;
    let fell = false;
    let regime = pick(stationary, rand);
    byYear[0][path] = total;
    for (let year = 1; year <= horizon; year++) {
      regime = pick(REGIME_TRANSITIONS[regime], rand);
      const move = REGIMES[regime].mean - meanMove + REGIMES[regime].vol * normal(rand);
      for (const s of SEGMENTS) {
        const { beta, noise, holdingNoise } = SEGMENT_RISK[s];
        const shock = noise * normal(rand) + holdingNoise * Math.sqrt(concentration[s]) * normal(rand);
        value[s] *= Math.exp(Math.log(1 + fadedRate(SEGMENT_GROWTH[s], year)) + beta * move + shock);
      }
      total = value.raw + value.sealed;
      peak = Math.max(peak, total);
      fell ||= peak > 0 && total <= peak * (1 - DRAWDOWN_THRESHOLD);
      byYear[year][path] = total;
    }
    if (fell) drawdowns++;
  }

  for (const year of byYear) year.sort();
  return {
    bands: byYear.map((sorted, year) => ({
      year,
      p10: percentile(sorted, 0.1),
      p25: percentile(sorted, 0.25),
      p50: percentile(sorted, 0.5),
      p75: percentile(sorted, 0.75),
      p90: percentile(sorted, 0.9),
    })),
    finals: byYear[horizon],
    drawdownChance: drawdowns / paths,
  };
}

/** The percentile bands restated on `basis`. */
export function bandsOnBasis(bands: Band[], basis: Basis): Band[] {
  return bands.map((b) => {
    const f = basisFactor(b.year, basis);
    return { year: b.year, p10: b.p10 * f, p25: b.p25 * f, p50: b.p50 * f, p75: b.p75 * f, p90: b.p90 * f };
  });
}

/** Share of paths that end below `threshold`, with final values on `basis`. */
export function chanceBelow({ finals }: Simulation, threshold: number, basis: Basis) {
  const f = basisFactor(PROJECTION_YEARS, basis);
  return finals.reduce((n, v) => n + (v * f < threshold ? 1 : 0), 0) / finals.length;
}
