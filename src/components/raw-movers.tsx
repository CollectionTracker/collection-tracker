import Image from "next/image";
import { cardPreview } from "@/lib/card-preview";
import { pct, signed, tone, usd } from "@/lib/format";
import type { Dashboard } from "@/lib/stats";
import { ValueChart } from "./value-chart";

const panel = "rounded-2xl border border-white/5 bg-surface p-5";
const heading = "font-label text-xs font-bold uppercase tracking-[0.12em] text-ink";

export function RawHistory({ d }: { d: Dashboard }) {
  return (
    <section className={panel}>
      <h3 className={`${heading} mb-4`}>Raw card value over time</h3>
      <ValueChart data={d.history} />
    </section>
  );
}

export function RawMovers({ d }: { d: Dashboard }) {
  const movers = [...d.gainers, ...d.losers];
  return (
    <section className={panel}>
      <h3 className={`${heading} mb-4`}>Top movers</h3>
      {movers.length === 0 ? (
        <p className="text-sm text-slate-2">Needs at least two daily snapshots.</p>
      ) : (
        <ul className="space-y-3">
          {movers.map((h) => (
            <li key={h.id} className="flex items-center gap-3" {...cardPreview(h)}>
              {h.image && <Image src={h.image} alt="" width={36} height={50} className="rounded-md" />}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{h.name}</div>
                <div className="truncate text-xs text-slate-2">
                  {h.setName} · #{h.number} · {h.variant} · {h.condition}
                  {h.quantity > 1 && ` · ×${h.quantity}`}
                </div>
              </div>
              <div className="text-right text-sm tabular-nums">
                <div>{usd(h.value)}</div>
                <div className={`text-xs ${tone(h.change)}`}>
                  {signed(h.change)} ({pct(h.changePct)})
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
