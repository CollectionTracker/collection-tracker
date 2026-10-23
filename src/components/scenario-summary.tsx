import { compactMoney, money, type Money, wholeMoney } from "@/lib/format";
import { PROJECTION_YEARS, type Scenario, multiplierText } from "@/lib/scenarios";
import type { Range } from "@/lib/valuation";

const card = "col-span-4 rounded-2xl border border-white/5 bg-surface p-5";
const labelStyle = "font-label text-[11px] font-bold uppercase tracking-[0.12em] text-slate-2";
const value = "mt-1 text-[28px] font-bold leading-[34px] tracking-[-0.02em] tabular-nums";

/** Header strip for the Scenarios view: where projections start, today's range, and the year-10 spread. */
export function ScenarioSummary({ valuation, scenarios, m }: { valuation: Range; scenarios: Scenario[]; m: Money }) {
  const finals = scenarios.map((s) => s.values[PROJECTION_YEARS]);
  const multipliers = scenarios.map((s) => s.multiplier).filter((m) => m !== null);
  return (
    <section className="page-grid">
      <div className={card}>
        <div className="mb-3 h-1 w-8 rounded-full bg-mint" />
        <div className={labelStyle}>Starting midpoint</div>
        <div className={value}>{money(valuation.mid, m)}</div>
        <div className="mt-1 text-xs text-slate-2">Raw cards and sealed combined; every scenario starts here</div>
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
        <div className="mt-3 flex justify-between border-t border-white/5 pt-3 text-[11px] text-slate-2 tabular-nums">
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
          {compactMoney(Math.min(...finals), m)} – {compactMoney(Math.max(...finals), m)}
        </div>
        <div className="mt-1 text-xs text-slate-2 tabular-nums">
          {multiplierText(Math.min(...multipliers))} to {multiplierText(Math.max(...multipliers))} the midpoint across{" "}
          {scenarios.length} scenarios
        </div>
      </div>
    </section>
  );
}
