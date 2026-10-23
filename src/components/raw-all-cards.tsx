"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { signed, tone, usd } from "@/lib/format";
import type { Holding, SetProgress } from "@/lib/stats";

const panel = "rounded-2xl border border-white/5 bg-surface p-5";
const heading = "font-label text-xs font-bold uppercase tracking-[0.12em] text-ink";
const control = "rounded-lg border border-white/5 bg-inset text-sm outline-none focus:border-mint/60 focus:ring-2 focus:ring-mint/15";
const PAGE = 25;
const GRID_PAGE = 24;

type View = "table" | "grid" | "sets";
type SortKey = "name" | "setName" | "rarity" | "condition" | "quantity" | "unit" | "value" | "change" | "gain";
type Sort = { key: SortKey; dir: 1 | -1 };

const gain = (h: Holding) => (h.cost == null ? null : h.value - h.cost);
// Card numbers like "4", "GG69", "TG12": numeric part first, prefixed subsets after the main set.
const numberKey = (n: string) => (parseInt(n.replace(/\D/g, ""), 10) || 0) + (/^\d/.test(n) ? 0 : 10_000);
const condTone: Record<string, string> = { NM: "bg-mint/15 text-mint", LP: "bg-amber/15 text-amber", MP: "bg-rose-400/15 text-rose-400" };

function CondChip({ c }: { c: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 font-label text-[10px] font-bold tracking-wider ${condTone[c] ?? "bg-surface-2 text-slate-2"}`}>{c}</span>
  );
}

function Delta({ n }: { n: number | null }) {
  return <span className={n == null || n === 0 ? "text-muted" : tone(n)}>{n == null || n === 0 ? "—" : signed(n)}</span>;
}

const ICONS: Record<View, ReactNode> = {
  table: (
    <path d="M3 4.5h14M3 8.5h14M3 12.5h14M3 16.5h14" strokeWidth="1.8" strokeLinecap="round" />
  ),
  grid: (
    <>
      {[3, 8.5, 14].flatMap((x) => [3, 8.5, 14].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="3.5" height="3.5" rx="0.8" fill="currentColor" stroke="none" />))}
    </>
  ),
  sets: (
    <>
      {[4.5, 10, 15.5].map((y) => (
        <g key={y}>
          <rect x="2.5" y={y - 1.5} width="3" height="3" rx="0.8" fill="currentColor" stroke="none" />
          <path d={`M8 ${y}h9.5`} strokeWidth="1.8" strokeLinecap="round" />
        </g>
      ))}
    </>
  ),
};

const VIEWS: { id: View; label: string; hint: string }[] = [
  { id: "table", label: "Table", hint: "Every card in a sortable table with cost, gain and day change." },
  { id: "grid", label: "Grid", hint: "Card art tiles, like flipping through a binder." },
  { id: "sets", label: "By set", hint: "Cards grouped by set in card-number order, with set completion." },
];

function ViewSwitcher({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div role="radiogroup" aria-label="View" className="flex gap-1 rounded-xl border border-white/5 bg-inset p-1">
      {VIEWS.map((v) => (
        <div key={v.id} className="group relative">
          <button
            type="button"
            role="radio"
            aria-checked={view === v.id}
            aria-label={`${v.label} view`}
            aria-describedby={`view-hint-${v.id}`}
            onClick={() => onChange(v.id)}
            className={`grid size-8 place-items-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-mint ${
              view === v.id ? "bg-mint text-[#053a33]" : "text-slate-2 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <svg viewBox="0 0 20 20" className="size-[18px]" fill="none" stroke="currentColor" aria-hidden>
              {ICONS[v.id]}
            </svg>
          </button>
          <div
            id={`view-hint-${v.id}`}
            role="tooltip"
            className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-white/10 bg-surface-2 px-3 py-2 text-xs text-slate-2 opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-has-[:focus-visible]:opacity-100"
          >
            <span className="mb-0.5 block font-label text-[11px] font-bold uppercase tracking-[0.12em] text-ink">{v.label}</span>
            {v.hint}
          </div>
        </div>
      ))}
    </div>
  );
}

const COLUMNS: { key: SortKey; label: string; right?: boolean }[] = [
  { key: "name", label: "Card" },
  { key: "setName", label: "Set" },
  { key: "rarity", label: "Rarity" },
  { key: "condition", label: "Cond." },
  { key: "quantity", label: "Qty", right: true },
  { key: "unit", label: "Unit", right: true },
  { key: "value", label: "Value", right: true },
  { key: "change", label: "Day change", right: true },
  { key: "gain", label: "Gain", right: true },
];

function TableView({ rows, sort, onSort }: { rows: Holding[]; sort: Sort; onSort: (k: SortKey) => void }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages - 1);
  const shown = rows.slice(current * PAGE, (current + 1) * PAGE);
  const sum = (f: (h: Holding) => number) => rows.reduce((a, h) => a + f(h), 0);
  const costed = rows.filter((h) => h.cost != null);
  const th = "whitespace-nowrap px-2.5 pb-2.5 font-label text-[10px] font-bold uppercase tracking-[0.12em]";
  const td = "whitespace-nowrap border-b border-white/5 px-2.5 py-2";
  return (
    <>
      <div className="-mx-5 overflow-x-auto px-5">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/5">
              {COLUMNS.map((c) => (
                <th key={c.key} className={`${th} ${c.right ? "text-right" : "text-left"}`} aria-sort={sort.key === c.key ? (sort.dir < 0 ? "descending" : "ascending") : undefined}>
                  <button type="button" onClick={() => onSort(c.key)} className={sort.key === c.key ? "text-mint" : "text-slate-2 hover:text-ink"}>
                    {c.label}
                    {sort.key === c.key && (sort.dir < 0 ? " ↓" : " ↑")}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {shown.map((h) => (
              <tr key={h.id} className="hover:bg-white/[0.02]">
                <td className={td}>
                  <div className="flex items-center gap-2.5">
                    {h.image ? <Image src={h.image} alt="" width={28} height={39} className="shrink-0 rounded" /> : <span className="h-[39px] w-7 shrink-0 rounded bg-surface-2" />}
                    <div>
                      <div className="font-semibold">{h.name}</div>
                      <div className="text-xs text-slate-2">
                        #{h.number} · {h.variant}
                      </div>
                    </div>
                  </div>
                </td>
                <td className={td}>{h.setName}</td>
                <td className={`${td} text-xs text-slate-2`}>{h.rarity}</td>
                <td className={td}>
                  <CondChip c={h.condition} />
                </td>
                <td className={`${td} text-right`}>{h.quantity}</td>
                <td className={`${td} text-right`}>{usd(h.unit)}</td>
                <td className={`${td} text-right font-bold`}>{usd(h.value)}</td>
                <td className={`${td} text-right`}>
                  <Delta n={h.change} />
                </td>
                <td className={`${td} text-right`}>
                  <Delta n={gain(h)} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="tabular-nums">
            <tr className="font-bold">
              <td colSpan={4} className="px-2.5 pt-3 text-xs font-normal text-slate-2">
                Totals for {rows.length} {rows.length === 1 ? "entry" : "entries"}
              </td>
              <td className="px-2.5 pt-3 text-right">{sum((h) => h.quantity)}</td>
              <td />
              <td className="px-2.5 pt-3 text-right">{usd(sum((h) => h.value))}</td>
              <td className="px-2.5 pt-3 text-right">
                <Delta n={sum((h) => h.change)} />
              </td>
              <td className="px-2.5 pt-3 text-right">
                <Delta n={costed.length ? costed.reduce((a, h) => a + gain(h)!, 0) : null} />
              </td>
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
  );
}

function GridView({ rows }: { rows: Holding[] }) {
  const [limit, setLimit] = useState(GRID_PAGE);
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {rows.slice(0, limit).map((h) => (
          <li key={h.id} className="grid gap-2 rounded-xl border border-white/5 bg-inset p-2 transition-colors hover:border-mint/40">
            <div className="relative aspect-[63/88] overflow-hidden rounded-md bg-surface-2">
              {h.image && <Image src={h.image} alt={h.name} fill sizes="(min-width: 1024px) 180px, 45vw" className="object-cover" />}
              <span className="absolute left-1.5 top-1.5">
                <CondChip c={h.condition} />
              </span>
              {h.quantity > 1 && (
                <span className="absolute right-1.5 top-1.5 rounded-full bg-canvas/85 px-2 py-0.5 font-label text-[10px] font-bold">×{h.quantity}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{h.name}</div>
              <div className="truncate text-xs text-slate-2">
                {h.setName} · #{h.number}
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1 tabular-nums">
              <span className="text-sm font-bold">{usd(h.value)}</span>
              <span className="text-[11px]">
                <Delta n={h.change} />
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4 text-xs text-slate-2">
        <span>
          Showing {Math.min(limit, rows.length)} of {rows.length}
        </span>
        {limit < rows.length && (
          <button type="button" onClick={() => setLimit(limit + GRID_PAGE)} className="rounded-md bg-inset px-3 py-1 font-label font-semibold text-ink">
            Show more
          </button>
        )}
      </div>
    </>
  );
}

function SetsView({ rows, sets, filtered }: { rows: Holding[]; sets: SetProgress[]; filtered: boolean }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(sets.slice(0, 1).map((s) => s.id)));
  const groups = sets
    .map((s) => ({ ...s, cards: rows.filter((h) => h.setId === s.id).sort((a, b) => numberKey(a.number) - numberKey(b.number)) }))
    .filter((g) => g.cards.length);
  const toggle = (id: string) =>
    setOpen((o) => {
      const next = new Set(o);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  return (
    <>
      <div className="mb-3 flex gap-2 font-label text-[11px] font-semibold uppercase tracking-[0.06em]">
        <button type="button" onClick={() => setOpen(new Set(groups.map((g) => g.id)))} className="rounded-md bg-inset px-2.5 py-1 text-slate-2 hover:text-ink">
          Expand all
        </button>
        <button type="button" onClick={() => setOpen(new Set())} className="rounded-md bg-inset px-2.5 py-1 text-slate-2 hover:text-ink">
          Collapse all
        </button>
      </div>
      <ul className="space-y-2.5">
        {groups.map((g) => {
          // A search or filter opens every matching set so results are never hidden.
          const isOpen = filtered || open.has(g.id);
          const done = g.total ? Math.min(100, (g.owned / g.total) * 100) : 0;
          return (
            <li key={g.id} className="overflow-hidden rounded-xl border border-white/5 bg-inset">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggle(g.id)}
                className="grid w-full grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3 text-left md:grid-cols-[14px_minmax(0,1.4fr)_minmax(0,1fr)_auto] md:gap-4"
              >
                <svg viewBox="0 0 12 12" className={`size-3 text-slate-2 transition-transform ${isOpen ? "rotate-90" : ""}`} aria-hidden>
                  <path d="M4 2l4 4-4 4" stroke="currentColor" fill="none" strokeWidth="1.6" />
                </svg>
                <span className="min-w-0">
                  <span className="block truncate font-bold">{g.name}</span>
                  <span className="text-xs text-slate-2">
                    {g.cards.reduce((a, h) => a + h.quantity, 0)} copies
                  </span>
                </span>
                <span className="hidden md:block">
                  <span className="block h-1.5 rounded-full bg-track">
                    <span className="block h-full rounded-full bg-sky" style={{ width: `${done}%` }} />
                  </span>
                  <span className="mt-1 block text-xs tabular-nums text-slate-2">
                    {g.owned}/{g.total} cards ({done.toFixed(0)}%)
                  </span>
                </span>
                <span className="font-bold tabular-nums">{usd(g.value)}</span>
              </button>
              {isOpen && (
                <ul className="border-t border-white/5">
                  {g.cards.map((h) => (
                    <li
                      key={h.id}
                      className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/5 px-3.5 py-2 text-sm tabular-nums last:border-0 md:grid-cols-[52px_28px_minmax(0,1fr)_44px_40px_90px_90px]"
                    >
                      <span className="hidden font-label text-xs font-semibold text-slate-2 md:block">#{h.number}</span>
                      {h.image ? <Image src={h.image} alt="" width={28} height={39} className="rounded" /> : <span className="h-[39px] w-7 rounded bg-surface-2" />}
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{h.name}</span>
                        <span className="block truncate text-xs text-slate-2">
                          {h.rarity} · {h.variant}
                        </span>
                      </span>
                      <span className="hidden md:block">
                        <CondChip c={h.condition} />
                      </span>
                      <span className="hidden text-xs text-slate-2 md:block">×{h.quantity}</span>
                      <span className="hidden text-right text-xs md:block">
                        <Delta n={h.change} />
                      </span>
                      <span className="text-right font-bold">{usd(h.value)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: "value", label: "Value" },
  { key: "change", label: "Day change" },
  { key: "gain", label: "Gain" },
  { key: "name", label: "Name" },
  { key: "setName", label: "Set" },
];
const TEXT_KEYS: SortKey[] = ["name", "setName", "rarity", "condition"];

export function RawAllCards({ holdings, sets }: { holdings: Holding[]; sets: SetProgress[] }) {
  const params = useSearchParams();
  const [view, setView] = useState<View>(() => {
    const requested = params.get("view");
    return requested === "grid" || requested === "sets" ? requested : "table";
  });
  const [query, setQuery] = useState("");
  const [setId, setSetId] = useState("");
  const [rarity, setRarity] = useState("");
  const [condition, setCondition] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "value", dir: -1 });

  // Native history keeps the choice in the URL (shareable, survives reload) without re-rendering the server page.
  const changeView = (v: View) => {
    setView(v);
    const next = new URLSearchParams(params.toString());
    if (v === "table") next.delete("view");
    else next.set("view", v);
    const qs = next.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  };
  const changeSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: TEXT_KEYS.includes(key) ? 1 : -1 }));

  const rarities = [...new Set(holdings.map((h) => h.rarity))].sort();
  const conditions = [...new Set(holdings.map((h) => h.condition))].sort();
  const q = query.trim().toLowerCase();
  const rows = holdings
    .filter(
      (h) =>
        (!q || `${h.name} ${h.setName} ${h.number}`.toLowerCase().includes(q)) &&
        (!setId || h.setId === setId) &&
        (!rarity || h.rarity === rarity) &&
        (!condition || h.condition === condition),
    )
    .sort((a, b) => {
      const x = sort.key === "gain" ? gain(a) ?? -Infinity : a[sort.key];
      const y = sort.key === "gain" ? gain(b) ?? -Infinity : b[sort.key];
      return (typeof x === "string" ? x.localeCompare(y as string) : x - (y as number)) * sort.dir;
    });
  const filtered = Boolean(q || setId || rarity || condition);

  return (
    <section className={panel}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className={heading}>All raw cards</h3>
          <p className="mt-1 text-xs text-slate-2">
            {holdings.length} entries · {holdings.reduce((a, h) => a + h.quantity, 0)} copies
          </p>
        </div>
        <ViewSwitcher view={view} onChange={changeView} />
      </div>
      {holdings.length === 0 ? (
        <p className="text-sm text-slate-2">No raw cards yet. Import a CSV to see them here.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, set or number"
              aria-label="Search cards"
              className={`${control} min-w-0 flex-[1_1_220px] px-3 py-2 placeholder:text-muted`}
            />
            <select value={setId} onChange={(e) => setSetId(e.target.value)} aria-label="Filter by set" className={`${control} px-3 py-2`}>
              <option value="">All sets</option>
              {[...sets].sort((a, b) => a.name.localeCompare(b.name)).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select value={rarity} onChange={(e) => setRarity(e.target.value)} aria-label="Filter by rarity" className={`${control} px-3 py-2`}>
              <option value="">All rarities</option>
              {rarities.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <select value={condition} onChange={(e) => setCondition(e.target.value)} aria-label="Filter by condition" className={`${control} px-3 py-2`}>
              <option value="">All conditions</option>
              {conditions.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            {view === "grid" && (
              <select
                value={sort.key}
                onChange={(e) => setSort({ key: e.target.value as SortKey, dir: TEXT_KEYS.includes(e.target.value as SortKey) ? 1 : -1 })}
                aria-label="Sort cards"
                className={`${control} px-3 py-2`}
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    Sort: {s.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-2">No cards match these filters.</p>
          ) : view === "grid" ? (
            <GridView key={rows.length} rows={rows} />
          ) : view === "sets" ? (
            <SetsView rows={rows} sets={sets} filtered={filtered} />
          ) : (
            <TableView key={`${rows.length}-${sort.key}-${sort.dir}`} rows={rows} sort={sort} onSort={changeSort} />
          )}
        </>
      )}
    </section>
  );
}
