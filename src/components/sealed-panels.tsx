import { sealedAsset } from "@/lib/asset-detail";
import { sealedPreview } from "@/lib/card-preview";
import { type Money, money, pct, signedMoney, tone } from "@/lib/format";
import { byType, bySetGroup, priceCoverage, returnsByType, sealedMovers, sealedTypeLabel, STALE_PRICE_DAYS } from "@/lib/sealed-breakdown";
import type { SealedHolding } from "@/lib/sealed-stats";
import type { Dashboard } from "@/lib/stats";
import { AssetButton } from "./asset-sheet";
import { BarPanel } from "./raw-breakdown";
import { SealedThumb } from "./sealed-thumb";
import { StatusChip } from "./status-chip";
import { ValueChart } from "./value-chart";

const panel = "card p-5";
const heading = "font-label text-label-eyebrow uppercase text-ink";
const TOP = 8;

const latestDay = (holdings: SealedHolding[]) =>
  holdings.reduce<string | null>((a, h) => (h.priceDay && (!a || h.priceDay > a) ? h.priceDay : a), null);

export function SealedIntelHeader({ d, m }: { d: Dashboard; m: Money }) {
  const { holdings } = d.sealed;
  const day = latestDay(holdings);
  const types = new Set(holdings.map((h) => h.productType)).size;
  const groups = new Set(holdings.map((h) => h.setGroup ?? "")).size;
  const auto = holdings.filter((h) => h.priceSource === "tcgcsv").length;
  return (
    <section className="flex flex-col justify-between gap-3 card p-5 sm:flex-row sm:items-center">
      <div>
        <div className="font-label text-label-eyebrow uppercase text-mint">Product-level analytics</div>
        <h2 className="mt-1 text-headline-md">Sealed portfolio intelligence</h2>
        <p className="mt-1 text-xs text-slate-2">
          {day ? `Prices as of ${day}` : "No prices yet"} · {d.sealed.units.toLocaleString()} units · values shown in{" "}
          <span className="font-semibold text-ink">{m.currency}</span>
        </p>
      </div>
      {holdings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <StatusChip>
            {types} product {types === 1 ? "type" : "types"}
          </StatusChip>
          <StatusChip tone="violet">
            {groups} set {groups === 1 ? "group" : "groups"}
          </StatusChip>
          <StatusChip tone={auto ? "mint" : "neutral"}>
            {auto}/{holdings.length} auto-priced
          </StatusChip>
        </div>
      )}
    </section>
  );
}

export function SealedBreakdown({ d, m }: { d: Dashboard; m: Money }) {
  const empty = "No priced sealed products yet.";
  return (
    <section className="grid gap-3 md:grid-cols-2 md:gap-5">
      <BarPanel title="Value by product type" rows={byType(d.sealed.holdings)} bar="bg-sky" text="text-sky" empty={empty} m={m} />
      <BarPanel title="Value by set group" rows={bySetGroup(d.sealed.holdings)} bar="bg-violet" text="text-violet-soft" empty={empty} m={m} />
    </section>
  );
}

function LeaderRow({ h, rank, m, total }: { h: SealedHolding; rank: number; m: Money; total: number }) {
  return (
    <li {...sealedPreview(h)}>
      <AssetButton
        asset={sealedAsset(h, total)}
        m={m}
        className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-2.5 transition-colors hover:border-sky/40"
      >
        <span className="w-6 shrink-0 font-bold tabular-nums text-sky">{String(rank).padStart(2, "0")}</span>
        {/* The leaderboard is the first product art on the view, so its thumbnails are often the LCP. */}
        <SealedThumb image={h.image} productType={h.productType} size={44} eager />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{h.name}</div>
          <div className="truncate text-xs text-slate-2">
            {sealedTypeLabel(h.productType)}
            {h.setGroup && ` · ${h.setGroup}`}
            {h.quantity > 1 && ` · ×${h.quantity}`}
          </div>
        </div>
        <span className="text-sm font-bold tabular-nums">{money(h.value, m)}</span>
      </AssetButton>
    </li>
  );
}

export function SealedLeaderboard({ d, m }: { d: Dashboard; m: Money }) {
  const top = d.sealed.holdings
    .filter((h) => h.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP);
  const half = Math.ceil(top.length / 2);
  return (
    <section className={panel}>
      <h3 className={`${heading} mb-4`}>Top {TOP} sealed holdings</h3>
      {top.length === 0 ? (
        <p className="text-sm text-slate-2">No priced sealed products yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 md:grid-cols-2">
          <ol className="min-w-0 space-y-2.5">
            {top.slice(0, half).map((h, i) => (
              <LeaderRow key={h.id} h={h} rank={i + 1} m={m} total={d.combined.value} />
            ))}
          </ol>
          <ol className="min-w-0 space-y-2.5">
            {top.slice(half).map((h, i) => (
              <LeaderRow key={h.id} h={h} rank={half + i + 1} m={m} total={d.combined.value} />
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

export function SealedStructure({ d, m, today }: { d: Dashboard; m: Money; today: string }) {
  const returns = returnsByType(d.sealed.holdings).filter((r) => r.cost != null);
  const best = Math.max(1, ...returns.map((r) => Math.abs(r.gainPct ?? 0)));
  const cov = priceCoverage(d.sealed.holdings, today);
  const total = d.sealed.holdings.length;
  const rows = [
    { label: "Daily TCGplayer price (TCGCSV)", n: cov.tcgcsv, bar: "bg-mint" },
    { label: "Entered by hand", n: cov.manual, bar: "bg-amber" },
    { label: "No price yet", n: cov.unpriced, bar: "bg-rose-400" },
  ];
  return (
    <section className="grid gap-3 md:grid-cols-2 md:gap-5">
      <div className={panel}>
        <h3 className={`${heading} mb-4`}>Return by product type</h3>
        {returns.length === 0 ? (
          <p className="text-sm text-slate-2">Add purchase prices to see returns.</p>
        ) : (
          <ul className="space-y-3">
            {returns.map((r) => (
              <li key={r.label}>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="truncate text-slate-2">
                    {r.label} <span className="text-xs">×{r.units}</span>
                  </span>
                  <span className={`font-bold tabular-nums ${tone(r.gain ?? 0)}`}>
                    {r.gainPct == null ? "—" : pct(r.gainPct)}{" "}
                    <span className="font-normal text-slate-2">· {signedMoney(r.gain ?? 0, m)}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 track">
                  <div
                    className={`h-full rounded-full ${(r.gain ?? 0) >= 0 ? "bg-mint" : "bg-rose-400"}`}
                    style={{ width: `${(Math.abs(r.gainPct ?? 0) / best) * 100}%` }}
                  />
                </div>
                <div className="mt-0.5 text-xs tabular-nums text-slate-2">
                  Cost {money(r.cost ?? 0, m)} → value {money(r.value, m)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={panel}>
        <h3 className={`${heading} mb-4`}>Price coverage</h3>
        {total === 0 ? (
          <p className="text-sm text-slate-2">No sealed products yet.</p>
        ) : (
          <>
            <ul className="space-y-3">
              {rows.map((r) => (
                <li key={r.label}>
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="text-slate-2">{r.label}</span>
                    <span className="font-bold tabular-nums">
                      {r.n} <span className="font-normal text-slate-2">of {total}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 track">
                    <div className={`h-full rounded-full ${r.bar}`} style={{ width: `${(r.n / total) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-2">
              {cov.linked} of {total} linked to a TCGplayer product.{" "}
              {cov.stale.length === 0
                ? `No price is older than ${STALE_PRICE_DAYS} days.`
                : `${cov.stale.length} ${cov.stale.length === 1 ? "price is" : "prices are"} older than ${STALE_PRICE_DAYS} days: ${cov.stale
                    .slice(0, 3)
                    .map((h) => `${h.name} (${h.priceDay})`)
                    .join(", ")}${cov.stale.length > 3 ? "…" : ""}`}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

export function SealedHistory({ history, m }: { history: { day: string; value: number }[]; m: Money }) {
  return (
    <section className={panel}>
      <h3 className={`${heading} mb-4`}>Sealed value over time</h3>
      <ValueChart data={history} m={m} />
    </section>
  );
}

export function SealedMovers({ d, m }: { d: Dashboard; m: Money }) {
  const movers = sealedMovers(d.sealed.holdings);
  return (
    <section className={panel}>
      <h3 className={`${heading} mb-4`}>Top movers</h3>
      {movers.length === 0 ? (
        <p className="text-sm text-slate-2">Needs at least two prices for a product.</p>
      ) : (
        <ul className="space-y-3">
          {movers.map((h) => (
            <li key={h.id} {...sealedPreview(h)}>
              <AssetButton asset={sealedAsset(h, d.combined.value)} m={m} className="flex items-center gap-3 rounded-lg">
                <SealedThumb image={h.image} productType={h.productType} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{h.name}</div>
                  <div className="truncate text-xs text-slate-2">
                    {sealedTypeLabel(h.productType)}
                    {h.setGroup && ` · ${h.setGroup}`}
                    {h.quantity > 1 && ` · ×${h.quantity}`}
                  </div>
                </div>
                <div className="text-right text-sm tabular-nums">
                  <div>{money(h.value, m)}</div>
                  <div className={`text-xs ${tone(h.change!)}`}>
                    {signedMoney(h.change!, m)}
                    {h.changePct != null && ` (${pct(h.changePct)})`}
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
