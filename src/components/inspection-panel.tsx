import { type Money, money, pct, signedMoney, tone } from "@/lib/format";
import { type Point, VOLATILITY_WINDOW_DAYS, liquidation, volatility } from "@/lib/inspection";
import type { Range } from "@/lib/valuation";
import { MetricTile as Tile } from "./metric-tile";

/** What a card's detail inspection covers: the whole portfolio, or the raw or sealed side of it. */
export type InspectScope = {
  range: Range;
  costBasis: number | null;
  gain: number | null;
  gainPct: number | null;
  /** Extra already-formatted metrics for this scope, e.g. units or set count. */
  facts: { label: string; value: string }[];
  largest: { name: string; value: number; pct: number } | null;
  series: Point[];
};

const heading = "font-label text-label-eyebrow uppercase text-ink";

/** Expanded metrics, volatility and a liquidation projection for one scope, in the display currency. */
export function InspectionPanel({ s, m }: { s: InspectScope; m: Money }) {
  const vol = volatility(s.series);
  const liq = liquidation(s.range, s.costBasis);
  return (
    <div className="space-y-6">
      <section>
        <h3 className={`${heading} mb-3`}>Expanded metrics</h3>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <Tile label="Midpoint value" value={money(s.range.mid, m)} sub={`Low ${money(s.range.low, m)} · high ${money(s.range.high, m)}`} />
          <Tile label="Cost basis" value={s.costBasis == null ? "—" : money(s.costBasis, m)} sub="Holdings with a known purchase price" />
          <Tile
            label="Gain / loss"
            value={s.gain == null ? "—" : signedMoney(s.gain, m)}
            valueTone={s.gain == null ? undefined : tone(s.gain)}
            sub={s.gainPct == null ? "Needs purchase prices" : `${pct(s.gainPct)} on cost`}
          />
          {s.facts.map((f) => (
            <Tile key={f.label} label={f.label} value={f.value} />
          ))}
          <Tile
            label="Largest holding"
            value={s.largest ? `${s.largest.pct.toFixed(1)}%` : "—"}
            sub={s.largest ? `${s.largest.name} · ${money(s.largest.value, m)}` : "No priced holdings yet"}
          />
        </div>
      </section>

      <section>
        <h3 className={`${heading} mb-3`}>Volatility · last {VOLATILITY_WINDOW_DAYS} days</h3>
        {vol ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Tile
              label="Change"
              value={vol.changePct == null ? signedMoney(vol.change, m) : pct(vol.changePct)}
              valueTone={tone(vol.change)}
              sub={`${signedMoney(vol.change, m)} since ${vol.from}`}
            />
            <Tile label="Typical move" value={`±${vol.stdDevPct.toFixed(1)}%`} sub={`Std dev between ${vol.snapshots} snapshots`} />
            <Tile
              label="Best / worst move"
              value={`${pct(vol.best.pct)} / ${pct(vol.worst.pct)}`}
              sub={`${vol.best.day} / ${vol.worst.day}`}
            />
            <Tile
              label="Max drawdown"
              value={vol.maxDrawdownPct === 0 ? "None" : pct(vol.maxDrawdownPct)}
              valueTone={vol.maxDrawdownPct < 0 ? "text-rose-400" : undefined}
              sub="Largest fall from a peak"
            />
          </div>
        ) : (
          <p className="text-sm text-slate-2">Needs at least three snapshots in the last {VOLATILITY_WINDOW_DAYS} days.</p>
        )}
      </section>

      <section>
        <h3 className={`${heading} mb-3`}>Liquidation projection</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Tile label="Quick sale" value={money(liq.quick, m)} sub="At the low estimate" />
          <Tile
            label="Fair sale"
            value={money(liq.fair, m)}
            sub={liq.fairVsCost == null ? "At the midpoint" : `At the midpoint · ${signedMoney(liq.fairVsCost, m)} vs cost`}
          />
          <Tile label="Patient sale" value={money(liq.patient, m)} sub="At the high estimate" />
        </div>
        <p className="mt-3 text-xs text-slate-2">
          Net of an illustrative {liq.feePct}% selling fee (marketplace and payment fees); shipping and taxes are not deducted. Estimates,
          not guaranteed sale proceeds: thin markets can sell below the low estimate, or slowly.
        </p>
      </section>
    </div>
  );
}
