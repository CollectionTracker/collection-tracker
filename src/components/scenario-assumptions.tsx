import { PROJECTION_YEARS } from "@/lib/scenarios";
import { DEFAULT_SPREAD } from "@/lib/valuation";

const pct = (n: number) => `±${Math.round(n * 100)}%`;

/** How the projections are built and what they leave out. */
export function ScenarioAssumptions() {
  return (
    <section className="rounded-2xl border border-white/5 bg-inset p-5">
      <h2 className="mb-3 flex items-center gap-2 font-label text-label-eyebrow uppercase text-slate-2">
        <svg className="h-4 w-4 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
        </svg>
        Valuation context &amp; assumptions
      </h2>
      <div className="max-w-5xl space-y-1.5 text-xs leading-relaxed text-slate-2">
        <p>
          Every scenario starts from today&apos;s combined midpoint; raw cards and sealed products are modelled together. Year 1
          applies a one-off market shift, then years 2–{PROJECTION_YEARS} compound at the scenario&apos;s annual rate.
        </p>
        <p>
          Low and high use the low/high entered with a sealed price, otherwise a default spread around the market value (raw{" "}
          {pct(DEFAULT_SPREAD.raw)}, sealed {pct(DEFAULT_SPREAD.sealed)}); see docs/valuation.md.
        </p>
        <p>
          Illustrative, not a prediction. Nominal values with no inflation adjustment, before selling fees, taxes and shipping.
          Condition or grading changes, thin markets and preorders can move real outcomes well outside these lines.
        </p>
      </div>
    </section>
  );
}
