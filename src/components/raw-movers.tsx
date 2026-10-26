import Image from "next/image";
import { rawAsset } from "@/lib/asset-detail";
import { cardPreview } from "@/lib/card-preview";
import { type Money, money, pct, signedMoney, tone } from "@/lib/format";
import type { Dashboard } from "@/lib/stats";
import { AssetButton } from "./asset-sheet";
import { ValueChart } from "./value-chart";

const panel = "rounded-2xl border border-white/5 bg-surface p-5";
const heading = "font-label text-label-eyebrow uppercase text-ink";

export function RawHistory({ d, m }: { d: Dashboard; m: Money }) {
  return (
    <section className={panel}>
      <h3 className={`${heading} mb-4`}>Raw card value over time</h3>
      <ValueChart data={d.history} m={m} />
    </section>
  );
}

export function RawMovers({ d, m }: { d: Dashboard; m: Money }) {
  const movers = [...d.gainers, ...d.losers];
  return (
    <section className={panel}>
      <h3 className={`${heading} mb-4`}>Top movers</h3>
      {movers.length === 0 ? (
        <p className="text-sm text-slate-2">Needs at least two daily snapshots.</p>
      ) : (
        <ul className="space-y-3">
          {movers.map((h) => (
            <li key={h.id} {...cardPreview(h)}>
              <AssetButton asset={rawAsset(h, d.combined.value)} m={m} className="flex items-center gap-3 rounded-lg">
                {h.image && <Image src={h.image} alt="" width={36} height={50} className="rounded-md" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{h.name}</div>
                  <div className="truncate text-xs text-slate-2">
                    {h.setName} · #{h.number} · {h.variant} · {h.condition}
                    {h.quantity > 1 && ` · ×${h.quantity}`}
                  </div>
                </div>
                <div className="text-right text-sm tabular-nums">
                  <div>{money(h.value, m)}</div>
                  <div className={`text-xs ${tone(h.change)}`}>
                    {signedMoney(h.change, m)} ({pct(h.changePct)})
                  </div>
                </div>
              </AssetButton>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
