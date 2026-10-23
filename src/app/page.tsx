import { Suspense } from "react";
import Image from "next/image";
import { connection } from "next/server";
import { Toolbar } from "@/components/toolbar";
import { SnapshotPicker, snapshotName } from "@/components/snapshot-picker";
import { SnapshotList } from "@/components/snapshot-list";
import { ValueChart } from "@/components/value-chart";
import { ValueMixDonut } from "@/components/value-mix-donut";
import { type Bucket, type Dashboard, type Holding, getDashboard } from "@/lib/stats";
import { COMPARISON_DAYS, type Comparison, getComparisons } from "@/lib/comparison";
import { getSyncStatus } from "@/lib/sync-status";
import { listSnapshots, pickSnapshot } from "@/lib/snapshots";
import { CONCENTRATION_WARNING_PCT, largestHolding } from "@/lib/concentration";
import { ago, pct, signed, tone, usd } from "@/lib/format";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function Home({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-3 py-6 page-x md:space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <Eyebrow>Executive dashboard</Eyebrow>
          <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.03em] md:text-[40px] md:leading-[48px]">
            Collection, at a glance
          </h1>
          <Suspense fallback={null}>
            <SnapshotBar searchParams={searchParams} />
          </Suspense>
          <Suspense fallback={null}>
            <SyncChip />
          </Suspense>
        </div>
        <div className="hidden lg:block">
          <Toolbar />
        </div>
      </header>
      <Suspense fallback={<p className="text-slate-2">Loading collection…</p>}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SnapshotBar({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const snapshots = await listSnapshots();
  const selected = pickSnapshot((await searchParams).snapshot, snapshots);
  const current = snapshots.find((s) => s.day === selected) ?? null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <p className="text-sm text-slate-2">
        {current ? `As of snapshot ${snapshotName(current)}` : snapshots[0] ? `Current prices as of ${snapshots[0].day}` : "No snapshots yet"}
      </p>
      {snapshots.length > 0 && <SnapshotPicker snapshots={snapshots} selected={selected} />}
    </div>
  );
}

const chipStyles = {
  verified: ["bg-mint/10 text-mint", "bg-mint"],
  running: ["bg-sky/10 text-sky", "bg-sky animate-pulse"],
  stale: ["bg-amber/10 text-amber", "bg-amber"],
  failed: ["bg-rose-400/10 text-rose-400", "bg-rose-400"],
  never: ["bg-white/5 text-slate-2", "bg-slate-2"],
};
const chipLabels = { verified: "Synced", running: "Syncing", stale: "Stale", failed: "Sync failed", never: "Never synced" };

async function SyncChip() {
  await connection();
  const st = await getSyncStatus();
  const [tint, dot] = chipStyles[st.state];
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-2">
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-label text-[11px] font-bold uppercase tracking-wider ${tint}`}
      >
        <span className={`size-1.5 rounded-full ${dot}`} />
        {chipLabels[st.state]}
      </span>
      <span>
        {st.lastSuccess ? `Last verified sync ${st.lastSuccess.toISOString().slice(0, 16).replace("T", " ")} UTC · updated ${ago(st.lastSuccess)}` : "No verified sync yet"}
      </span>
      {st.lastError && <span className="text-rose-400">Latest attempt failed: {st.lastError}</span>}
    </div>
  );
}

const card =
  "rounded-2xl border border-white/5 bg-surface p-5 transition-shadow hover:shadow-[0_8px_24px_-4px_rgba(45,212,191,0.08),0_2px_6px_rgba(0,0,0,0.4)]";
const labelStyle = "font-label text-[11px] font-bold uppercase tracking-[0.12em] text-slate-2";
const heading = "font-label text-xs font-bold uppercase tracking-[0.12em] text-ink";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="font-label text-[11px] font-bold uppercase leading-[14px] tracking-[0.12em] text-mint">{children}</div>;
}

const accents = { mint: "bg-mint", sky: "bg-sky", violet: "bg-violet", amber: "bg-amber" };

function Stat({
  label,
  value,
  sub,
  subTone,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  subTone?: string;
  accent: keyof typeof accents;
}) {
  return (
    <div className={card}>
      <div className={`mb-3 h-1 w-8 rounded-full ${accents[accent]}`} />
      <div className={labelStyle}>{label}</div>
      <div className="mt-1 text-[28px] font-bold leading-[34px] tracking-[-0.02em] tabular-nums">{value}</div>
      {sub && <div className={`mt-1 text-xs tabular-nums ${subTone ?? "text-slate-2"}`}>{sub}</div>}
    </div>
  );
}

function SummaryCards({ d, ytd }: { d: Dashboard; ytd: Comparison | null }) {
  const total = d.combined.value;
  const rawShare = total ? (d.totalValue / total) * 100 : 0;
  const { low, high } = d.combined.valuation;
  return (
    <section className="page-grid [&>*]:col-span-4 lg:[&>*]:col-span-3">
      <div className={card}>
        <div className="mb-3 h-1 w-8 rounded-full bg-mint" />
        <div className={labelStyle}>Total portfolio</div>
        <div className="mt-1 text-[28px] font-bold leading-[34px] tracking-[-0.02em] tabular-nums">{usd(total)}</div>
        <div className={`mt-1 text-xs tabular-nums ${ytd ? tone(ytd.change) : "text-slate-2"}`}>
          {ytd ? `${ytd.changePct == null ? signed(ytd.change) : pct(ytd.changePct)} YTD` : "YTD needs more snapshots"}
        </div>
        <div
          className="mt-3 flex h-2 overflow-hidden rounded-full bg-track"
          role="img"
          aria-label={`${(100 - rawShare).toFixed(0)}% sealed, ${rawShare.toFixed(0)}% raw`}
        >
          <div className="bg-sky" style={{ width: `${total ? 100 - rawShare : 0}%` }} />
          <div className="bg-violet" style={{ width: `${rawShare}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-2">
          <span>Sealed {total ? (100 - rawShare).toFixed(0) : 0}%</span>
          <span>Raw {rawShare.toFixed(0)}%</span>
        </div>
      </div>
      <Stat
        accent="sky"
        label="Sealed inventory"
        value={usd(d.sealed.value)}
        sub={`${d.sealed.units.toLocaleString()} units${d.sealed.gain == null ? "" : ` · ${signed(d.sealed.gain)} gain / loss`}`}
        subTone={d.sealed.gain == null ? undefined : tone(d.sealed.gain)}
      />
      <Stat
        accent="violet"
        label="Raw cards"
        value={usd(d.totalValue)}
        sub={`${d.totalCopies.toLocaleString()} cards · ${d.uniqueCards} unique · ${d.setCount} sets${d.gain == null ? "" : ` · ${signed(d.gain)} gain / loss`}`}
        subTone={d.gain == null ? undefined : tone(d.gain)}
      />
      <Stat
        accent="amber"
        label="Valuation range"
        value={`${usd(low)} – ${usd(high)}`}
        sub={`Midpoint ${usd(d.combined.valuation.mid)}`}
      />
    </section>
  );
}

function ValuationPanel({ d }: { d: Dashboard }) {
  const { low, mid, high } = d.combined.valuation;
  const largest = largestHolding(d.holdings, d.sealed.holdings, d.combined.value);
  const midPos = high > low ? ((mid - low) / (high - low)) * 100 : 50;
  const risky = largest != null && largest.pct >= CONCENTRATION_WARNING_PCT;
  return (
    <div className={card + " col-span-full"}>
      <h2 className={`${heading} mb-4`}>Valuation &amp; concentration</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className={labelStyle}>Estimated range</div>
          <div className="relative mt-4 h-2 rounded-full bg-track" role="img" aria-label={`Low ${usd(low)}, midpoint ${usd(mid)}, high ${usd(high)}`}>
            <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-sky/40" />
            <div className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-mint" style={{ left: `${midPos}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-sm tabular-nums">
            <span className="text-slate-2">Low {usd(low)}</span>
            <span className="font-bold">Mid {usd(mid)}</span>
            <span className="text-slate-2">High {usd(high)}</span>
          </div>
        </div>
        <div>
          <div className={labelStyle}>Largest single holding</div>
          {largest ? (
            <>
              <div className="mt-1 truncate text-sm font-medium">{largest.name}</div>
              <div className="text-xs text-slate-2">
                {largest.kind} · {usd(largest.value)} · <span className="font-bold text-ink">{largest.pct.toFixed(1)}%</span> of portfolio
              </div>
              {risky && (
                <p className="mt-2 rounded-lg bg-amber/10 px-3 py-2 text-xs text-amber">
                  Concentration warning: one holding is {largest.pct.toFixed(0)}% of the portfolio (threshold {CONCENTRATION_WARNING_PCT}%).
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-2">No priced holdings yet.</p>
          )}
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-2">The range is an estimate, not guaranteed realized sale proceeds.</p>
    </div>
  );
}

function ComparisonCard({ title, c, empty }: { title: string; c: Comparison | null; empty: string }) {
  return (
    <div className={card}>
      <h2 className={`${heading} mb-3`}>{title}</h2>
      {c ? (
        <>
          <div className={`text-[28px] font-bold leading-[34px] tabular-nums ${tone(c.change)}`}>
            {c.changePct == null ? signed(c.change) : pct(c.changePct)}
          </div>
          <div className="mt-1 text-xs tabular-nums text-slate-2">
            {signed(c.change)} since {c.baselineDay} ({usd(c.baselineValue)}), raw and sealed combined
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-2">{empty}</p>
      )}
    </div>
  );
}

function Bars({ items, total }: { items: Bucket[]; total: number }) {
  return (
    <ul className="space-y-3">
      {items.slice(0, 8).map((b) => (
        <li key={b.label}>
          <div className="flex justify-between text-sm">
            <span className="text-slate-2">
              {b.label} <span className="text-slate-2">×{b.count}</span>
            </span>
            <span className="font-bold tabular-nums">{usd(b.value)}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-track">
            <div className="h-full rounded-full bg-mint" style={{ width: `${total ? (b.value / total) * 100 : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function CardRow({ h, showChange }: { h: Holding; showChange?: boolean }) {
  return (
    <li className="flex items-center gap-3">
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
        {showChange && (
          <div className={`text-xs ${tone(h.change)}`}>
            {signed(h.change)} ({pct(h.changePct)})
          </div>
        )}
      </div>
    </li>
  );
}

async function Dashboard({ searchParams }: { searchParams: SearchParams }) {
  await connection(); // always render per request, never at build time
  const snapshots = await listSnapshots();
  const asOf = pickSnapshot((await searchParams).snapshot, snapshots);
  const [d, cmp] = await Promise.all([getDashboard(asOf), getComparisons(asOf)]);
  if (!d.holdings.length)
    return (
      <div className={`${card} py-16 text-center text-slate-2`}>
        Your collection is empty. Use <b>Import CSV</b> (columns like name, set, number, quantity, condition, variant,
        purchase price — or a Pokémon TCG <code>id</code> column) to get started.
      </div>
    );

  return (
    <>
      <SummaryCards d={d} ytd={cmp.ytd} />

      <section className="page-grid [&>*]:col-span-4 lg:[&>*]:col-span-6">
        <ComparisonCard
          title="Year to date"
          c={cmp.ytd}
          empty="Needs at least two snapshots this year, or one from last year."
        />
        <ComparisonCard
          title={`${COMPARISON_DAYS}-day comparison`}
          c={cmp.thirtyDay}
          empty={`Needs a snapshot at least ${COMPARISON_DAYS} days older than the latest one.`}
        />
      </section>

      <section className={card}>
        <h2 className={`${heading} mb-4`}>Value over time</h2>
        <ValueChart data={d.history} />
      </section>

      <section className="page-grid">
        <div className={card + " col-span-full lg:col-span-5"}>
          <h2 className={`${heading} mb-4`}>Portfolio value mix</h2>
          {d.combined.value > 0 ? (
            <ValueMixDonut
              slices={[
                { label: "Sealed", value: d.sealed.value, color: "#38bdf8" },
                { label: "Raw cards", value: d.totalValue, color: "#a855f7" },
              ]}
            />
          ) : (
            <p className="text-sm text-slate-2">No priced holdings yet.</p>
          )}
        </div>
        <div className={card + " col-span-full lg:col-span-7"}>
          <h2 className={`${heading} mb-4`}>Most valuable</h2>
          <ul className="space-y-3">{d.topCards.map((h) => <CardRow key={h.id} h={h} />)}</ul>
        </div>
        <ValuationPanel d={d} />
        <div className="col-span-full space-y-5">
          <div className={card}>
            <h2 className={`${heading} mb-4`}>Top movers</h2>
            {d.gainers.length + d.losers.length === 0 ? (
              <p className="text-sm text-slate-2">Needs at least two daily snapshots.</p>
            ) : (
              <ul className="space-y-3">
                {[...d.gainers, ...d.losers].map((h) => <CardRow key={h.id} h={h} showChange />)}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="page-grid [&>*]:col-span-full md:[&>*]:col-span-4 lg:[&>*]:col-span-4 [&>*:last-child]:md:col-span-8 [&>*:last-child]:lg:col-span-4">
        <div className={card}>
          <h2 className={`${heading} mb-4`}>Value by set</h2>
          <ul className="space-y-3">
            {d.setProgress.slice(0, 8).map((s) => (
              <li key={s.id}>
                <div className="flex justify-between text-sm">
                  <span className="truncate pr-2 text-slate-2">{s.name}</span>
                  <span className="font-bold tabular-nums">{usd(s.value)}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-track">
                  <div
                    className="h-full rounded-full bg-sky"
                    style={{ width: `${s.total ? Math.min(100, (s.owned / s.total) * 100) : 0}%` }}
                  />
                </div>
                <div className="mt-0.5 text-xs text-slate-2">
                  {s.owned}/{s.total} cards ({s.total ? ((s.owned / s.total) * 100).toFixed(0) : 0}%)
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className={card}>
          <h2 className={`${heading} mb-4`}>By rarity</h2>
          <Bars items={d.byRarity} total={d.totalValue} />
        </div>
        <div className={card}>
          <h2 className={`${heading} mb-4`}>By condition</h2>
          <Bars items={d.byCondition} total={d.totalValue} />
        </div>
      </section>

      <section className={card}>
        <h2 className={`${heading} mb-4`}>Snapshots</h2>
        <SnapshotList snapshots={snapshots} />
      </section>
    </>
  );
}
