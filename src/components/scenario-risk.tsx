import { type Basis, basisText, PROJECTION_YEARS } from "@/lib/scenarios";
import { chanceBelow, DRAWDOWN_THRESHOLD, type Simulation } from "@/lib/simulation";

const pct = (n: number) => (n < 0.01 ? "<1%" : n > 0.99 ? ">99%" : `${Math.round(n * 100)}%`);

/** Chances read off the simulation; `breakeven` is the year-end value that covers cost, null without a known cost. */
export function ScenarioRisk({ simulation, start, breakeven, basis }: { simulation: Simulation; start: number; breakeven: number | null; basis: Basis }) {
  const tiles = [
    { label: "Below today's midpoint", value: chanceBelow(simulation, start, basis), note: `Ends year ${PROJECTION_YEARS} under the starting midpoint` },
    ...(breakeven === null ? [] : [{ label: "Below cost", value: chanceBelow(simulation, breakeven, basis), note: `Ends year ${PROJECTION_YEARS} under what you paid` }]),
    { label: `A ${DRAWDOWN_THRESHOLD * 100}% drop`, value: simulation.drawdownChance, note: "Falls this far from a peak at some point, before fees" },
  ];
  return (
    <section className="card p-5">
      <h2 className="font-label text-label-eyebrow uppercase text-ink">Simulated chances</h2>
      <p className="mb-4 text-xs text-slate-2">
        Share of {simulation.finals.length.toLocaleString("en-US")} simulated paths, {basisText(basis)}. Illustrative, from hand-set assumptions.
      </p>
      <ul className="grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.label} className="inset-well rounded-xl p-3.5">
            <div className="text-xs font-semibold text-slate-2">{t.label}</div>
            <div className="mt-1 text-2xl font-black tracking-tight tabular-nums">{pct(t.value)}</div>
            <div className="mt-0.5 text-body-sm text-slate-2">{t.note}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
