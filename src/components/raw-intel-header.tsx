import type { Money } from "@/lib/format";
import type { Dashboard } from "@/lib/stats";
import { StatusChip } from "@/components/status-chip";


export function RawIntelHeader({ d, m }: { d: Dashboard; m: Money }) {
  return (
    <section className="flex flex-col justify-between gap-3 rounded-2xl border border-white/5 bg-surface p-5 sm:flex-row sm:items-center">
      <div>
        <div className="font-label text-label-eyebrow uppercase text-mint">Card-level analytics</div>
        <h2 className="mt-1 text-headline-md">Raw card portfolio intelligence</h2>
        <p className="mt-1 text-xs text-slate-2">
          {d.lastUpdated ? `Prices as of ${d.lastUpdated}` : "No prices yet"} · Ungraded / raw only · values shown in{" "}
          <span className="font-semibold text-ink">{m.currency}</span>
        </p>
      </div>
      {d.holdings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <StatusChip>Set diversity: {d.setCount} {d.setCount === 1 ? "set" : "sets"}</StatusChip>
          <StatusChip tone="violet">
            {d.byRarity.length} rarity {d.byRarity.length === 1 ? "category" : "categories"}
          </StatusChip>
        </div>
      )}
    </section>
  );
}
