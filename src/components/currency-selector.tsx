"use client";

import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { useRefresh } from "@/components/data-provider";
import { setCurrency } from "@/lib/currency-pref";
import { CURRENCIES, CURRENCY_INFO, type Currency, type FxRates, rateText, searchCurrencies } from "@/lib/currencies";

type Props = {
  currency: Currency;
  fx: FxRates;
  /** Which edge of the trigger the menu lines up with. */
  align?: "left" | "right";
};

/** Searchable currency menu: flag, code, symbol, name and rate per 1 USD. The choice is saved in this browser. */
export function CurrencySelector({ currency, fx, align = "right" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const refresh = useRefresh();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const selected = currency;
  const options = searchCurrencies(query);
  const info = CURRENCY_INFO[selected];

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const toggle = () => {
    if (open) return setOpen(false);
    setQuery("");
    setActive(CURRENCIES.indexOf(selected));
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const choose = (code: Currency) => {
    close();
    if (code === selected) return;
    setCurrency(code);
    refresh();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!options.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + options.length) % options.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (options[active]) choose(options[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const listId = `${id}-list`;
  const optionId = (code: Currency) => `${id}-${code}`;
  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Display currency: ${info.name}. Change currency`}
        title="Change display currency"
        onClick={toggle}
        className="group flex items-center gap-2 rounded-lg border border-white/10 bg-surface px-3 py-1.5 text-xs text-slate-2 transition-colors hover:border-mint/60 hover:text-ink"
      >
        <span className="inline-flex items-center gap-1 rounded border border-mint/20 bg-mint/10 px-1.5 py-0.5 font-semibold text-mint group-hover:border-mint/40">
          <span aria-hidden>{info.flag}</span>
          <span>{selected}</span>
          <span className="font-label text-label-sm">({info.symbol})</span>
        </span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div
          className={`absolute top-full z-50 mt-2 w-72 rounded-xl border border-white/10 bg-inset p-3 shadow-2xl sm:w-80 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="mb-2 flex items-center justify-between border-b border-white/5 pb-2">
            <span className="font-label text-label-eyebrow uppercase text-ink">Select currency</span>
            <span className="font-label text-label-sm text-slate-2">{CURRENCIES.length} currencies</span>
          </div>
          <div className="relative mb-2">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="absolute left-2 top-2 size-3.5 text-slate-2"
            >
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input
              autoFocus
              type="text"
              role="combobox"
              aria-label="Search currency or country"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={options[active] ? optionId(options[active]) : undefined}
              placeholder="Search currency or country…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              className="field w-full rounded-lg py-1.5 pl-7 pr-3 text-xs"
            />
          </div>
          <ul id={listId} role="listbox" aria-label="Currencies" className="max-h-60 space-y-1 overflow-y-auto pr-0.5">
            {options.map((code, i) => {
              const c = CURRENCY_INFO[code];
              const isSelected = code === selected;
              return (
                <li
                  key={code}
                  id={optionId(code)}
                  role="option"
                  aria-selected={isSelected}
                  onPointerMove={() => setActive(i)}
                  onClick={() => choose(code)}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-2 ${
                    isSelected ? "border-mint/40 bg-mint/15" : "border-transparent"
                  } ${i === active && !isSelected ? "bg-surface-2" : ""}`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span aria-hidden className="shrink-0 text-base">
                      {c.flag}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${isSelected ? "text-mint" : "text-ink"}`}>{code}</span>
                        <span className="font-label text-label-sm text-slate-2">({c.symbol})</span>
                      </span>
                      <span className="block truncate text-body-sm text-slate-2">{c.name}</span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-label text-label-sm text-slate-2 tabular-nums">{rateText(code, fx.rates[code])}</span>
                    <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className={`size-4 text-mint ${isSelected ? "" : "invisible"}`}>
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      />
                    </svg>
                  </span>
                </li>
              );
            })}
            {!options.length && (
              <li className="p-3 text-center text-xs text-slate-2">No currencies match &ldquo;{query}&rdquo;</li>
            )}
          </ul>
          <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2 text-body-sm text-slate-2">
            <span>{fx.day ? `ECB reference rate · ${fx.day}` : "Built-in reference rates"}</span>
            <span className="text-mint">per 1 USD</span>
          </div>
        </div>
      )}
    </div>
  );
}
