import { type Money, money } from "@/lib/format";
import { type Basis, basisText, type Scenario, PROJECTION_YEARS } from "@/lib/scenarios";
import type { Band } from "@/lib/simulation";
import { ScenarioChart } from "./scenario-chart";

const panel = "card p-5";

function BasisToggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onChange(!on)}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${on ? "border-mint/50 bg-mint/10 text-mint" : "border-white/10 text-slate-2 hover:text-ink"}`}
    >
      {label}
    </button>
  );
}

/** "Projected portfolio scenarios" panel: the 10-year chart from the portfolio midpoint, with its fee and inflation toggles. */
export function ScenarioProjection({
  start,
  scenarios,
  bands,
  basis,
  onBasisChange,
  m,
}: {
  start: number;
  scenarios: Scenario[];
  bands: Band[];
  basis: Basis;
  onBasisChange: (basis: Basis) => void;
  m: Money;
}) {
  return (
    <section className={panel}>
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <div className="font-label text-label-eyebrow uppercase text-mint">Forward outlook</div>
          <h2 className="text-xl font-bold tracking-tight">Projected portfolio scenarios</h2>
          <p className="text-xs text-slate-2">
            Illustrative, not a prediction · starting midpoint {money(start, m)} · {basisText(basis)}
          </p>
        </div>
        {start > 0 ? (
          <div className="flex shrink-0 gap-2">
            <BasisToggle label="After fees" on={basis.afterFees} onChange={(afterFees) => onBasisChange({ ...basis, afterFees })} />
            <BasisToggle label="Today's money" on={basis.real} onChange={(real) => onBasisChange({ ...basis, real })} />
          </div>
        ) : (
          <div className="font-label text-xs text-slate-2">Milestones across {PROJECTION_YEARS} years</div>
        )}
      </div>
      {start > 0 ? (
        <div className="inset-well rounded-xl p-4">
          <ScenarioChart scenarios={scenarios} bands={bands} m={m} />
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-slate-2">Projections appear once the portfolio has a value.</p>
      )}
    </section>
  );
}
