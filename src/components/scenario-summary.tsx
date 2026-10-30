import { compactMoney, money, type Money, wholeMoney } from "@/lib/format";
import { type Basis, basisText, multiplierText, PROJECTION_YEARS } from "@/lib/scenarios";
import type { Band } from "@/lib/simulation";
import type { Range } from "@/lib/valuation";

const card = "col-span-4 card p-5";
const labelStyle = "font-label text-label-eyebrow uppercase text-slate-2";
const value = "mt-1 text-metric-display tabular-nums";

/** Header strip for the Scenarios view: where projections start, today's range, and the simulated year-10 range. */
export function ScenarioSummary({ valuation, bands, basis, m }: { valuation: Range; bands: Band[]; basis: Basis; m: Money }) {
  const { p10, p90 } = bands[PROJECTION_YEARS];
  return (
    <section className="page-grid">
      <div className={card}>
        <div className="mb-3 h-1 w-8 rounded-full bg-mint" />
        <div className={labelStyle}>Starting midpoint</div>
        <div className={value}>{money(valuation.mid, m)}</div>
        <div className="mt-1 text-xs text-slate-2">Market value of raw cards and sealed; projections start here</div>
      </div>
      <div className={card}>
        <div className="mb-3 h-1 w-8 rounded-full bg-amber" />
        <div className={labelStyle}>Valuation range</div>
        <div className={value}>
          {compactMoney(valuation.low, m)} – {compactMoney(valuation.high, m)}
        </div>
        <div className="mt-1 flex justify-between gap-2 text-xs text-slate-2">
          <span>Low to high estimate today</span>
          <span className="font-label text-amber tabular-nums">Δ {wholeMoney(valuation.high - valuation.low, m)}</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-white/5 pt-3 text-body-sm text-slate-2 tabular-nums">
          <span>
            Low <strong className="text-ink">{wholeMoney(valuation.low, m)}</strong>
          </span>
          <span>
            High <strong className="text-ink">{wholeMoney(valuation.high, m)}</strong>
          </span>
        </div>
      </div>
      {/* Full row on tablets, where three cards would leave this one alone at half width. */}
      <div className={`${card} md:col-span-8 lg:col-span-4`}>
        <div className="mb-3 h-1 w-8 rounded-full bg-violet" />
        <div className={labelStyle}>Year {PROJECTION_YEARS} range</div>
        <div className={value}>
          {compactMoney(p10, m)} – {compactMoney(p90, m)}
        </div>
        <div className="mt-1 text-xs text-slate-2 tabular-nums">
          {valuation.mid > 0 ? `${multiplierText(p10 / valuation.mid)} to ${multiplierText(p90 / valuation.mid)} the midpoint; ` : ""}
          middle 80% of simulations, {basisText(basis)}
        </div>
      </div>
    </section>
  );
}
