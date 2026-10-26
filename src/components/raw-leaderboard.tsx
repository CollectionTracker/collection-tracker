import Image from "next/image";
import { rawAsset } from "@/lib/asset-detail";
import { cardPreview } from "@/lib/card-preview";
import { type Money, money } from "@/lib/format";
import type { Dashboard, Holding } from "@/lib/stats";
import { AssetButton } from "./asset-sheet";

const TOP = 8;

function Row({ h, rank, m, total }: { h: Holding; rank: number; m: Money; total: number }) {
  return (
    <li {...cardPreview(h)}>
      <AssetButton
        asset={rawAsset(h, total)}
        m={m}
        className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-2.5 transition-colors hover:border-mint/40"
      >
        <span className="w-6 shrink-0 font-bold tabular-nums text-mint">{String(rank).padStart(2, "0")}</span>
        {h.image && <Image src={h.image} alt="" width={36} height={50} className="shrink-0 rounded-md" />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{h.name}</div>
          <div className="truncate text-xs text-slate-2">
            {h.setName} · {h.rarity} · {h.variant}
            {h.quantity > 1 && ` · ×${h.quantity}`}
          </div>
        </div>
        <span className="text-sm font-bold tabular-nums">{money(h.value, m)}</span>
      </AssetButton>
    </li>
  );
}

export function RawLeaderboard({ d, m }: { d: Dashboard; m: Money }) {
  const top = d.holdings
    .filter((h) => h.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP);
  const half = Math.ceil(top.length / 2);
  return (
    <section className="rounded-2xl border border-white/5 bg-surface p-5">
      <h3 className="mb-4 font-label text-xs font-bold uppercase tracking-[0.12em] text-ink">Top {TOP} raw card holdings</h3>
      {top.length === 0 ? (
        <p className="text-sm text-slate-2">No priced raw cards yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 md:grid-cols-2">
          <ol className="min-w-0 space-y-2.5">
            {top.slice(0, half).map((h, i) => (
              <Row key={h.id} h={h} rank={i + 1} m={m} total={d.combined.value} />
            ))}
          </ol>
          <ol className="min-w-0 space-y-2.5">
            {top.slice(half).map((h, i) => (
              <Row key={h.id} h={h} rank={half + i + 1} m={m} total={d.combined.value} />
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
