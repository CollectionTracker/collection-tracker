"use client";

import { SuggestionThumb, suggestionSubtitle, variantLabel } from "@/components/add-autocomplete";
import { CONDITIONS, type Condition, type DraftRow, SEALED_TYPES, SEALED_TYPE_LABELS, type Suggestion } from "@/lib/add-types";
import type { SealedProductType } from "@/db/schema";
import { money } from "@/lib/format";

type Props = {
  rows: DraftRow[];
  onChange: (uid: string, patch: Partial<DraftRow>) => void;
  onRemove: (uid: string) => void;
};

const label = "grid gap-1 font-label text-label-sm text-slate-2";
const control = "field rounded-md px-2 py-1.5 text-sm text-ink";

const candidateText = (s: Suggestion) => [s.name, suggestionSubtitle(s)].filter(Boolean).join(" — ");

export function AddReview({ rows, onChange, onRemove }: Props) {
  return (
    <ul className="space-y-2" aria-label="Items to add">
      {rows.map((r) => {
        const item = r.item;
        const unmatched = !item || (item.kind === "sealed" && item.productId == null && r.candidates.length > 0);
        return (
          <li key={r.uid} className={`rounded-xl border p-3 ${item ? "border-white/5 bg-surface" : "border-amber/50 bg-amber/5"}`}>
            <div className="flex items-start gap-3">
              {item ? <SuggestionThumb item={item} size={44} /> : <span className="grid size-11 shrink-0 place-items-center rounded-md bg-white/[0.06] text-amber">!</span>}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{item ? item.name : `“${r.query}”`}</div>
                <div className="truncate text-xs text-slate-2">
                  {item ? suggestionSubtitle(item) : "Needs a match"}
                  {item?.kind === "sealed" && item.productId == null && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-label-sm">Custom</span>}
                </div>
                {r.note && <div className="mt-0.5 text-xs text-amber">{r.note}</div>}
              </div>
              <div className="shrink-0 text-right text-xs">
                {item?.price != null ? (
                  <>
                    <div className="font-label text-sm font-bold text-mint">{money(item.price)}</div>
                    <div className="text-slate-2">each</div>
                  </>
                ) : (
                  item && <div className="text-slate-2">no price yet</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(r.uid)}
                aria-label={`Remove ${item?.name ?? r.query}`}
                className="-mr-1 shrink-0 rounded-md p-1.5 text-slate-2 hover:bg-surface-2 hover:text-ink"
              >
                <svg aria-hidden className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeWidth={2} />
                </svg>
              </button>
            </div>

            {unmatched && (
              <label className={`${label} mt-3`}>
                <span>{item ? "Or pick a catalog product" : "Pick the match"}</span>
                <select
                  className={control}
                  value=""
                  onChange={(e) => {
                    const pick = r.candidates[Number(e.target.value)];
                    if (pick) onChange(r.uid, { item: pick, note: undefined, candidates: [] });
                  }}
                >
                  <option value="" disabled>
                    {r.candidates.length ? `${r.candidates.length} possible matches…` : "No matches found"}
                  </option>
                  {r.candidates.map((c, i) => (
                    <option key={i} value={i}>
                      {candidateText(c)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {item && (
              <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-3">
                <div className={label}>
                  <span id={`q-${r.uid}`}>Qty</span>
                  <div className="flex items-center" role="group" aria-labelledby={`q-${r.uid}`}>
                    <button type="button" aria-label="One fewer" disabled={r.quantity <= 1} onClick={() => onChange(r.uid, { quantity: r.quantity - 1 })} className="rounded-l-md border border-white/10 px-2.5 py-1.5 text-sm text-ink hover:bg-surface-2 disabled:opacity-40">
                      −
                    </button>
                    <input
                      inputMode="numeric"
                      aria-label="Quantity"
                      value={r.quantity}
                      onChange={(e) => {
                        const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                        if (n >= 1) onChange(r.uid, { quantity: Math.min(n, 100_000) });
                      }}
                      className="field w-14 border-x-0 py-1.5 text-center text-sm"
                    />
                    <button type="button" aria-label="One more" onClick={() => onChange(r.uid, { quantity: r.quantity + 1 })} className="rounded-r-md border border-white/10 px-2.5 py-1.5 text-sm text-ink hover:bg-surface-2">
                      +
                    </button>
                  </div>
                </div>

                {item.kind === "card" ? (
                  <>
                    <label className={label}>
                      <span>Condition</span>
                      <select className={control} value={r.condition} onChange={(e) => onChange(r.uid, { condition: e.target.value as Condition })}>
                        {CONDITIONS.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    {item.variants.length > 1 && (
                      <label className={label}>
                        <span>Printing</span>
                        <select className={control} value={r.variant ?? ""} onChange={(e) => onChange(r.uid, { variant: e.target.value || null })}>
                          <option value="">Usual</option>
                          {item.variants.map((v) => (
                            <option key={v} value={v}>
                              {variantLabel(v)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </>
                ) : (
                  <label className={label}>
                    <span>Type</span>
                    <select className={control} value={item.type} onChange={(e) => onChange(r.uid, { item: { ...item, type: e.target.value as SealedProductType } })}>
                      {SEALED_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {SEALED_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className={label}>
                  <span>Paid each (USD)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    placeholder="optional"
                    defaultValue={r.paid ?? ""}
                    onChange={(e) => onChange(r.uid, { paid: e.target.value !== "" && e.target.valueAsNumber >= 0 ? e.target.valueAsNumber : null })}
                    className={`${control} w-28`}
                  />
                </label>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
