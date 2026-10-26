"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { SealedThumb } from "@/components/sealed-thumb";
import { SEALED_TYPE_LABELS, type Suggestion, type SuggestionKind } from "@/lib/add-types";
import { money } from "@/lib/format";
import { recentAdds, suggest } from "@/lib/add-search";

const KINDS: { id: SuggestionKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "card", label: "Cards" },
  { id: "sealed", label: "Sealed" },
];

export const variantLabel = (v: string) => v.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).replace(/^1st/, "1st");

export function SuggestionThumb({ item, size = 44 }: { item: Suggestion; size?: number }) {
  if (item.kind === "sealed") return <SealedThumb image={item.image} productType={item.type} size={size} />;
  return item.image ? (
    <Image src={item.image} alt="" width={Math.round(size * 0.72)} height={size} className="shrink-0 rounded-[3px] bg-white/[0.04] object-cover" style={{ height: size, width: Math.round(size * 0.72) }} />
  ) : (
    <span className="shrink-0 rounded-[3px] bg-white/[0.06]" style={{ height: size, width: Math.round(size * 0.72) }} />
  );
}

export function suggestionSubtitle(s: Suggestion) {
  if (s.kind === "card") return [s.setName, s.number, s.rarity].filter(Boolean).join(" · ");
  return [s.group, SEALED_TYPE_LABELS[s.type]].filter(Boolean).join(" · ");
}

/** Bold the part of `name` that the typed words start. */
function Highlight({ name, q }: { name: string; q: string }) {
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return <>{name}</>;
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");
  return (
    <>
      {name.split(re).map((part, i) =>
        i % 2 ? (
          <mark key={i} className="bg-transparent font-extrabold text-mint">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

type Props = {
  onPick: (s: Suggestion) => void;
  /** Add a sealed product that is not in the catalog, from the typed text. */
  onCustom: (name: string) => void;
  /** Hide the "recently added" list while the review list has lines, so the list stays in view. */
  compact?: boolean;
};

/**
 * Type-ahead search over cards (TCGdex) and sealed products (TCGCSV). Suggestions appear after two characters, grouped,
 * with art, set, number and price; arrow keys move, Enter adds, Escape clears. With nothing typed it lists what was added last.
 */
export function AddAutocomplete({ onPick, onCustom, compact = false }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const cache = useRef(new Map<string, { items: Suggestion[]; recent: boolean }>());
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<SuggestionKind>("all");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [recent, setRecent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [active, setActive] = useState(0);

  const term = q.trim();

  // The dialog opens (showModal) after this mounts, so focus has to wait a tick; autoFocus would land on the close button.
  useEffect(() => {
    const t = setTimeout(() => input.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    const key = `${kind}|${term.toLowerCase()}`;
    const timer = setTimeout(
      async () => {
        // Recents are never cached: they change every time something is added.
        const hit = term ? cache.current.get(key) : undefined;
        if (hit) {
          setItems(hit.items);
          setRecent(hit.recent);
          setActive(0);
          return setStatus("idle");
        }
        if (term.length === 1) {
          setItems([]);
          return setStatus("idle");
        }
        setStatus("loading");
        try {
          const json = { suggestions: term ? await suggest(term.slice(0, 100), kind) : await recentAdds(), recent: !term };
          if (ctrl.signal.aborted) return; // a newer term is already being looked up
          if (term) cache.current.set(key, { items: json.suggestions, recent: json.recent });
          setItems(json.suggestions);
          setRecent(json.recent);
          setActive(0);
          setStatus("idle");
        } catch (e) {
          if (!ctrl.signal.aborted) setStatus("error");
          void e;
        }
      },
      term ? 150 : 0,
    );
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [term, kind]);

  const pick = (s: Suggestion) => {
    onPick(s);
    setQ("");
    input.current?.focus();
  };

  const canCustom = term.length >= 2 && kind !== "card" && status !== "loading";

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" && items.length) {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp" && items.length) {
      e.preventDefault();
      setActive((a) => (a - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[active]) pick(items[active]);
    } else if (e.key === "Escape" && q) {
      // First Escape clears the box; the next one closes the dialog.
      e.preventDefault();
      setQ("");
    }
  };

  const groupOf = (s: Suggestion) => (recent ? "Recently added" : s.kind === "card" ? "Cards" : "Sealed");
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Search in">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            aria-pressed={kind === k.id}
            onClick={() => setKind(k.id)}
            className={`rounded-full border px-3 py-1 font-label text-label-sm font-bold ${
              kind === k.id ? "border-mint text-mint" : "border-white/10 text-slate-2 hover:text-ink"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <input
        ref={input}
        type="text"
        role="combobox"
        aria-expanded={items.length > 0}
        aria-controls={`${id}-list`}
        aria-activedescendant={items[active] ? `${id}-opt-${active}` : undefined}
        aria-autocomplete="list"
        aria-label="Search cards and sealed products"
        autoComplete="off"
        spellCheck={false}
        placeholder="Search a card or sealed product, e.g. “mega gengar 284” or “151 etb”"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKeyDown}
        className="field w-full rounded-xl px-4 py-3 text-sm"
      />
      <div role="status" aria-live="polite" className="sr-only">
        {status === "loading" ? "Searching" : `${items.length} suggestions`}
      </div>
      <ul id={`${id}-list`} role="listbox" aria-label="Suggestions" hidden={compact && !term} className="mt-2 space-y-0.5 rounded-xl border border-white/5 bg-surface p-1">
        {status === "error" && <li className="px-3 py-3 text-xs text-amber">Search is unavailable right now. Try again in a moment.</li>}
        {status === "loading" && !items.length && <li className="px-3 py-3 text-xs text-slate-2">Searching…</li>}
        {status === "idle" && !items.length && term.length >= 2 && (
          <li className="px-3 py-3 text-xs text-slate-2">No matches for “{term}”.</li>
        )}
        {status === "idle" && !items.length && !term && <li className="px-3 py-3 text-xs text-slate-2">Start typing to search. Items you add appear here next time.</li>}
        {items.map((s, i) => {
          const heading = i === 0 || groupOf(items[i - 1]) !== groupOf(s) ? groupOf(s) : null;
          return (
            <li key={`${s.kind}-${s.kind === "card" ? s.id : (s.productId ?? s.name)}-${i}`} role="presentation">
              {heading && <div className="px-3 pb-1 pt-2 font-label text-label-eyebrow uppercase text-slate-2">{heading}</div>}
              <div
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseMove={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ${i === active ? "bg-surface-2" : ""}`}
              >
                <SuggestionThumb item={s} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">
                    <Highlight name={s.name} q={recent ? "" : term} />
                    {s.owned > 0 && <span className="ml-2 rounded-full bg-mint/15 px-2 py-0.5 align-middle font-label text-label-sm text-mint">Owned ×{s.owned}</span>}
                  </div>
                  <div className="truncate text-xs text-slate-2">{suggestionSubtitle(s)}</div>
                </div>
                {s.price != null && <div className="shrink-0 font-label text-sm font-bold text-mint">{money(s.price)}</div>}
              </div>
            </li>
          );
        })}
        {canCustom && (
          <li role="presentation">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onCustom(term);
                setQ("");
                input.current?.focus();
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-2 hover:bg-surface-2 hover:text-ink"
            >
              Can’t find it? <span className="font-bold text-mint">Add “{term}” as a custom sealed product</span>
            </button>
          </li>
        )}
      </ul>
      <p className="mt-2 hidden text-label-sm text-slate-2 sm:block">
        ↑ ↓ to move · Enter adds to the list · Esc clears · prices are TCGplayer market
      </p>
    </div>
  );
}
