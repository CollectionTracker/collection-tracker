import { Suspense } from "react";
import Image from "next/image";
import { connection } from "next/server";
import { Toolbar } from "@/components/toolbar";
import { SnapshotPicker, snapshotName } from "@/components/snapshot-picker";
import { SnapshotList } from "@/components/snapshot-list";
import { ValueChart } from "@/components/value-chart";
import { type Bucket, type Holding, getDashboard } from "@/lib/stats";
import { listSnapshots, pickSnapshot } from "@/lib/snapshots";
import { pct, signed, tone, usd } from "@/lib/format";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function Home({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <Eyebrow>Executive dashboard</Eyebrow>
          <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.03em] md:text-[40px] md:leading-[48px]">
            Collection, at a glance
          </h1>
          <Suspense fallback={null}>
            <SnapshotBar searchParams={searchParams} />
          </Suspense>
        </div>
        <Toolbar />
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

const card =
  "rounded-2xl border border-white/5 bg-surface p-5 transition-shadow hover:shadow-[0_8px_24px_-4px_rgba(45,212,191,0.08),0_2px_6px_rgba(0,0,0,0.4)]";
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
      <div className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-slate-2">{label}</div>
      <div className="mt-1 text-[28px] font-bold leading-[34px] tracking-[-0.02em] tabular-nums">{value}</div>
      {sub && <div className={`mt-1 text-xs tabular-nums ${subTone ?? "text-slate-2"}`}>{sub}</div>}
    </div>
  );
}

const donutColors = ["#2dd4bf", "#38bdf8", "#a855f7", "#f59e0b", "#475569"];

function Donut({ items, total }: { items: Bucket[]; total: number }) {
  const top = items.slice(0, 4);
  const rest = total - top.reduce((a, b) => a + b.value, 0);
  const slices = [...top.map((b) => ({ label: b.label, value: b.value })), ...(rest > 0.005 ? [{ label: "Other", value: rest }] : [])];
  let acc = 0;
  const stops = slices.map((s, i) => {
    const from = total ? (acc / total) * 100 : 0;
    acc += s.value;
    return `${donutColors[i]} ${from}% ${total ? (acc / total) * 100 : 0}%`;
  });
  const lead = slices[0];
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div
        className="grid size-40 shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(${stops.join(", ")})` }}
      >
        <div className="grid size-28 place-items-center rounded-full border border-white/5 bg-inset text-center">
          <div>
            <div className="text-xl font-bold tracking-[-0.015em]">{total ? ((lead.value / total) * 100).toFixed(1) : 0}%</div>
            <div className="max-w-20 truncate font-label text-[10px] uppercase tracking-wider text-slate-2">{lead.label}</div>
          </div>
        </div>
      </div>
      <ul className="min-w-48 flex-1 space-y-2">
        {slices.map((s, i) => (
          <li key={s.label} className="flex items-center gap-3 rounded-lg border border-white/5 bg-inset px-3 py-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: donutColors[i] }} />
            <span className="flex-1 truncate text-slate-2">{s.label}</span>
            <span className="font-bold tabular-nums">{usd(s.value)}</span>
          </li>
        ))}
      </ul>
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
  const d = await getDashboard(asOf);
  if (!d.holdings.length)
    return (
      <div className={`${card} py-16 text-center text-slate-2`}>
        Your collection is empty. Use <b>Import CSV</b> (columns like name, set, number, quantity, condition, variant,
        purchase price — or a Pokémon TCG <code>id</code> column) to get started.
      </div>
    );

  return (
    <>
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat accent="mint" label="Total value" value={usd(d.totalValue)} sub={d.lastUpdated ? `as of ${d.lastUpdated}` : undefined} />
        <Stat accent="sky" label="Since last update" value={signed(d.dayChange)} sub={pct(d.dayChangePct)} subTone={tone(d.dayChange)} />
        <Stat
          accent="amber"
          label="Gain / loss"
          value={d.gain == null ? "—" : signed(d.gain)}
          sub={d.gainPct == null ? "add purchase prices" : `${pct(d.gainPct)} on ${usd(d.costBasis!)} paid`}
          subTone={d.gain == null ? undefined : tone(d.gain)}
        />
        <Stat
          accent="violet"
          label="Cards"
          value={d.totalCopies.toLocaleString()}
          sub={`${d.uniqueCards} unique · ${d.setCount} sets`}
        />
      </section>

      <section className={card}>
        <h2 className={`${heading} mb-4`}>Value over time</h2>
        <ValueChart data={d.history} />
      </section>

      <section className="grid gap-5 lg:grid-cols-12">
        <div className={card + " lg:col-span-5"}>
          <h2 className={`${heading} mb-4`}>Value mix by rarity</h2>
          <Donut items={d.byRarity} total={d.totalValue} />
        </div>
        <div className={card + " lg:col-span-7"}>
          <h2 className={`${heading} mb-4`}>Most valuable</h2>
          <ul className="space-y-3">{d.topCards.map((h) => <CardRow key={h.id} h={h} />)}</ul>
        </div>
        <div className="space-y-5 lg:col-span-12">
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

      <section className="grid gap-5 lg:grid-cols-3">
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
