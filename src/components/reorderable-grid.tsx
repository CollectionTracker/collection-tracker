"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { isDefaultOrder, moveCard, parseOrder, resolveOrder, shiftCard } from "@/lib/card-order";
import { InspectDialog } from "./inspect-dialog";

export type GridCard = {
  id: string;
  /** Name used in the shift buttons' labels and announcements, e.g. "Total portfolio". */
  label: string;
  /** Grid span classes, e.g. "col-span-full lg:col-span-6". They travel with the card when it moves. */
  span: string;
  node: ReactNode;
  /** Key into the grid's `inspections`; cards with one get an inspect button. */
  inspect?: string;
};

export type Inspection = { subtitle: string; body: ReactNode };

// The order is saved per browser in localStorage (#44). The storage event only fires in other tabs, so writes here
// notify this tab's subscribers themselves.
const listeners = new Set<() => void>();

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string | null) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private mode, quota): the move cannot be kept, and the layout stays as it was.
  }
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

const EditingContext = createContext<{ editing: boolean; setEditing: (on: boolean) => void } | null>(null);

/** Shares the "reorder layout" mode between the header toggle and the grid. */
export function ReorderProvider({ children }: { children: ReactNode }) {
  const [editing, setEditing] = useState(false);
  const value = useMemo(() => ({ editing, setEditing }), [editing]);
  return <EditingContext value={value}>{children}</EditingContext>;
}

function useEditing() {
  const ctx = useContext(EditingContext);
  if (!ctx) throw new Error("Wrap reorderable cards in <ReorderProvider>");
  return ctx;
}

/** Header button that turns reorder mode on and off. */
export function ReorderToggle() {
  const { editing, setEditing } = useEditing();
  return (
    <button
      type="button"
      aria-pressed={editing}
      onClick={() => setEditing(!editing)}
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 font-label text-[13px] font-semibold tracking-wide transition-colors ${
        editing ? "border-mint bg-mint/10 text-mint" : "border-white/10 text-slate-2 hover:border-mint/50 hover:text-mint"
      }`}
    >
      <svg aria-hidden className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M4 6h16M4 12h16m-7 6h7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      </svg>
      {editing ? "Done reordering" : "Reorder layout"}
    </button>
  );
}

/**
 * Cards in one grid whose order the visitor can change while reorder mode is on: drag a card onto another to take its
 * place, or use the ◀ ▶ buttons (keyboard and touch). The order is saved in localStorage under `storageKey`.
 */
export function ReorderableGrid({
  cards,
  storageKey,
  inspections = {},
  inspectFooter,
}: {
  cards: GridCard[];
  storageKey: string;
  /** Detail views opened by a card's inspect button. Rendered by the server, so they follow the selected currency. */
  inspections?: Record<string, Inspection>;
  inspectFooter?: ReactNode;
}) {
  const { editing } = useEditing();
  const [inspecting, setInspecting] = useState<string | null>(null);
  // The server has no saved order, so the first render matches it and the saved order applies right after hydration.
  const raw = useSyncExternalStore(subscribe, () => readStored(storageKey), () => null);
  const defaults = useMemo(() => cards.map((c) => c.id), [cards]);
  const order = useMemo(() => resolveOrder(defaults, parseOrder(raw)), [defaults, raw]);
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const refocus = useRef<{ id: string; dir: -1 | 1 } | null>(null);
  const grid = useRef<HTMLDivElement>(null);

  const save = useCallback(
    (next: string[]) => writeStored(storageKey, isDefaultOrder(defaults, next) ? null : JSON.stringify(next)),
    [defaults, storageKey],
  );

  const announce = (id: string, next: string[]) =>
    setAnnouncement(`${byId.get(id)?.label} moved to position ${next.indexOf(id) + 1} of ${next.length}`);

  const shift = (id: string, dir: -1 | 1) => {
    const next = shiftCard(order, id, dir);
    refocus.current = { id, dir };
    save(next);
    announce(id, next);
  };

  // Moving a card moves its DOM node, which drops focus; put it back on the button that was pressed.
  useEffect(() => {
    const target = refocus.current;
    if (!target) return;
    refocus.current = null;
    const card = grid.current?.querySelector(`[data-card-id="${target.id}"]`);
    const button = card?.querySelector<HTMLButtonElement>(`button[data-shift="${target.dir}"]`);
    (button && !button.disabled ? button : card?.querySelector<HTMLButtonElement>("button[data-shift]:not(:disabled)"))?.focus();
  }, [order]);

  const drop = (targetId: string) => {
    if (dragging && dragging !== targetId) {
      const next = moveCard(order, dragging, order.indexOf(targetId));
      save(next);
      announce(dragging, next);
    }
    setDragging(null);
    setOver(null);
  };

  // Looked up on every render, so a currency or snapshot change refreshes an open inspection in place.
  const inspected = inspecting ? byId.get(inspecting) : undefined;
  const view = inspected?.inspect ? inspections[inspected.inspect] : undefined;
  const open = inspected && view ? { card: inspected, view } : null;

  const shiftBtn = "rounded px-1.5 py-0.5 text-slate-2 hover:bg-white/5 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div ref={grid} className="page-grid">
      {editing && (
        <div className="col-span-full flex flex-wrap items-center justify-between gap-2 rounded-xl border border-mint/40 bg-mint/10 px-4 py-2.5 text-xs text-mint">
          <span>
            <span className="font-bold">Reorder layout:</span> drag cards or use the ◀ ▶ buttons to arrange your view. The order is
            saved in this browser.
          </span>
          <button
            type="button"
            className="underline hover:text-ink"
            onClick={() => {
              save(defaults);
              setAnnouncement("Layout reset to the default order");
            }}
          >
            Reset to default order
          </button>
        </div>
      )}
      {order.map((id, i) => {
        const c = byId.get(id)!;
        return (
          <div
            key={id}
            data-card-id={id}
            className={`group relative ${c.span} ${editing ? "cursor-grab rounded-2xl outline-1 outline-dashed outline-mint/30" : ""} ${
              over === id && dragging !== id ? "outline-2 outline-mint" : ""
            } ${dragging === id ? "opacity-50" : ""}`}
            draggable={editing}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", id);
              setDragging(id);
            }}
            onDragOver={(e) => {
              if (!dragging) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setOver(id);
            }}
            onDragLeave={() => setOver((o) => (o === id ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              drop(id);
            }}
            onDragEnd={() => {
              setDragging(null);
              setOver(null);
            }}
          >
            {editing && (
              <div className="absolute right-3 top-3 z-20 flex items-center gap-0.5 rounded-md border border-white/10 bg-canvas/90 p-0.5 text-xs">
                <button
                  type="button"
                  data-shift={-1}
                  className={shiftBtn}
                  disabled={i === 0}
                  aria-label={`Move ${c.label} earlier`}
                  title="Move left / up"
                  onClick={() => shift(id, -1)}
                >
                  ◀
                </button>
                <span aria-hidden className="px-1 font-mono text-mint">
                  :::
                </span>
                <button
                  type="button"
                  data-shift={1}
                  className={shiftBtn}
                  disabled={i === order.length - 1}
                  aria-label={`Move ${c.label} later`}
                  title="Move right / down"
                  onClick={() => shift(id, 1)}
                >
                  ▶
                </button>
              </div>
            )}
            {!editing && c.inspect && inspections[c.inspect] && (
              <button
                type="button"
                aria-label={`Inspect ${c.label}`}
                title="Inspect details"
                onClick={() => setInspecting(id)}
                className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-slate-2 transition-opacity hover:bg-surface-2 hover:text-mint focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
              >
                <svg aria-hidden className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </button>
            )}
            {/* While reordering, the card's own controls are inert so a drag never edits or follows a link. */}
            <div className={`h-full [&>*]:h-full ${editing ? "pointer-events-none select-none" : ""}`} inert={editing}>
              {c.node}
            </div>
          </div>
        );
      })}
      <InspectDialog
        open={open != null}
        title={open?.card.label ?? ""}
        subtitle={open?.view.subtitle}
        footer={inspectFooter}
        onClose={() => setInspecting(null)}
      >
        {open?.view.body}
      </InspectDialog>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
