import { type Money, wholeMoney } from "@/lib/format";
import { PROJECTION_YEARS, type Scenario, assumptionText, multiplierText, scenarioColor } from "@/lib/scenarios";

const panel = "rounded-2xl border border-white/5 bg-surface p-5";
const heading = "font-label text-xs font-bold uppercase tracking-[0.12em] text-ink";

/** One card per scenario: its year-10 value, the assumptions behind it and a "× start" multiplier badge. */
export function YearTenOutcomes({ scenarios, m }: { scenarios: Scenario[]; m: Money }) {
  return (
    <section className={panel}>
      <h2 className={`${heading} mb-4`}>Year {PROJECTION_YEARS} outcomes</h2>
      <ul className="space-y-3">
        {scenarios.map((s) => {
          const color = scenarioColor(s.id);
          const badge = multiplierText(s.multiplier);
          return (
            <li key={s.id} className="rounded-xl border border-white/5 bg-inset p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                  {s.label}
                </div>
                {badge && (
                  <span
                    className="rounded-full px-2 py-0.5 font-label text-[11px] font-bold tabular-nums"
                    style={{ color, background: `${color}1f` }}
                    title={`Year ${PROJECTION_YEARS} value is ${badge} the starting midpoint`}
                  >
                    {badge}
                  </span>
                )}
              </div>
              <div className="mt-1 text-2xl font-black tracking-tight tabular-nums">{wholeMoney(s.values[PROJECTION_YEARS], m)}</div>
              <div className="mt-0.5 text-[11px] text-slate-2">{assumptionText(s)}</div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
