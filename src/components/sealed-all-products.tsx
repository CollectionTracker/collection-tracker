"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import { setSealedPriceAction } from "@/app/actions";
import { type Money, money, signedMoney, tone } from "@/lib/format";
import { sealedTypeLabel } from "@/lib/sealed-breakdown";
import type { SealedHolding } from "@/lib/sealed-stats";
import { SealedThumb } from "@/components/sealed-thumb";
import { StatusChip } from "@/components/status-chip";

const panel = "card p-5";
const heading = "font-label text-label-eyebrow uppercase text-ink";
const control = "field rounded-lg text-sm";
const PAGE = 25;

type SortKey = "name" | "productType" | "setGroup" | "quantity" | "unit" | "value" | "change" | "gain" | "priceDay";
type Sort = { key: SortKey; dir: 1 | -1 };
const TEXT_KEYS: SortKey[] = ["name", "productType", "setGroup", "priceDay"];

const COLUMNS: { key: SortKey; label: string; right?: boolean }[] = [
  { key: "name", label: "Product" },
  { key: "setGroup", label: "Set group" },
  { key: "quantity", label: "Qty", right: true },
  { key: "unit", label: "Unit", right: true },
  { key: "value", label: "Value", right: true },
  { key: "change", label: "Change", right: true },
  { key: "gain", label: "Gain", right: true },
  { key: "priceDay", label: "Price" },
];

const sortValue = (h: SealedHolding, k: SortKey): string | number =>
  k === "productType" ? sealedTypeLabel(h.productType) : k === "gain" || k === "change" ? (h[k] ?? -Infinity) : (h[k] ?? "");

function Delta({ n, m }: { n: number | null; m: Money }) {
  return <span className={n == null || n === 0 ? "text-slate-2" : tone(n)}>{n == null || n === 0 ? "—" : signedMoney(n, m)}</span>;
}

function SourceChip({ h }: { h: SealedHolding }) {
  if (!h.priceSource) return <StatusChip tone="rose" className="px-2">No price</StatusChip>;
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <StatusChip tone={h.priceSource === "tcgcsv" ? "mint" : "amber"} className="px-2">
        {h.priceSource === "tcgcsv" ? "TCGplayer" : "Manual"}
      </StatusChip>
      <span className="text-[11px] text-slate-2">{h.priceDay}</span>
    </span>
  );
}

/** Today's price for one product, in USD like every stored price; low and high are optional. */
function PriceForm({ h, onDone }: { h: SealedHolding; onDone: () => void }) {
  const router = useRouter();
  const [market, setMarket] = useState(h.unit ? String(h.unit) : "");
  const [low, setLow] = useState("");
  const [high, setHigh] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const num = (s: string) => (s.trim() === "" ? null : Number(s));

  const save = () =>
    start(async () => {
      const r = await setSealedPriceAction({ sealedProductId: h.id, market: Number(market), low: num(low), high: num(high) });
      if (!r.ok) return setErr(r.error);
      setErr(null);
      onDone();
      router.refresh();
    });

  const input = `${control} w-28 px-2.5 py-1.5 tabular-nums`;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="flex flex-wrap items-end gap-3"
    >
      {[
        { label: "Value (USD)", v: market, set: setMarket, required: true },
        { label: "Low (optional)", v: low, set: setLow },
        { label: "High (optional)", v: high, set: setHigh },
      ].map((f) => (
        <label key={f.label} className="grid gap-1 text-xs text-slate-2">
          {f.label}
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            required={f.required}
            value={f.v}
            disabled={pending}
            onChange={(e) => f.set(e.target.value)}
            className={input}
          />
        </label>
      ))}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-mint px-3 py-1.5 font-label text-label-md font-bold text-canvas hover:brightness-110 disabled:opacity-50"
      >
        Save today&apos;s price
      </button>
      <button type="button" onClick={onDone} className="rounded-md bg-inset px-3 py-1.5 font-label text-label-md text-slate-2 hover:text-ink">
        Cancel
      </button>
      <p className="w-full text-xs text-slate-2">
        {err ? (
          <span className="text-rose-400">{err}</span>
        ) : h.linked ? (
          "A price entered here replaces today's TCGplayer price; the daily sync never overwrites it."
        ) : (
          "Not matched to a TCGplayer product, so this product is priced by hand."
        )}
      </p>
    </form>
  );
}

export function SealedAllProducts({ holdings, m }: { holdings: SealedHolding[]; m: Money }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [group, setGroup] = useState("");
  const [source, setSource] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "value", dir: -1 });
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<number | null>(null);

  const changeSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: TEXT_KEYS.includes(key) ? 1 : -1 }));

  const types = [...new Set(holdings.map((h) => h.productType))].sort((a, b) => sealedTypeLabel(a).localeCompare(sealedTypeLabel(b)));
  const groups = [...new Set(holdings.map((h) => h.setGroup ?? ""))].sort();
  const q = query.trim().toLowerCase();
  const rows = holdings
    .filter(
      (h) =>
        (!q || `${h.name} ${h.setGroup ?? ""} ${h.sku ?? ""} ${sealedTypeLabel(h.productType)}`.toLowerCase().includes(q)) &&
        (!type || h.productType === type) &&
        (!group || (h.setGroup ?? "") === group) &&
        (!source || (h.priceSource ?? "none") === source),
    )
    .sort((a, b) => {
      const x = sortValue(a, sort.key);
      const y = sortValue(b, sort.key);
      return (typeof x === "string" ? x.localeCompare(String(y)) : x - (y as number)) * sort.dir;
    });

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages - 1);
  const shown = rows.slice(current * PAGE, (current + 1) * PAGE);
  const sum = (f: (h: SealedHolding) => number) => rows.reduce((a, h) => a + f(h), 0);
  const costed = rows.filter((h) => h.gain != null);
  const changed = rows.filter((h) => h.change != null);
  const th = "whitespace-nowrap px-2.5 pb-2.5 font-label text-label-eyebrow uppercase";
  const td = "whitespace-nowrap border-b border-white/5 px-2.5 py-2";
  const resetPage = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(0);
  };

  return (
    <section className={panel}>
      <div className="mb-4">
        <h3 className={heading}>All sealed products</h3>
        <p className="mt-1 text-xs text-slate-2">
          {holdings.length} products · {holdings.reduce((a, h) => a + h.quantity, 0)} units
        </p>
      </div>
      {holdings.length === 0 ? (
        <p className="text-sm text-slate-2">No sealed products yet. Import a sealed CSV to see them here.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => resetPage(setQuery)(e.target.value)}
              placeholder="Search name, set group or SKU"
              aria-label="Search sealed products"
              className={`${control} min-w-0 flex-[1_1_220px] px-3 py-2`}
            />
            <select value={type} onChange={(e) => resetPage(setType)(e.target.value)} aria-label="Filter by product type" className={`${control} px-3 py-2`}>
              <option value="">All types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {sealedTypeLabel(t)}
                </option>
              ))}
            </select>
            <select value={group} onChange={(e) => resetPage(setGroup)(e.target.value)} aria-label="Filter by set group" className={`${control} px-3 py-2`}>
              <option value="">All set groups</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g || "No set"}
                </option>
              ))}
            </select>
            <select value={source} onChange={(e) => resetPage(setSource)(e.target.value)} aria-label="Filter by price source" className={`${control} px-3 py-2`}>
              <option value="">All price sources</option>
              <option value="tcgcsv">TCGplayer (daily)</option>
              <option value="manual">Manual</option>
              <option value="none">No price</option>
            </select>
          </div>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-2">No products match these filters.</p>
          ) : (
            <>
              <div className="-mx-5 overflow-x-auto px-5">
                <table className="w-full min-w-[920px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      {COLUMNS.map((c) => (
                        <th
                          key={c.key}
                          className={`${th} ${c.right ? "text-right" : "text-left"}`}
                          aria-sort={sort.key === c.key ? (sort.dir < 0 ? "descending" : "ascending") : undefined}
                        >
                          <button type="button" onClick={() => changeSort(c.key)} className={sort.key === c.key ? "text-mint" : "text-slate-2 hover:text-ink"}>
                            {c.label}
                            {sort.key === c.key && (sort.dir < 0 ? " ↓" : " ↑")}
                          </button>
                        </th>
                      ))}
                      <th className={th}>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {shown.map((h) => (
                      <Fragment key={h.id}>
                        <tr className="hover:bg-white/[0.02]">
                          <td className={td}>
                            <div className="flex items-center gap-2.5">
                              <SealedThumb image={h.image} productType={h.productType} size={36} />
                              <div className="min-w-0">
                                <div className="max-w-[18rem] truncate font-semibold" title={h.name}>
                                  {h.name}
                                </div>
                                <div className="text-xs text-slate-2">
                                  {sealedTypeLabel(h.productType)}
                                  {h.sku && ` · SKU ${h.sku}`}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className={td}>{h.setGroup ?? <span className="text-slate-2">—</span>}</td>
                          <td className={`${td} text-right`}>{h.quantity}</td>
                          <td className={`${td} text-right`}>{h.priceSource ? money(h.unit, m) : <span className="text-slate-2">—</span>}</td>
                          <td className={`${td} text-right font-bold`}>{money(h.value, m)}</td>
                          <td className={`${td} text-right`}>
                            <Delta n={h.change} m={m} />
                          </td>
                          <td className={`${td} text-right`}>
                            <Delta n={h.gain} m={m} />
                          </td>
                          <td className={td}>
                            <SourceChip h={h} />
                          </td>
                          <td className={`${td} text-right`}>
                            <button
                              type="button"
                              aria-expanded={editing === h.id}
                              aria-label={`Edit price for ${h.name}`}
                              onClick={() => setEditing(editing === h.id ? null : h.id)}
                              className="rounded-md bg-inset px-2.5 py-1 font-label text-label-sm font-semibold uppercase text-slate-2 hover:text-ink"
                            >
                              Edit price
                            </button>
                          </td>
                        </tr>
                        {editing === h.id && (
                          <tr>
                            <td colSpan={COLUMNS.length + 1} className="border-b border-white/5 bg-inset/60 px-2.5 py-3">
                              <PriceForm h={h} onDone={() => setEditing(null)} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                  <tfoot className="tabular-nums">
                    <tr className="font-bold">
                      <td colSpan={2} className="px-2.5 pt-3 text-xs font-normal text-slate-2">
                        Totals for {rows.length} {rows.length === 1 ? "product" : "products"}
                      </td>
                      <td className="px-2.5 pt-3 text-right">{sum((h) => h.quantity)}</td>
                      <td />
                      <td className="px-2.5 pt-3 text-right">{money(sum((h) => h.value), m)}</td>
                      <td className="px-2.5 pt-3 text-right">
                        <Delta n={changed.length ? changed.reduce((a, h) => a + h.change!, 0) : null} m={m} />
                      </td>
                      <td className="px-2.5 pt-3 text-right">
                        <Delta n={costed.length ? costed.reduce((a, h) => a + h.gain!, 0) : null} m={m} />
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4 text-xs text-slate-2">
                <span>
                  Showing {current * PAGE + 1}–{current * PAGE + shown.length} of {rows.length}
                </span>
                {pages > 1 && (
                  <div className="flex items-center gap-1 font-label font-semibold">
                    <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="rounded-md bg-inset px-2.5 py-1 disabled:opacity-40">
                      Prev
                    </button>
                    <span className="px-2 tabular-nums">
                      {current + 1} / {pages}
                    </span>
                    <button type="button" disabled={current === pages - 1} onClick={() => setPage(current + 1)} className="rounded-md bg-inset px-2.5 py-1 disabled:opacity-40">
                      Next
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
