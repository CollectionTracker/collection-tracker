import { Suspense } from "react";
import Image from "next/image";
import { connection } from "next/server";
import { Toolbar } from "@/components/toolbar";
import { SnapshotPicker, snapshotName } from "@/components/snapshot-picker";
import { SnapshotList } from "@/components/snapshot-list";
import { ValueChart } from "@/components/value-chart";
import { ValueMixDonut } from "@/components/value-mix-donut";
import { type Dashboard, type Holding, getDashboard } from "@/lib/stats";
import { COMPARISON_DAYS, type Comparison, getComparisons } from "@/lib/comparison";
import { getSyncStatus } from "@/lib/sync-status";
import { listSnapshots, pickSnapshot } from "@/lib/snapshots";
import { CONCENTRATION_WARNING_PCT, largestHolding } from "@/lib/concentration";
import { ago, type Money, money, pct, signedMoney, tone } from "@/lib/format";
import { cardPreview } from "@/lib/card-preview";
import { getDisplayMoney } from "@/lib/currency-pref";

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

function SummaryCards({ d, ytd, m }: { d: Dashboard; ytd: Comparison | null; m: Money }) {
  const total = d.combined.value;
  const rawShare = total ? (d.totalValue / total) * 100 : 0;
  const { low, high } = d.combined.valuation;
  return (
    <section className="page-grid [&>*]:col-span-4 lg:[&>*]:col-span-3">
      <div className={card}>
        <div className="mb-3 h-1 w-8 rounded-full bg-mint" />
        <div className={labelStyle}>Total portfolio</div>
        <div className="mt-1 text-[28px] font-bold leading-[34px] tracking-[-0.02em] tabular-nums">{money(total, m)}</div>
        <div className={`mt-1 text-xs tabular-nums ${ytd ? tone(ytd.change) : "text-slate-2"}`}>
          {ytd ? `${ytd.changePct == null ? signedMoney(ytd.change, m) : pct(ytd.changePct)} YTD` : "YTD needs more snapshots"}
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
        value={money(d.sealed.value, m)}
        sub={`${d.sealed.units.toLocaleString()} units${d.sealed.gain == null ? "" : ` · ${signedMoney(d.sealed.gain, m)} gain / loss`}`}
        subTone={d.sealed.gain == null ? undefined : tone(d.sealed.gain)}
      />
      <Stat
        accent="violet"
        label="Raw cards"
        value={money(d.totalValue, m)}
        sub={`${d.totalCopies.toLocaleString()} cards · ${d.uniqueCards} unique · ${d.setCount} sets${d.gain == null ? "" : ` · ${signedMoney(d.gain, m)} gain / loss`}`}
        subTone={d.gain == null ? undefined : tone(d.gain)}
      />
      <Stat
        accent="amber"
        label="Valuation range"
        value={`${money(low, m)} – ${money(high, m)}`}
        sub={`Midpoint ${money(d.combined.valuation.mid, m)}`}
      />
    </section>
  );
}

function ValuationPanel({ d, m }: { d: Dashboard; m: Money }) {
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
          <div className="relative mt-4 h-2 rounded-full bg-track" role="img" aria-label={`Low ${money(low, m)}, midpoint ${money(mid, m)}, high ${money(high, m)}`}>
            <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-sky/40" />
            <div className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-mint" style={{ left: `${midPos}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-sm tabular-nums">
            <span className="text-slate-2">Low {money(low, m)}</span>
            <span className="font-bold">Mid {money(mid, m)}</span>
            <span className="text-slate-2">High {money(high, m)}</span>
          </div>
        </div>
        <div>
          <div className={labelStyle}>Largest single holding</div>
          {largest ? (
            <>
              <div className="mt-1 truncate text-sm font-medium">{largest.name}</div>
              <div className="text-xs text-slate-2">
                {largest.kind} · {money(largest.value, m)} · <span className="font-bold text-ink">{largest.pct.toFixed(1)}%</span> of portfolio
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

function TopSealedPanel({ d, m }: { d: Dashboard; m: Money }) {
  const ranked = d.sealed.holdings.filter((h) => h.value > 0).sort((a, b) => b.value - a.value);
  const top = ranked.slice(0, 5);
  const max = top[0]?.value ?? 0;
  return (
    <div className={card + " col-span-full lg:col-span-6"}>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className={heading}>Top sealed holdings</h2>
        <span className="text-xs text-slate-2">{d.sealed.holdings.length} SKUs</span>
      </div>
      {top.length === 0 ? (
        <p className="text-sm text-slate-2">No priced sealed products yet. Enter a price on the Sealed Inventory view.</p>
      ) : (
        <ol className="space-y-3">
          {top.map((h, i) => (
            <li key={h.id}>
              <div className="flex justify-between gap-3 text-sm">
                <span className={`truncate ${i === 0 ? "font-bold text-ink" : "text-slate-2"}`}>
                  {i + 1}. {h.name}
                  {h.quantity > 1 && <span className="text-slate-2"> ×{h.quantity}</span>}
                </span>
                <span className="font-bold tabular-nums">{money(h.value, m)}</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-track">
                <div className={`h-full rounded-full ${i === 0 ? "bg-mint" : "bg-sky"}`} style={{ width: `${(h.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function StructurePanel({ d, m }: { d: Dashboard; m: Money }) {
  const { holdings, value, valuation } = d.sealed;
  const groups = new Map<string, number>();
  for (const h of holdings) groups.set(h.productType, (groups.get(h.productType) ?? 0) + h.value);
  const weights = [...groups].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const largest = holdings.reduce<(typeof holdings)[number] | null>((a, h) => (!a || h.value > a.value ? h : a), null);
  return (
    <div className={card + " col-span-full lg:col-span-6"}>
      <h2 className={`${heading} mb-4`}>Collection structure</h2>
      {weights.length === 0 ? (
        <p className="text-sm text-slate-2">No priced sealed products yet. Enter a price on the Sealed Inventory view.</p>
      ) : (
        <>
          <ul className="space-y-3">
            {weights.map(([type, v]) => (
              <li key={type}>
                <div className="flex justify-between text-sm">
                  <span className="truncate text-slate-2">{type}</span>
                  <span className="font-bold tabular-nums">
                    {((v / value) * 100).toFixed(1)}% <span className="font-normal text-slate-2">· {money(v, m)}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-track">
                  <div className="h-full rounded-full bg-violet" style={{ width: `${(v / value) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <dl className="mt-5 grid gap-3 border-t border-white/5 pt-4 text-sm sm:grid-cols-2">
            <div>
              <dt className={labelStyle}>Sealed market range</dt>
              <dd className="mt-1 tabular-nums">
                {money(valuation.low, m)} – {money(valuation.high, m)}
              </dd>
            </div>
            <div>
              <dt className={labelStyle}>Largest holding</dt>
              <dd className="mt-1 truncate tabular-nums">
                {largest && value > 0 ? `${((largest.value / value) * 100).toFixed(1)}% of sealed · ${largest.name}` : "—"}
              </dd>
            </div>
          </dl>
        </>
      )}
    </div>
  );
}

function AssumptionsCard() {
  return (
    <div className={card + " col-span-full"}>
      <h2 className={`${heading} mb-3`}>Valuation context &amp; assumptions</h2>
      <ul className="list-disc space-y-1.5 pl-5 text-xs text-slate-2">
        <li>Values are estimates based on market prices and are not guaranteed realized sale proceeds.</li>
        <li>Selling fees, taxes and shipping are not deducted.</li>
        <li>Raw card prices assume the recorded condition; actual grading or condition can move the price.</li>
        <li>Thin markets and low liquidity mean a large holding may sell below the listed price, or slowly.</li>
        <li>Preorder and recently released sealed products carry extra price uncertainty.</li>
        <li>Low and high are an illustrative spread around the midpoint, not a forecast (see docs/valuation.md).</li>
      </ul>
    </div>
  );
}

function ComparisonCard({ title, c, empty, m }: { title: string; c: Comparison | null; empty: string; m: Money }) {
  return (
    <div className={card}>
      <h2 className={`${heading} mb-3`}>{title}</h2>
      {c ? (
        <>
          <div className={`text-[28px] font-bold leading-[34px] tabular-nums ${tone(c.change)}`}>
            {c.changePct == null ? signedMoney(c.change, m) : pct(c.changePct)}
          </div>
          <div className="mt-1 text-xs tabular-nums text-slate-2">
            {signedMoney(c.change, m)} since {c.baselineDay} ({money(c.baselineValue, m)}), raw and sealed combined
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-2">{empty}</p>
      )}
    </div>
  );
}

function CardRow({ h, m, showChange }: { h: Holding; m: Money; showChange?: boolean }) {
  return (
    <li className="flex items-center gap-3" {...cardPreview(h)}>
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
        {showChange && (
          <div className={`text-xs ${tone(h.change)}`}>
            {signedMoney(h.change, m)} ({pct(h.changePct)})
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
  const [d, cmp, m] = await Promise.all([getDashboard(asOf), getComparisons(asOf), getDisplayMoney(asOf ?? undefined)]);
  if (!d.holdings.length)
    return (
      <div className={`${card} py-16 text-center text-slate-2`}>
        Your collection is empty. Use <b>Import CSV</b> (columns like name, set, number, quantity, condition, variant,
        purchase price — or a Pokémon TCG <code>id</code> column) to get started.
      </div>
    );

  return (
    <>
      <SummaryCards d={d} ytd={cmp.ytd} m={m} />

      <section className="page-grid [&>*]:col-span-4 lg:[&>*]:col-span-6">
        <ComparisonCard
          title="Year to date"
          c={cmp.ytd}
          m={m}
          empty="Needs at least two snapshots this year, or one from last year."
        />
        <ComparisonCard
          title={`${COMPARISON_DAYS}-day comparison`}
          c={cmp.thirtyDay}
          m={m}
          empty={`Needs a snapshot at least ${COMPARISON_DAYS} days older than the latest one.`}
        />
      </section>

      <section className={card}>
        <h2 className={`${heading} mb-4`}>Value over time</h2>
        <ValueChart data={d.history} m={m} />
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
              m={m}
            />
          ) : (
            <p className="text-sm text-slate-2">No priced holdings yet.</p>
          )}
        </div>
        <div className={card + " col-span-full lg:col-span-7"}>
          <h2 className={`${heading} mb-4`}>Most valuable</h2>
          <ul className="space-y-3">{d.topCards.map((h) => <CardRow key={h.id} h={h} m={m} />)}</ul>
        </div>
        <ValuationPanel d={d} m={m} />
        <TopSealedPanel d={d} m={m} />
        <StructurePanel d={d} m={m} />
        <AssumptionsCard />
      </section>

      <section className={card}>
        <h2 className={`${heading} mb-4`}>Snapshots</h2>
        <SnapshotList snapshots={snapshots} />
      </section>
    </>
  );
}
