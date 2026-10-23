import { type Money, money } from "@/lib/format";
import { type Scenario, PROJECTION_YEARS } from "@/lib/scenarios";
import { ScenarioChart } from "./scenario-chart";

const panel = "rounded-2xl border border-white/5 bg-surface p-5";

/** "Projected portfolio scenarios" panel: the 10-year chart from the portfolio midpoint. */
export function ScenarioProjection({ start, scenarios, m }: { start: number; scenarios: Scenario[]; m: Money }) {
  return (
    <section className={panel}>
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <div className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-mint">Forward outlook</div>
          <h2 className="text-xl font-bold tracking-tight">Projected portfolio scenarios</h2>
          <p className="text-xs text-slate-2">
            Illustrative, not a prediction · starting midpoint {money(start, m)} · nominal values before transaction costs
          </p>
        </div>
        <div className="font-label text-xs text-slate-2">Milestones across {PROJECTION_YEARS} years</div>
      </div>
      {start > 0 ? (
        <div className="rounded-xl border border-white/5 bg-inset p-4">
          <ScenarioChart scenarios={scenarios} m={m} />
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-slate-2">Projections appear once the portfolio has a value.</p>
      )}
    </section>
  );
}
