import { Suspense } from "react";
import Image from "next/image";
import { connection } from "next/server";
import { Toolbar } from "@/components/toolbar";
import { ValueChart } from "@/components/value-chart";
import { type Bucket, type Holding, getDashboard } from "@/lib/stats";
import { pct, signed, tone, usd } from "@/lib/format";

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Collection</h1>
        <Toolbar />
      </header>
      <Suspense fallback={<p className="text-zinc-500">Loading collection…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

const card = "rounded-xl border border-white/10 bg-white/[.03] p-5";

function Stat({ label, value, sub, subTone }: { label: string; value: string; sub?: string; subTone?: string }) {
  return (
    <div className={card}>
      <div className="text-sm text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className={`mt-1 text-sm tabular-nums ${subTone ?? "text-zinc-500"}`}>{sub}</div>}
    </div>
  );
}

function Bars({ items, total }: { items: Bucket[]; total: number }) {
  return (
    <ul className="space-y-3">
      {items.slice(0, 8).map((b) => (
        <li key={b.label}>
          <div className="flex justify-between text-sm">
            <span>
              {b.label} <span className="text-zinc-500">×{b.count}</span>
            </span>
            <span className="tabular-nums text-zinc-300">{usd(b.value)}</span>
          </div>
          <div className="mt-1 h-1.5 rounded bg-white/10">
            <div className="h-full rounded bg-emerald-400" style={{ width: `${total ? (b.value / total) * 100 : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function CardRow({ h, showChange }: { h: Holding; showChange?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      {h.image && <Image src={h.image} alt="" width={36} height={50} className="rounded" />}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{h.name}</div>
        <div className="truncate text-xs text-zinc-500">
          {h.setName} · #{h.number} · {h.variant} · {h.condition}
          {h.quantity > 1 && ` · ×${h.quantity}`}
        </div>
      </div>
      <div className="text-right text-sm tabular-nums">
        <div>{usd(h.value)}</div>
        {showChange && (
          <div className={`text-xs ${tone(h.change)}`}>
            {signed(h.change)} ({pct(h.changePct)})
          </div>
        )}
      </div>
    </li>
  );
}

async function Dashboard() {
  await connection(); // always render per request, never at build time
  const d = await getDashboard();
  if (!d.holdings.length)
    return (
      <div className={`${card} py-16 text-center text-zinc-400`}>
        Your collection is empty. Use <b>Import CSV</b> (columns like name, set, number, quantity, condition, variant,
        purchase price — or a Pokémon TCG <code>id</code> column) to get started.
      </div>
    );

  return (
    <>
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total value" value={usd(d.totalValue)} sub={d.lastUpdated ? `as of ${d.lastUpdated}` : undefined} />
        <Stat label="Since last update" value={signed(d.dayChange)} sub={pct(d.dayChangePct)} subTone={tone(d.dayChange)} />
        <Stat
          label="Gain / loss"
          value={d.gain == null ? "—" : signed(d.gain)}
          sub={d.gainPct == null ? "add purchase prices" : `${pct(d.gainPct)} on ${usd(d.costBasis!)} paid`}
          subTone={d.gain == null ? undefined : tone(d.gain)}
        />
        <Stat
          label="Cards"
          value={d.totalCopies.toLocaleString()}
          sub={`${d.uniqueCards} unique · ${d.setCount} sets`}
        />
      </section>

      <section className={card}>
        <h2 className="mb-4 font-medium">Value over time</h2>
        <ValueChart data={d.history} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className={card}>
          <h2 className="mb-4 font-medium">Most valuable</h2>
          <ul className="space-y-3">{d.topCards.map((h) => <CardRow key={h.id} h={h} />)}</ul>
        </div>
        <div className="space-y-4">
          <div className={card}>
            <h2 className="mb-4 font-medium">Top movers</h2>
            {d.gainers.length + d.losers.length === 0 ? (
              <p className="text-sm text-zinc-500">Needs at least two daily snapshots.</p>
            ) : (
              <ul className="space-y-3">
                {[...d.gainers, ...d.losers].map((h) => <CardRow key={h.id} h={h} showChange />)}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className={card}>
          <h2 className="mb-4 font-medium">Value by set</h2>
          <ul className="space-y-3">
            {d.setProgress.slice(0, 8).map((s) => (
              <li key={s.id}>
                <div className="flex justify-between text-sm">
                  <span className="truncate pr-2">{s.name}</span>
                  <span className="tabular-nums text-zinc-300">{usd(s.value)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded bg-white/10">
                  <div
                    className="h-full rounded bg-sky-400"
                    style={{ width: `${s.total ? Math.min(100, (s.owned / s.total) * 100) : 0}%` }}
                  />
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  {s.owned}/{s.total} cards ({s.total ? ((s.owned / s.total) * 100).toFixed(0) : 0}%)
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className={card}>
          <h2 className="mb-4 font-medium">By rarity</h2>
          <Bars items={d.byRarity} total={d.totalValue} />
        </div>
        <div className={card}>
          <h2 className="mb-4 font-medium">By condition</h2>
          <Bars items={d.byCondition} total={d.totalValue} />
        </div>
      </section>
    </>
  );
}
