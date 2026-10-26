import { type Money, money } from "@/lib/format";
import type { Dashboard } from "@/lib/stats";

const panel = "rounded-2xl border border-white/5 bg-surface p-5";
const heading = "font-label text-label-eyebrow uppercase text-ink";
const SETS = 8;

export function RawStructure({ d, m }: { d: Dashboard; m: Money }) {
  const sets = d.setProgress.slice(0, SETS);
  return (
    <section className="grid gap-3 md:grid-cols-2 md:gap-5">
      <div className={panel}>
        <h3 className={`${heading} mb-4`}>Set completion</h3>
        {sets.length === 0 ? (
          <p className="text-sm text-slate-2">No raw cards yet.</p>
        ) : (
          <ul className="space-y-3">
            {sets.map((s) => {
              const done = s.total ? Math.min(100, (s.owned / s.total) * 100) : 0;
              return (
                <li key={s.id}>
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate text-slate-2">{s.name}</span>
                    <span className="font-bold tabular-nums">{money(s.value, m)}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-track">
                    <div className="h-full rounded-full bg-sky" style={{ width: `${done}%` }} />
                  </div>
                  <div className="mt-0.5 text-xs tabular-nums text-slate-2">
                    {s.owned}/{s.total} cards ({done.toFixed(0)}%)
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className={panel}>
        <h3 className={`${heading} mb-4`}>Value by condition</h3>
        {d.totalValue <= 0 ? (
          <p className="text-sm text-slate-2">No priced raw cards yet.</p>
        ) : (
          <ul className="space-y-3">
            {d.byCondition.map((b) => (
              <li key={b.label}>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-slate-2">
                    {b.label} <span className="text-xs">×{b.count}</span>
                  </span>
                  <span className="font-bold tabular-nums">
                    {((b.value / d.totalValue) * 100).toFixed(1)}% <span className="font-normal text-slate-2">· {money(b.value, m)}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-track">
                  <div className="h-full rounded-full bg-amber" style={{ width: `${(b.value / d.totalValue) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
