import { connection } from "next/server";
import { getDashboard } from "@/lib/stats";

const chip = "rounded-lg border border-white/5 bg-white/5 px-2.5 py-1 text-xs text-slate-2 tabular-nums";

export async function RawIntelHeader() {
  await connection();
  const d = await getDashboard();
  return (
    <section className="flex flex-col justify-between gap-3 rounded-2xl border border-white/5 bg-surface p-5 sm:flex-row sm:items-center">
      <div>
        <div className="font-label text-[11px] font-bold uppercase leading-[14px] tracking-[0.12em] text-mint">Card-level analytics</div>
        <h2 className="mt-1 text-xl font-bold tracking-[-0.01em]">Raw card portfolio intelligence</h2>
        <p className="mt-1 text-xs text-slate-2">
          {d.lastUpdated ? `Prices as of ${d.lastUpdated}` : "No prices yet"} · Ungraded / raw only · values shown in USD
        </p>
      </div>
      {d.holdings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className={chip}>Set diversity: {d.setCount} {d.setCount === 1 ? "set" : "sets"}</span>
          <span className={chip}>
            {d.byRarity.length} rarity {d.byRarity.length === 1 ? "category" : "categories"}
          </span>
        </div>
      )}
    </section>
  );
}
