import { compactMoney, type Money } from "@/lib/format";
import type { Dashboard } from "@/lib/stats";

const panel = "rounded-2xl border border-white/5 bg-surface p-5";
const heading = "font-label text-xs font-bold uppercase tracking-[0.12em] text-ink";
const TOP = 5;

type Row = { label: string; value: number };

type BarPanelProps = { title: string; rows: Row[]; bar: string; text: string; empty: string; m: Money };

function BarPanel({ title, rows, bar, text, empty, m }: BarPanelProps) {
  const top = rows.slice(0, TOP);
  const max = top[0]?.value ?? 0;
  return (
    <div className={panel}>
      <h3 className={`${heading} mb-4`}>{title}</h3>
      {max <= 0 ? (
        <p className="text-sm text-slate-2">{empty}</p>
      ) : (
        <ul className="space-y-3 text-xs">
          {top.map((r, i) => (
            <li key={r.label} className="grid grid-cols-12 items-center gap-2">
              <span className="col-span-5 truncate text-slate-2" title={r.label}>
                {r.label}
              </span>
              <div className="col-span-5 h-2 overflow-hidden rounded-full bg-track">
                <div className={`h-full rounded-full ${bar}`} style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
              <span className={`col-span-2 text-right tabular-nums ${i === 0 ? `font-bold ${text}` : ""}`}>{compactMoney(r.value, m)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RawBreakdown({ d, m }: { d: Dashboard; m: Money }) {
  const sets = d.setProgress.map((s) => ({ label: s.name, value: s.value }));
  const empty = "No priced raw cards yet.";
  return (
    <section className="grid gap-3 md:grid-cols-2 md:gap-5">
      <BarPanel title="Value by card set" rows={sets} bar="bg-mint" text="text-mint" empty={empty} m={m} />
      <BarPanel title="Value by rarity" rows={d.byRarity} bar="bg-violet" text="text-violet" empty={empty} m={m} />
    </section>
  );
}
