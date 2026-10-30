import { FADE_HALF_LIFE_YEARS, INFLATION_RATE, LONG_RUN_RATE, PROJECTION_YEARS } from "@/lib/scenarios";
import { SIMULATION_PATHS } from "@/lib/simulation";
import { DEFAULT_SPREAD, SELLING_FEE_PCT } from "@/lib/valuation";

const pct = (n: number) => `±${Math.round(n * 100)}%`;
const rate = (n: number) => `${Number((n * 100).toFixed(1))}%`;

/** How the projections are built and what they leave out. */
export function ScenarioAssumptions() {
  return (
    <section className="inset-well rounded-2xl p-5">
      <h2 className="mb-3 flex items-center gap-2 font-label text-label-eyebrow uppercase text-slate-2">
        <svg className="h-4 w-4 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
        </svg>
        Valuation context &amp; assumptions
      </h2>
      <div className="max-w-5xl space-y-1.5 text-xs leading-relaxed text-slate-2">
        <p>
          Raw cards and sealed products are projected separately from today&apos;s midpoints, then added together. Each scenario
          applies a one-off market shift in year 1, then compounds at its annual rate, which fades towards {rate(LONG_RUN_RATE)} a
          year: the gap halves every {FADE_HALF_LIFE_YEARS} years.
        </p>
        <p>
          The shaded fan is {SIMULATION_PATHS.toLocaleString("en-US")} simulated paths over {PROJECTION_YEARS} years, with booms,
          flat years and busts that hit raw and sealed together, plus extra swings when value sits in a few holdings. Its
          growth, volatility and regime settings are hand-set judgement, not measured from price history, so read it as a
          rough range. It can&apos;t tell you the long-run growth rate.
        </p>
        <p>
          Low and high use the low/high entered with a sealed price, otherwise a default spread around the market value (raw{" "}
          {pct(DEFAULT_SPREAD.raw)}, sealed {pct(DEFAULT_SPREAD.sealed)}); see docs/valuation.md.
        </p>
        <p>
          After fees takes off an illustrative {SELLING_FEE_PCT}% selling fee in every year. Today&apos;s money deflates by{" "}
          {rate(INFLATION_RATE)} a year. Taxes and shipping are not deducted. Condition or grading changes, reprints, thin markets
          and preorders can move real outcomes well outside this range.
        </p>
      </div>
    </section>
  );
}
